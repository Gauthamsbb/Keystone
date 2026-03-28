'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentProfile } from '@/lib/supabase/get-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/actions/audit';
import type { HabitRecord, EntryRecord, InputSchema, CompletionLimit } from '@/lib/types/schema';
import { calculateStreak } from '@/lib/utils/progress';

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (profile.role !== 'super_admin') throw new Error('Forbidden');
  return profile;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalHabits: number;
  entriesToday: number;
  totalEntries: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireSuperAdmin();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [totalUsers, totalHabits, entriesToday, totalEntries] = await Promise.all([
    prisma.profile.count(),
    prisma.habit.count({ where: { is_active: true } }),
    prisma.entry.count({ where: { date: today } }),
    prisma.entry.count(),
  ]);

  return { totalUsers, totalHabits, entriesToday, totalEntries };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  habitCount: number;
  lastActivity: Date | null;
  createdAt: Date;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireSuperAdmin();

  const profiles = await prisma.profile.findMany({
    orderBy: { created_at: 'asc' },
    include: {
      _count: { select: { habits: true } },
      auditLogs: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { created_at: true },
      },
    },
  });

  return profiles.map((p) => ({
    id: p.id,
    email: p.email,
    role: p.role,
    habitCount: p._count.habits,
    lastActivity: p.auditLogs[0]?.created_at ?? null,
    createdAt: p.created_at,
  }));
}

export async function setUserRole(userId: string, role: 'user' | 'super_admin'): Promise<void> {
  const me = await requireSuperAdmin();
  if (userId === me.id && role !== 'super_admin') {
    throw new Error('You cannot demote your own admin account.');
  }
  await prisma.profile.update({ where: { id: userId }, data: { role } });
}

// ── Credentials ────────────────────────────────────────────────────────────────

export async function updateUserCredentials(
  userId: string,
  updates: { email?: string; password?: string },
): Promise<{ error?: string }> {
  const me = await requireSuperAdmin();

  if (!updates.email && !updates.password) return {};

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ...(updates.email && { email: updates.email }),
    ...(updates.password && { password: updates.password }),
  });

  if (error) return { error: error.message };

  // Sync email in profiles table if it changed
  if (updates.email) {
    await prisma.profile.update({ where: { id: userId }, data: { email: updates.email } });
  }

  await writeAuditLog(me.id, 'admin_update_credentials', 'profiles', userId, {
    changed: Object.keys(updates),
  });

  return {};
}

// ── Per-user weekly report ─────────────────────────────────────────────────────

export interface AdminWeeklyReport {
  weekStart: string;
  weekEnd: string;
  habits: HabitRecord[];
  entriesByHabitAndDate: Record<string, Record<string, EntryRecord>>;
  streaks: { habitId: string; count: number; isDimmed: boolean }[];
}

