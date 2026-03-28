'use server';

import { prisma } from '@/lib/prisma';

export type ChangeEvent =
  | 'created'
  | 'deleted'
  | 'activated'
  | 'archived'
  | 'quota_changed'
  | 'fields_changed'
  | 'completion_limit_changed'
  | 'field_archived'
  | 'field_unarchived'
  | 'reward_bucket_created'
  | 'reward_bucket_updated'
  | 'reward_bucket_deleted'
  | 'reward_milestone_added'
  | 'reward_milestone_updated'
  | 'reward_milestone_deleted'
  | 'reward_habit_added'
  | 'reward_habit_removed';

export interface ChangeLogEntry {
  id: string;
  habit_id: string | null;
  habit_name: string;
  event: ChangeEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any> | null;
  created_at: Date;
}

export async function logHabitChange(entry: {
  habit_id: string | null;
  habit_name: string;
  event: ChangeEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any> | null;
}): Promise<void> {
  await prisma.habitChangeLog.create({
    data: {
      habit_id: entry.habit_id,
      habit_name: entry.habit_name,
      event: entry.event,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: entry.details as any ?? undefined,
    },
  });
}

export async function getChangeLog(): Promise<ChangeLogEntry[]> {
  const rows = await prisma.habitChangeLog.findMany({
    orderBy: { created_at: 'desc' },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    habit_id: r.habit_id,
    habit_name: r.habit_name,
    event: r.event as ChangeEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: r.details as Record<string, any> | null,
    created_at: r.created_at,
  }));
}
