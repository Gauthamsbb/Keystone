'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type {
  HabitRecord,
  HabitSectionRecord,
  HabitListItem,
  InputSchema,
  CompletionLimit,
  CreateHabitInput,
  UpdateHabitInput,
} from '@/lib/types/schema';
import { logHabitChange } from './changelog';

function toHabitRecord(raw: {
  id: string;
  name: string;
  subtitle: string | null;
  is_active: boolean;
  display_order: number;
  weekly_quota: number;
  input_schema: unknown;
  completion_field_id: number | null;
  completion_limit: unknown;
  timing_field_id: number | null;
}): HabitRecord {
  return {
    id: raw.id,
    name: raw.name,
    subtitle: raw.subtitle,
    is_active: raw.is_active,
    display_order: raw.display_order,
    weekly_quota: raw.weekly_quota,
    input_schema: Array.isArray(raw.input_schema) ? (raw.input_schema as InputSchema) : [],
    completion_field_id: raw.completion_field_id,
    completion_limit: raw.completion_limit != null ? (raw.completion_limit as CompletionLimit) : null,
    timing_field_id: raw.timing_field_id,
  };
}

export async function getHabits(): Promise<HabitRecord[]> {
  const habits = await prisma.habit.findMany({
    orderBy: [{ display_order: 'asc' }, { is_active: 'desc' }, { name: 'asc' }],
  });
  return habits.map(toHabitRecord);
}

export async function getHabitById(id: string): Promise<HabitRecord | null> {
  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit) return null;
  return toHabitRecord(habit);
}

export async function createHabit(input: CreateHabitInput): Promise<HabitRecord> {
  const maxOrder = await prisma.habit.findFirst({
    orderBy: { display_order: 'desc' },
    select: { display_order: true },
  });
  const displayOrder = (maxOrder?.display_order ?? -1) + 1;

  const habit = await prisma.habit.create({
    data: {
      name: input.name,
      subtitle: input.subtitle?.trim() || null,
      is_active: input.is_active,
      display_order: displayOrder,
      weekly_quota: input.weekly_quota,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input_schema: input.input_schema as any,
      completion_field_id: input.completion_field_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completion_limit: input.completion_limit as any ?? undefined,
      timing_field_id: input.timing_field_id,
    },
  });

  await logHabitChange({ habit_id: habit.id, habit_name: habit.name, event: 'created' });

  revalidatePath('/');
  return toHabitRecord(habit);
}

export async function updateHabit(input: UpdateHabitInput): Promise<HabitRecord> {
  const { id, ...data } = input;

  // Fetch old state to detect what changed
  const old = await prisma.habit.findUnique({ where: { id } });

  const habit = await prisma.habit.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...('subtitle' in data && { subtitle: (data.subtitle as string | null | undefined)?.trim() || null }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
      ...(data.weekly_quota !== undefined && { weekly_quota: data.weekly_quota }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.input_schema !== undefined && { input_schema: data.input_schema as any }),
      ...('completion_field_id' in data && { completion_field_id: data.completion_field_id ?? null }),
      ...('completion_limit' in data && { completion_limit: (data.completion_limit as any) ?? null }),
      ...('timing_field_id' in data && { timing_field_id: data.timing_field_id ?? null }),
    },
  });

  if (old) {
    const habitName = data.name?.trim() ?? old.name;

    if (data.is_active !== undefined && data.is_active !== old.is_active) {
      await logHabitChange({
        habit_id: id,
        habit_name: habitName,
        event: data.is_active ? 'activated' : 'archived',
      });
    }

    if (data.weekly_quota !== undefined && data.weekly_quota !== old.weekly_quota) {
      await logHabitChange({
        habit_id: id,
        habit_name: habitName,
        event: 'quota_changed',
        details: { from: old.weekly_quota, to: data.weekly_quota },
      });
    }

    if (data.input_schema !== undefined) {
      const oldSchema = Array.isArray(old.input_schema) ? (old.input_schema as unknown as InputSchema) : [];
      const newSchema = data.input_schema;
      const oldIds = new Set(oldSchema.map((f) => f.id));
      const newIds = new Set(newSchema.map((f) => f.id));
      const added = newSchema.filter((f) => !oldIds.has(f.id)).map((f) => f.label || `(${f.type})`);
      const removed = oldSchema.filter((f) => !newIds.has(f.id)).map((f) => f.label || `(${f.type})`);
      if (added.length > 0 || removed.length > 0) {
        await logHabitChange({
          habit_id: id,
          habit_name: habitName,
          event: 'fields_changed',
          details: { added, removed },
        });
      }

      // Detect per-field archive/unarchive
      for (const newField of newSchema) {
        const oldField = oldSchema.find((f) => f.id === newField.id);
        if (!oldField) continue;
        if (!oldField.is_archived && newField.is_archived) {
          await logHabitChange({
            habit_id: id,
            habit_name: habitName,
            event: 'field_archived',
            details: { field_label: newField.label || `(${newField.type})` },
          });
        } else if (oldField.is_archived && !newField.is_archived) {
          await logHabitChange({
            habit_id: id,
            habit_name: habitName,
            event: 'field_unarchived',
            details: { field_label: newField.label || `(${newField.type})` },
          });
        }
      }
    }

    if ('completion_limit' in data) {
      const oldLimit = old.completion_limit as CompletionLimit | null;
      const newLimit = data.completion_limit ?? null;
      const changed =
        JSON.stringify(oldLimit) !== JSON.stringify(newLimit);
      if (changed) {
        await logHabitChange({
          habit_id: id,
          habit_name: habitName,
          event: 'completion_limit_changed',
          details: { from: oldLimit, to: newLimit },
        });
      }
    }
  }

  revalidatePath('/');
  return toHabitRecord(habit);
}

