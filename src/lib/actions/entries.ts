'use server';

import { prisma } from '@/lib/prisma';
import type {
  EntryRecord,
  EntryValueRecord,
  EntryWithHabit,
  FieldValueInput,
  HabitRecord,
  InputFieldType,
  UpsertEntryInput,
} from '@/lib/types/schema';
import { getHabits } from './habits';
import { calculateStreak } from '@/lib/utils/progress';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { writeAuditLog } from './audit';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse "HH:MM" duration string → total minutes
function durationToMins(raw: string): number | null {
  const parts = (raw ?? '').trim().split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Parse "HH:MM" (24h from <input type="time">) → minutes since midnight
function timeToMins(raw: string): number | null {
  const parts = (raw ?? '').trim().split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Convert a raw form value to typed columns for EntryValue
function toTypedValue(fv: FieldValueInput): {
  text_value: string | null;
  int_value: number | null;
  duration_mins: number | null;
  time_mins: number | null;
  boolean_value: boolean | null;
} {
  const blank = { text_value: null, int_value: null, duration_mins: null, time_mins: null, boolean_value: null };

  if (fv.raw_value === null || fv.raw_value === '' || fv.raw_value === undefined) return blank;

  switch (fv.field_type) {
    case 'text':
      return { ...blank, text_value: String(fv.raw_value) };
    case 'int':
      return { ...blank, int_value: Number(fv.raw_value) };
    case 'duration':
      return { ...blank, duration_mins: durationToMins(String(fv.raw_value)) };
    case 'time':
      return { ...blank, time_mins: timeToMins(String(fv.raw_value)) };
    case 'yes_no':
      return { ...blank, boolean_value: fv.raw_value === true || fv.raw_value === 'true' };
    case 'multi_select':
      return { ...blank, text_value: typeof fv.raw_value === 'string' ? fv.raw_value : null };
    default:
      return blank;
  }
}

function toEntryValueRecord(raw: {
  field_id: number;
  text_value: string | null;
  int_value: number | null;
  duration_mins: number | null;
  time_mins: number | null;
  boolean_value: boolean | null;
}): EntryValueRecord {
  return {
    field_id: raw.field_id,
    text_value: raw.text_value,
    int_value: raw.int_value,
    duration_mins: raw.duration_mins,
    time_mins: raw.time_mins,
    boolean_value: raw.boolean_value,
  };
}

function toEntryRecord(raw: {
  id: string;
  habit_id: string;
  date: Date;
  values: Array<{
    field_id: number;
    text_value: string | null;
    int_value: number | null;
    duration_mins: number | null;
    time_mins: number | null;
    boolean_value: boolean | null;
  }>;
}): EntryRecord {
  return {
    id: raw.id,
    habit_id: raw.habit_id,
    date: toDateStr(raw.date),
    values: raw.values.map(toEntryValueRecord),
  };
}

// ── Server Actions ────────────────────────────────────────────────────────────

export async function upsertEntry(input: UpsertEntryInput): Promise<EntryRecord> {
  const user = await getCurrentUser();
  const date = parseDate(input.date);

  // Verify the habit belongs to the current user before writing
  const habit = await prisma.habit.findFirst({
    where: { id: input.habit_id, user_id: user.id },
    select: { id: true },
  });
  if (!habit) throw new Error('Habit not found');

  // Find or create the parent Entry row
  const entry = await prisma.entry.upsert({
    where: { habit_id_date: { habit_id: input.habit_id, date } },
    create: { habit_id: input.habit_id, date },
    update: {},
    include: { values: true },
  });

  // Upsert each field value into entry_values
  for (const fv of input.field_values) {
    if (fv.raw_value === undefined) continue; // field was never touched — leave DB as-is

    const typed = toTypedValue(fv);
    await prisma.entryValue.upsert({
      where: { entry_id_field_id: { entry_id: entry.id, field_id: fv.field_id } },
      create: { entry_id: entry.id, field_id: fv.field_id, ...typed },
      update: typed,
    });
  }

  // Re-fetch with updated values
  const fresh = await prisma.entry.findUniqueOrThrow({
    where: { id: entry.id },
    include: { values: true },
  });

  await writeAuditLog(user.id, 'entry_upserted', 'entries', entry.id, {
    habit_id: input.habit_id,
    date: input.date,
  });

  return toEntryRecord(fresh);
}

export async function getEntriesByDate(dateStr: string): Promise<EntryWithHabit[]> {
  const user = await getCurrentUser();
  const date = parseDate(dateStr);
  const entries = await prisma.entry.findMany({
    where: { date, habit: { user_id: user.id } },
    include: { habit: true, values: true },
  });

  return entries.map((e) => ({
    ...toEntryRecord(e),
    habit: {
      id: e.habit.id,
      name: e.habit.name,
      subtitle: e.habit.subtitle,
      is_active: e.habit.is_active,
      weekly_quota: e.habit.weekly_quota,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input_schema: Array.isArray(e.habit.input_schema) ? (e.habit.input_schema as any) : [],
      completion_field_id: e.habit.completion_field_id,
    } as HabitRecord,
  }));
}

export async function getHabitHistory(
  habitId: string,
  weeks: number
): Promise<EntryRecord[]> {
  const user = await getCurrentUser();
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);
  startDate.setUTCHours(0, 0, 0, 0);

  const entries = await prisma.entry.findMany({
    where: { habit_id: habitId, habit: { user_id: user.id }, date: { gte: startDate } },
    include: { values: true },
    orderBy: { date: 'asc' },
  });

  return entries.map(toEntryRecord);
}

// ── Week/Year helpers ─────────────────────────────────────────────────────────

function getWeekBounds(weekOffset: number): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday + weekOffset * 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export async function getWeeklyBreakdown(weekOffset: number): Promise<{
  weekStart: string;
  weekEnd: string;
  habits: HabitRecord[];
  entriesByHabitAndDate: Record<string, Record<string, EntryRecord>>;
}> {
  const { weekStart, weekEnd } = getWeekBounds(weekOffset);
  const habits = await getHabits();
  const activeHabits = habits.filter((h) => h.is_active);

  const entries = await prisma.entry.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      habit_id: { in: activeHabits.map((h) => h.id) },
    },
    include: { values: true },
  });

  const map: Record<string, Record<string, EntryRecord>> = {};
  for (const e of entries) {
    const dateStr = toDateStr(e.date);
    if (!map[e.habit_id]) map[e.habit_id] = {};
    map[e.habit_id][dateStr] = toEntryRecord(e);
  }

  return {
    weekStart: toDateStr(weekStart),
    weekEnd: toDateStr(weekEnd),
    habits: activeHabits,
    entriesByHabitAndDate: map,
  };
}

