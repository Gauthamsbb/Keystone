'use client';

import type { EntryRecord, HabitRecord } from '@/lib/types/schema';
import { getWeekCompletions } from '@/lib/utils/progress';

interface WoWGridProps {
  habit: HabitRecord;
  entries: EntryRecord[];
  year: number;
}

const INTENSITY_CLASSES: Record<string, string> = {
  none: 'bg-gray-100 text-gray-400',
  low: 'bg-green-200 text-green-700',
  mid: 'bg-green-400 text-white',
  high: 'bg-green-600 text-white',
};

function intensityClass(completions: number, quota: number): string {
  if (completions === 0) return INTENSITY_CLASSES.none;
  const ratio = completions / quota;
  if (ratio < 0.5) return INTENSITY_CLASSES.low;
  if (ratio < 1) return INTENSITY_CLASSES.mid;
  return INTENSITY_CLASSES.high;
}

export function WoWGrid({ habit, entries, year }: WoWGridProps) {
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-0.5 min-w-max">
        {weeks.map((wk) => {
          const count = getWeekCompletions(entries, habit, year, wk);
          const cls = intensityClass(count, habit.weekly_quota);
          return (
            <div
              key={wk}
              className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-medium ${cls}`}
              title={`Wk ${wk}: ${count} completion${count !== 1 ? 's' : ''}`}
            >
              {count > 0 ? count : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