export async function getAdminWeeklyReport(
  userId: string,
  weekOffset: number,
): Promise<AdminWeeklyReport> {
  await requireSuperAdmin();

  // Week bounds
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday + weekOffset * 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const rawHabits = await prisma.habit.findMany({
    where: { user_id: userId, is_active: true },
    orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
  });

  const habits: HabitRecord[] = rawHabits.map((h) => ({
    id: h.id,
    name: h.name,
    subtitle: h.subtitle,
    is_active: h.is_active,
    display_order: h.display_order,
    weekly_quota: h.weekly_quota,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input_schema: Array.isArray(h.input_schema) ? (h.input_schema as any) : [],
    completion_field_id: h.completion_field_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completion_limit: h.completion_limit != null ? (h.completion_limit as any as CompletionLimit) : null,
    timing_field_id: h.timing_field_id,
  }));

  const entries = await prisma.entry.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      habit_id: { in: habits.map((h) => h.id) },
    },
    include: { values: true },
  });

  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  const entriesByHabitAndDate: Record<string, Record<string, EntryRecord>> = {};
  for (const e of entries) {
    const dateStr = toDateStr(e.date);
    if (!entriesByHabitAndDate[e.habit_id]) entriesByHabitAndDate[e.habit_id] = {};
    entriesByHabitAndDate[e.habit_id][dateStr] = {
      id: e.id,
      habit_id: e.habit_id,
      date: dateStr,
      values: e.values.map((v) => ({
        field_id: v.field_id,
        text_value: v.text_value,
        int_value: v.int_value,
        duration_mins: v.duration_mins,
        time_mins: v.time_mins,
        boolean_value: v.boolean_value,
      })),
    };
  }

  // Streaks — look back 52 weeks
  const streakStart = new Date(now);
  streakStart.setUTCDate(streakStart.getUTCDate() - 52 * 7);
  streakStart.setUTCHours(0, 0, 0, 0);

  const allEntries = await prisma.entry.findMany({
    where: { habit_id: { in: habits.map((h) => h.id) }, date: { gte: streakStart } },
    include: { values: true },
    orderBy: { date: 'asc' },
  });

  const allEntryRecords: EntryRecord[] = allEntries.map((e) => ({
    id: e.id,
    habit_id: e.habit_id,
    date: toDateStr(e.date),
    values: e.values.map((v) => ({
      field_id: v.field_id,
      text_value: v.text_value,
      int_value: v.int_value,
      duration_mins: v.duration_mins,
      time_mins: v.time_mins,
      boolean_value: v.boolean_value,
    })),
  }));

  const streaks = habits.map((habit) => {
    const habitEntries = allEntryRecords.filter((e) => e.habit_id === habit.id);
    const { count, isDimmed } = calculateStreak(habitEntries, habit, now);
    return { habitId: habit.id, count, isDimmed };
  });

  return {
    weekStart: toDateStr(weekStart),
    weekEnd: toDateStr(weekEnd),
    habits,
    entriesByHabitAndDate,
    streaks,
  };
}

// ── Single user fetch ──────────────────────────────────────────────────────────

export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  await requireSuperAdmin();

  const p = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { habits: true } },
      auditLogs: { orderBy: { created_at: 'desc' }, take: 1, select: { created_at: true } },
    },
  });

  if (!p) return null;

  return {
    id: p.id,
    email: p.email,
    role: p.role,
    habitCount: p._count.habits,
    lastActivity: p.auditLogs[0]?.created_at ?? null,
    createdAt: p.created_at,
  };
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AdminAuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  tableName: string;
  recordId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any> | null;
  createdAt: Date;
}

export async function getAdminAuditLog(
  page = 1,
  filters?: { userId?: string; action?: string }
): Promise<{ rows: AdminAuditEntry[]; total: number }> {
  await requireSuperAdmin();

  const take = 50;
  const skip = (page - 1) * take;

  const where = {
    ...(filters?.userId && { user_id: filters.userId }),
    ...(filters?.action && { action: { contains: filters.action } }),
  };

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take,
      include: { user: { select: { email: true } } },
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user.email,
      action: r.action,
      tableName: r.table_name,
      recordId: r.record_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: r.details as Record<string, any> | null,
      createdAt: r.created_at,
    })),
    total,
  };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export async function getAdminHeatmapData(year: number): Promise<HeatmapDay[]> {
  await requireSuperAdmin();

  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);

  const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*) AS count
    FROM admin_audit_logs
    WHERE created_at >= ${start} AND created_at <= ${end}
    GROUP BY date
    ORDER BY date ASC
  `;

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

// ── Recent activity (for dashboard feed) ─────────────────────────────────────

export async function getRecentActivity(limit = 20): Promise<AdminAuditEntry[]> {
  await requireSuperAdmin();

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
    include: { user: { select: { email: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userEmail: r.user.email,
    action: r.action,
    tableName: r.table_name,
    recordId: r.record_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: r.details as Record<string, any> | null,
    createdAt: r.created_at,
  }));
}