export async function getHabitStreaks(): Promise<
  { habitId: string; count: number; isDimmed: boolean }[]
> {
  const habits = await getHabits();
  const activeHabits = habits.filter((h) => h.is_active);

  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - 52 * 7);
  startDate.setUTCHours(0, 0, 0, 0);

  const entries = await prisma.entry.findMany({
    where: {
      habit_id: { in: activeHabits.map((h) => h.id) },
      date: { gte: startDate },
    },
    include: { values: true },
    orderBy: { date: 'asc' },
  });

  const entryRecords = entries.map(toEntryRecord);

  return activeHabits.map((habit) => {
    const habitEntries = entryRecords.filter((e) => e.habit_id === habit.id);
    const { count, isDimmed } = calculateStreak(habitEntries, habit, now);
    return { habitId: habit.id, count, isDimmed };
  });
}

export async function getYearlyData(year: number): Promise<{
  habits: HabitRecord[];
  entries: EntryRecord[];
}> {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);
  const habits = await getHabits();
  const activeHabits = habits.filter((h) => h.is_active);

  const entries = await prisma.entry.findMany({
    where: {
      date: { gte: start, lte: end },
      habit_id: { in: activeHabits.map((h) => h.id) },
    },
    include: { values: true },
    orderBy: { date: 'asc' },
  });

  return { habits: activeHabits, entries: entries.map(toEntryRecord) };
}
