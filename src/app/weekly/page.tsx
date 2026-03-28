import { Suspense } from 'react';
import { getWeeklyBreakdown, getHabitStreaks } from '@/lib/actions/entries';
import { WeeklyHeader } from '@/components/weekly/WeeklyHeader';
import { WeeklyGrid } from '@/components/weekly/WeeklyGrid';

interface PageProps {
  searchParams: Promise<{ offset?: string }>;
}

export default async function WeeklyPage({ searchParams }: PageProps) {
  const { offset: offsetStr } = await searchParams;
  const offset = parseInt(offsetStr ?? '0', 10);

  const [{ weekStart, weekEnd, habits, entriesByHabitAndDate }, streaks] = await Promise.all([
    getWeeklyBreakdown(offset),
    getHabitStreaks(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <WeeklyHeader weekStart={weekStart} weekEnd={weekEnd} />
      </Suspense>
      <WeeklyGrid
        habits={habits}
        weekStart={weekStart}
        entriesByHabitAndDate={entriesByHabitAndDate}
        streaks={streaks}
      />
    </div>
  );
}