export async function deleteHabit(id: string): Promise<void> {
  const habit = await prisma.habit.findUnique({ where: { id }, select: { name: true } });
  await prisma.habit.delete({ where: { id } });
  if (habit) {
    await logHabitChange({ habit_id: null, habit_name: habit.name, event: 'deleted' });
  }
  revalidatePath('/');
}

export async function reorderHabits(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.habit.update({ where: { id }, data: { display_order: index } })
    )
  );
  revalidatePath('/');
  revalidatePath('/weekly');
  revalidatePath('/yearly/wow');
  revalidatePath('/yearly/timing');
}

// ── Section helpers ──────────────────────────────────────────

function toSectionRecord(raw: {
  id: string;
  title: string;
  subtitle: string | null;
  display_order: number;
}): HabitSectionRecord {
  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle,
    display_order: raw.display_order,
  };
}

export async function getHabitListItems(): Promise<HabitListItem[]> {
  const [habits, sections] = await Promise.all([
    prisma.habit.findMany({ orderBy: [{ display_order: 'asc' }, { name: 'asc' }] }),
    prisma.habitSection.findMany({ orderBy: { display_order: 'asc' } }),
  ]);

  const items: HabitListItem[] = [
    ...habits.map((h): HabitListItem => ({ type: 'habit', data: toHabitRecord(h) })),
    ...sections.map((s): HabitListItem => ({ type: 'section', data: toSectionRecord(s) })),
  ];

  items.sort((a, b) => a.data.display_order - b.data.display_order);
  return items;
}

export async function reorderItems(
  items: { id: string; type: 'habit' | 'section' }[]
): Promise<void> {
  await prisma.$transaction([
    ...items
      .filter((i) => i.type === 'habit')
      .map((i, _) => {
        const order = items.findIndex((x) => x.id === i.id);
        return prisma.habit.update({ where: { id: i.id }, data: { display_order: order } });
      }),
    ...items
      .filter((i) => i.type === 'section')
      .map((i) => {
        const order = items.findIndex((x) => x.id === i.id);
        return prisma.habitSection.update({ where: { id: i.id }, data: { display_order: order } });
      }),
  ]);
  revalidatePath('/');
  revalidatePath('/weekly');
  revalidatePath('/yearly/wow');
  revalidatePath('/yearly/timing');
}

export async function createSection(input: {
  title: string;
  subtitle?: string;
}): Promise<HabitSectionRecord> {
  const maxOrder = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(display_order) as max FROM (
      SELECT display_order FROM habits
      UNION ALL
      SELECT display_order FROM habit_sections
    ) t
  `;
  const displayOrder = (maxOrder[0]?.max ?? -1) + 1;

  const section = await prisma.habitSection.create({
    data: {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      display_order: displayOrder,
    },
  });
  revalidatePath('/');
  return toSectionRecord(section);
}

export async function updateSection(input: {
  id: string;
  title: string;
  subtitle?: string | null;
}): Promise<HabitSectionRecord> {
  const section = await prisma.habitSection.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
    },
  });
  revalidatePath('/');
  return toSectionRecord(section);
}

export async function deleteSection(id: string): Promise<void> {
  await prisma.habitSection.delete({ where: { id } });
  revalidatePath('/');
}
