import type { BucketMilestoneRecord } from '@/lib/types/schema';
import { getMilestoneColor } from './milestoneColors';

interface Props {
  milestone: BucketMilestoneRecord;
  earned: boolean;
}

export function MilestoneBadge({ milestone, earned }: Props) {
  const color = getMilestoneColor(milestone.display_order);

  if (earned) {
    return (
      <div
        className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-center min-w-[88px] transition-all"
        style={{
          backgroundColor: color.bgLight,
          border: `2px solid ${color.border}`,
          boxShadow: `0 4px 14px ${color.glow}`,
        }}
      >
        <span className="text-xl leading-none">🏅</span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest leading-none"
          style={{ color: color.textDark }}
        >
          {milestone.streak_target}wk
        </span>
        <span
          className="text-sm font-bold leading-snug max-w-[100px]"
          style={{ color: color.textDark }}
        >
          {milestone.reward}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-center min-w-[88px] bg-gray-50 border border-dashed border-gray-300">
      <span className="text-xl leading-none grayscale opacity-40">🏅</span>
      <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-gray-400">
        {milestone.streak_target}wk
      </span>
      <span className="text-sm font-semibold leading-snug text-gray-500 max-w-[100px]">
        {milestone.reward}
      </span>
    </div>
  );
}
