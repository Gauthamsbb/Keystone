'use client';

import { useQuery } from '@tanstack/react-query';
import { getEntriesByDate, getHabitStreaks } from '@/lib/actions/entries';
import type { HabitListItem, HabitSectionRecord } from '@/lib/types/schema';
import { HabitCard } from './HabitCard';

interface HabitListProps {
  items: HabitListItem[];
  selectedDate: string;
}

function SectionDivider({ section }: { section: HabitSectionRecord }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1 px-0.5">
      {/* Left accent bar */}
      <div className="w-[3px] self-stretch rounded-full bg-gradient-to-b from-violet-500 to-violet-300 shrink-0" />

      {/* Text */}
      <div className="min-w-0">
        <p className="font-semibold text-[15px] text-[#1E1B4B] tracking-tight leading-snug">
          {section.title}
        </p>
        {section.subtitle && (
          <p className="text-xs text-violet-400 mt-0.5 leading-relaxed">{section.subtitle}</p>
        )}
      </div>

      {/* Fading rule */}
      <div className="h-px flex-1 bg-gradient-to-r from-violet-200 via-violet-100 to-transparent" />
    </div>
  );
}

export function HabitList({ items, selectedDate }: HabitListProps) {
  const activeItems = items.filter(
    (item) => item.type === 'section' || (item.type === 'habit' && item.data.is_active)
  );

  const habitIds = activeItems
    .filter((item): item is Extract<HabitListItem, { type: 'habit' }> => item.type === 'habit')
    .map((item) => item.data.id);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', selectedDate],
    queryFn: () => getEntriesByDate(selectedDate),
    staleTime: 0,
  });

  const { data: streaks = [] } = useQuery({
    queryKey: ['streaks'],
    queryFn: getHabitStreaks,
    staleTime: 30_000,
  });

  const streakMap = Object.fromEntries(streaks.map((s) => [s.habitId, s]));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {habitIds.map((id) => (
          <div key={id} className="h-24 bg-violet-100/70 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (habitIds.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.06)]">
        <p className="text-lg font-semibold text-[#1E1B4B]">No active habits</p>
        <p className="text-sm mt-1 text-violet-400">Add some habits from the settings page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeItems.map((item) => {
        if (item.type === 'section') {
          return <SectionDivider key={item.data.id} section={item.data} />;
        }

        const habit = item.data;
        const existing = entries.find((e) => e.habit_id === habit.id);
        const streak = streakMap[habit.id] ?? { count: 0, isDimmed: true };
        return (
          <HabitCard
            key={`${habit.id}-${selectedDate}`}
            habit={habit}
            existingEntry={existing}
            selectedDate={selectedDate}
            streakCount={streak.count}
            streakDimmed={streak.isDimmed}
          />
        );
      })}
    </div>
  );
}
