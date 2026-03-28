import { Suspense } from 'react';
import { getYearlyData, getHabitStreaks } from '@/lib/actions/entries';
import { YearlyNav } from '@/components/yearly/YearlyNav';
import { DurationGrid } from '@/components/yearly/DurationGrid';

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function DurationPage({ searchParams }: PageProps) {
  const { year: yearStr } = await searchParams;
  const year = parseInt(yearStr ?? String(new Date().getUTCFullYear()), 10);

  const [{ habits, entries }, streaks] = await Promise.all([
    getYearlyData(year),
    getHabitStreaks(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <YearlyNav year={year} activeView="duration" />
      </Suspense>

      <DurationGrid habits={habits} entries={entries} year={year} streaks={streaks} />
    </div>
  );
}
