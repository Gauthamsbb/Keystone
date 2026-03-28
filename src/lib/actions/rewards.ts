'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { calculateStreak } from '@/lib/utils/progress';
import { logHabitChange } from './changelog';
import { getHabitHistory } from './entries';
import type {
  HabitRecord,
  InputSchema,
  CompletionLimit,
  RewardBucketRecord,
  BucketWithStreaks,
  BucketMilestoneRecord,
  BucketHabitRecord,
} from '@/lib/types/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function toBucketMilestoneRecord(raw: {
  id: string;
  bucket_id: string;
  streak_target: number;
  reward: string;
  display_order: number;
}): BucketMilestoneRecord {
  return {
    id: raw.id,
    bucket_id: raw.bucket_id,
    streak_target: raw.streak_target,
    reward: raw.reward,
    display_order: raw.display_order,
  };
}

function toBucketRecord(raw: {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  habits: Array<{
    id: string;
    bucket_id: string;
    habit_id: string;
    habit: {
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
    };
  }>;
  milestones: Array<{
    id: string;
    bucket_id: string;
    streak_target: number;
    reward: string;
    display_order: number;
  }>;
}): RewardBucketRecord {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    display_order: raw.display_order,
    habits: raw.habits.map((bh): BucketHabitRecord => ({
      id: bh.id,
      bucket_id: bh.bucket_id,
      habit_id: bh.habit_id,
      habit: toHabitRecord(bh.habit),
    })),
    milestones: raw.milestones
      .map(toBucketMilestoneRecord)
      .sort((a, b) => a.display_order - b.display_order),
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getBuckets(): Promise<RewardBucketRecord[]> {
  const buckets = await prisma.rewardBucket.findMany({
    orderBy: { display_order: 'asc' },
    include: {
      habits: {
        include: { habit: true },
      },
      milestones: {
        orderBy: { display_order: 'asc' },
      },
    },
  });
  return buckets.map((b) => toBucketRecord(b));
}

export async function getBucketsWithStreaks(): Promise<BucketWithStreaks[]> {
  const buckets = await getBuckets();
  const now = new Date();

  // Collect unique habit IDs across all buckets
  const habitIds = [...new Set(buckets.flatMap((b) => b.habits.map((bh) => bh.habit_id)))];

  // Fetch history for all habits in parallel
  const historiesByHabitId: Record<string, Awaited<ReturnType<typeof getHabitHistory>>> = {};
  await Promise.all(
    habitIds.map(async (id) => {
      historiesByHabitId[id] = await getHabitHistory(id, 53);
    })
  );

  return buckets.map((bucket): BucketWithStreaks => {
    const habitStreaks: Record<string, { count: number; isDimmed: boolean }> = {};
    for (const bh of bucket.habits) {
      const history = historiesByHabitId[bh.habit_id] ?? [];
      habitStreaks[bh.habit_id] = calculateStreak(history, bh.habit, now);
    }
    return { ...bucket, habitStreaks };
  });
}

// ── Bucket CRUD ───────────────────────────────────────────────────────────────

export async function createBucket(input: {
  name: string;
  description?: string;
}): Promise<RewardBucketRecord> {
  const maxOrder = await prisma.rewardBucket.findFirst({
    orderBy: { display_order: 'desc' },
    select: { display_order: true },
  });
  const displayOrder = (maxOrder?.display_order ?? -1) + 1;

  const bucket = await prisma.rewardBucket.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      display_order: displayOrder,
    },
    include: {
      habits: { include: { habit: true } },
      milestones: true,
    },
  });

  await logHabitChange({ habit_id: bucket.id, habit_name: bucket.name, event: 'reward_bucket_created' });
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
  return toBucketRecord(bucket);
}

export async function updateBucket(input: {
  id: string;
  name?: string;
  description?: string | null;
}): Promise<void> {
  const existing = await prisma.rewardBucket.findUnique({
    where: { id: input.id },
    select: { name: true, description: true },
  });
  await prisma.rewardBucket.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...('description' in input && { description: input.description?.trim() || null }),
    },
  });
  const changedDetails: Record<string, unknown> = {};
  if (input.name !== undefined && input.name.trim() !== existing?.name) {
    changedDetails.name = { from: existing?.name, to: input.name.trim() };
  }
  if ('description' in input) {
    const newDesc = input.description?.trim() || null;
    if (newDesc !== existing?.description) {
      changedDetails.description = { from: existing?.description, to: newDesc };
    }
  }
  if (Object.keys(changedDetails).length > 0) {
    await logHabitChange({
      habit_id: input.id,
      habit_name: existing?.name ?? input.name ?? input.id,
      event: 'reward_bucket_updated',
      details: changedDetails,
    });
  }
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

