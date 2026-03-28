import type { BucketMilestoneRecord } from '@/lib/types/schema';
import { getMilestoneColor } from './milestoneColors';

interface Props {
  habitName: string;
  streak: number;
  isDimmed: boolean;
  milestones: BucketMilestoneRecord[]; // sorted by display_order
  allHabitsStreak: number; // minimum streak across all habits in bucket
}

export function HabitStreakBar({ habitName, streak, isDimmed, milestones, allHabitsStreak }: Props) {
  const sortedMilestones = [...milestones].sort((a, b) => a.streak_target - b.streak_target);
  const nMilestones = sortedMilestones.length;

  const hasEarnedAnyMilestone = sortedMilestones.some((m) => streak >= m.streak_target);
  const shouldDim = isDimmed && !hasEarnedAnyMilestone;

  const lastTarget = sortedMilestones.at(-1)?.streak_target ?? 0;
  // Show one dot per week up to last milestone, capped at 24 for space
  const displayWeeks = Math.min(lastTarget, 24);
  const weeks = Array.from({ length: displayWeeks }, (_, i) => i + 1);
  const N = weeks.length;

  const milestoneByWeek = new Map(sortedMilestones.map((m) => [m.streak_target, m]));

  // Color for week: gray if not yet earned, emerald if all-bucket earned, zone color otherwise
  function getWeekColor(week: number): string {
    if (week > streak) return '#E5E7EB';
    if (allHabitsStreak >= week) return '#10B981';
    const next = sortedMilestones.find((m) => m.streak_target >= week);
    return next
      ? getMilestoneColor(next.display_order).hex
      : getMilestoneColor(nMilestones - 1).hex;
  }

  // Index of last filled dot (0-based), -1 if none
  const lastFilledIdx = Math.min(streak, N) - 1;
  const fillFraction = lastFilledIdx >= 0 && N > 1 ? lastFilledIdx / (N - 1) : 0;
  const fillColor = lastFilledIdx >= 0 ? getWeekColor(lastFilledIdx + 1) : '#E5E7EB';

  // Left position for dot at index i, centering first/last dot within the container
  // dot center = calc((i/(N-1))*100% + (14 - (i/(N-1))*28)px)
  function dotLeft(i: number): string {
    if (N <= 1) return '14px';
    const f = i / (N - 1);
    return `calc(${f * 100}% + ${14 - f * 28}px)`;
  }

  return (
    <div className={`space-y-1.5 ${shouldDim ? 'opacity-55' : ''}`}>
      {/* Row 1: habit name + streak badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#1E1B4B] truncate" title={habitName}>
          {habitName}
        </span>
        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 tabular-nums">
          {streak}
        </span>
      </div>

      {/* Dot track */}
      {N > 0 && (
        /* marginBottom makes room for the reward text labels below milestone dots */
        <div className="relative" style={{ height: '28px', marginBottom: '26px' }}>
          {/* Background line (center-to-center of first/last dot) */}
          {N > 1 && (
            <div
              className="absolute rounded-full bg-gray-200"
              style={{ top: '13px', height: '2px', left: '14px', right: '14px' }}
            />
          )}
          {/* Fill line */}
          {lastFilledIdx >= 0 && N > 1 && (
            <div
              className="absolute rounded-full transition-all duration-500"
              style={{
                top: '13px',
                height: '2px',
                left: '14px',
                width: `calc(${fillFraction * 100}% - ${fillFraction * 28}px)`,
                backgroundColor: fillColor,
              }}
            />
          )}

          {weeks.map((week, i) => {
            const milestone = milestoneByWeek.get(week);
            const filled = week <= streak;

            if (milestone) {
              const allEarned = allHabitsStreak >= week;
              const mc = getMilestoneColor(milestone.display_order);
              const dotBg = !filled ? '#E5E7EB' : allEarned ? '#10B981' : mc.hex;
              const dotText = filled ? '#ffffff' : '#9CA3AF';
              const labelColor = !filled ? '#9CA3AF' : allEarned ? '#065F46' : mc.textDark;
              return (
                <div
                  key={week}
                  className="absolute z-10 -translate-x-1/2"
                  style={{ left: dotLeft(i), top: '0px' }}
                >
                  {/* Large milestone dot */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors duration-300"
                    style={{
                      backgroundColor: dotBg,
                      color: dotText,
                      boxShadow: allEarned && filled
                        ? '0 0 0 2px #fff, 0 0 0 3.5px #10B981'
                        : undefined,
                    }}
                    title={`${week}wk → ${milestone.reward}`}
                  >
                    {week}w
                  </div>
                  {/* Reward label below dot */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: '32px', width: '64px' }}
                  >
                    <p
                      className="text-[8.5px] font-semibold text-center leading-tight line-clamp-2"
                      style={{ color: labelColor }}
                    >
                      {milestone.reward}
                    </p>
                  </div>
                </div>
              );
            }

            // Small week dot
            return (
              <div
                key={week}
                className="absolute z-10 -translate-x-1/2 w-2 h-2 rounded-full transition-colors duration-200"
                style={{
                  left: dotLeft(i),
                  top: '10px', // centers small dot: 10 + 4 = 14px ✓
                  backgroundColor: getWeekColor(week),
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
