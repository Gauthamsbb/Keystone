import Link from 'next/link';
import type { BucketWithStreaks } from '@/lib/types/schema';
import { MilestoneBadge } from './MilestoneBadge';
import { HabitStreakBar } from './HabitStreakBar';

interface Props {
  bucket: BucketWithStreaks;
}

export function BucketCard({ bucket }: Props) {
  const { habits, milestones, habitStreaks } = bucket;

  const sortedMilestones = [...milestones].sort((a, b) => a.display_order - b.display_order);

  // Minimum streak across all habits (used to determine if ALL habits passed a milestone)
  const allHabitsMinStreak =
    habits.length === 0
      ? 0
      : Math.min(...habits.map((bh) => habitStreaks[bh.habit_id]?.count ?? 0));

  // Which milestones are fully earned (all habits passed)
  const earnedMilestoneIds = new Set(
    sortedMilestones
      .filter((m) => allHabitsMinStreak >= m.streak_target)
      .map((m) => m.id)
  );

  const hasEarnedAny = earnedMilestoneIds.size > 0;

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${
        hasEarnedAny
          ? 'border-emerald-200 shadow-[0_2px_16px_rgba(5,150,105,0.10)]'
          : 'border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.07)]'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b ${
          hasEarnedAny
            ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/30 border-emerald-100'
            : 'bg-gradient-to-r from-violet-50 to-violet-50/30 border-violet-100'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪣</span>
            <h2 className="text-lg font-bold text-[#1E1B4B] truncate">{bucket.name}</h2>
            {hasEarnedAny && (
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          {bucket.description && (
            <p className="mt-1 text-sm text-gray-600 leading-snug">{bucket.description}</p>
          )}
        </div>
        <Link
          href="/rewards/manage"
          className="shrink-0 p-1.5 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-colors"
          title="Manage bucket"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Milestone badges */}
      {sortedMilestones.length > 0 && (
        <div className="px-5 pt-3.5 pb-4 flex flex-col gap-2.5 bg-violet-50/50 border-b border-violet-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
            🏅 Milestone Rewards
          </span>
          <div className="flex gap-2 flex-wrap">
            {sortedMilestones.map((m) => (
              <MilestoneBadge key={m.id} milestone={m} earned={earnedMilestoneIds.has(m.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Habit progress bars */}
      <div className="px-5 py-4 space-y-4">
        {habits.length === 0 ? (
          <p className="text-sm text-violet-400 italic">
            No habits yet —{' '}
            <Link href="/rewards/manage" className="underline hover:text-violet-600 transition-colors">
              add some in Manage
            </Link>
          </p>
        ) : (
          habits.map((bh) => {
            const s = habitStreaks[bh.habit_id] ?? { count: 0, isDimmed: false };
            const hasMilestoneHit = sortedMilestones.some((m) => s.count >= m.streak_target);
            return (
              <HabitStreakBar
                key={bh.id}
                habitName={bh.habit.name}
                streak={s.count}
                isDimmed={s.isDimmed && !hasMilestoneHit}
                milestones={sortedMilestones}
                allHabitsStreak={allHabitsMinStreak}
              />
            );
          })
        )}
      </div>

      {/* No milestones hint */}
      {milestones.length === 0 && habits.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-violet-400 italic">
            No milestones set —{' '}
            <Link href="/rewards/manage" className="underline hover:text-violet-600 transition-colors">
              add milestones in Manage
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