export async function deleteBucket(id: string): Promise<void> {
  const existing = await prisma.rewardBucket.findUnique({ where: { id }, select: { name: true } });
  await prisma.rewardBucket.delete({ where: { id } });
  if (existing) {
    await logHabitChange({ habit_id: null, habit_name: existing.name, event: 'reward_bucket_deleted' });
  }
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

export async function reorderBuckets(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.rewardBucket.update({ where: { id }, data: { display_order: index } })
    )
  );
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

// ── Habit membership ──────────────────────────────────────────────────────────

export async function addHabitToBucket(bucketId: string, habitId: string): Promise<void> {
  const [bucket, habit] = await Promise.all([
    prisma.rewardBucket.findUnique({ where: { id: bucketId }, select: { name: true } }),
    prisma.habit.findUnique({ where: { id: habitId }, select: { name: true } }),
  ]);
  await prisma.bucketHabit.create({
    data: { bucket_id: bucketId, habit_id: habitId },
  });
  await logHabitChange({
    habit_id: bucketId,
    habit_name: bucket?.name ?? bucketId,
    event: 'reward_habit_added',
    details: { habit_name: habit?.name ?? habitId },
  });
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

export async function removeHabitFromBucket(bucketId: string, habitId: string): Promise<void> {
  const [bucket, habit] = await Promise.all([
    prisma.rewardBucket.findUnique({ where: { id: bucketId }, select: { name: true } }),
    prisma.habit.findUnique({ where: { id: habitId }, select: { name: true } }),
  ]);
  await prisma.bucketHabit.deleteMany({
    where: { bucket_id: bucketId, habit_id: habitId },
  });
  await logHabitChange({
    habit_id: bucketId,
    habit_name: bucket?.name ?? bucketId,
    event: 'reward_habit_removed',
    details: { habit_name: habit?.name ?? habitId },
  });
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

// ── Milestone CRUD ────────────────────────────────────────────────────────────

export async function addMilestone(input: {
  bucket_id: string;
  streak_target: number;
  reward: string;
}): Promise<void> {
  const [maxOrder, bucket] = await Promise.all([
    prisma.bucketMilestone.findFirst({
      where: { bucket_id: input.bucket_id },
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    }),
    prisma.rewardBucket.findUnique({ where: { id: input.bucket_id }, select: { name: true } }),
  ]);
  const displayOrder = (maxOrder?.display_order ?? -1) + 1;

  await prisma.bucketMilestone.create({
    data: {
      bucket_id: input.bucket_id,
      streak_target: input.streak_target,
      reward: input.reward.trim(),
      display_order: displayOrder,
    },
  });
  await logHabitChange({
    habit_id: input.bucket_id,
    habit_name: bucket?.name ?? input.bucket_id,
    event: 'reward_milestone_added',
    details: { streak_target: input.streak_target, reward: input.reward.trim() },
  });
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

export async function updateMilestone(input: {
  id: string;
  streak_target?: number;
  reward?: string;
}): Promise<void> {
  const milestone = await prisma.bucketMilestone.findUnique({
    where: { id: input.id },
    select: { bucket_id: true, streak_target: true, reward: true, bucket: { select: { name: true } } },
  });
  await prisma.bucketMilestone.update({
    where: { id: input.id },
    data: {
      ...(input.streak_target !== undefined && { streak_target: input.streak_target }),
      ...(input.reward !== undefined && { reward: input.reward.trim() }),
    },
  });
  await logHabitChange({
    habit_id: milestone?.bucket_id ?? null,
    habit_name: milestone?.bucket?.name ?? input.id,
    event: 'reward_milestone_updated',
    details: {
      streak_target: input.streak_target ?? milestone?.streak_target,
      reward: input.reward?.trim() ?? milestone?.reward,
    },
  });
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}

export async function deleteMilestone(id: string): Promise<void> {
  const milestone = await prisma.bucketMilestone.findUnique({
    where: { id },
    select: { bucket_id: true, streak_target: true, reward: true, bucket: { select: { name: true } } },
  });
  await prisma.bucketMilestone.delete({ where: { id } });
  if (milestone) {
    await logHabitChange({
      habit_id: milestone.bucket_id,
      habit_name: milestone.bucket?.name ?? milestone.bucket_id,
      event: 'reward_milestone_deleted',
      details: { streak_target: milestone.streak_target, reward: milestone.reward },
    });
  }
  revalidatePath('/rewards');
  revalidatePath('/rewards/manage');
}
