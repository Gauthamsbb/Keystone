import { Suspense } from 'react';
import { getYearlyData, getHabitStreaks } from '@/lib/actions/entries';
import { YearlyNav } from '@/components/yearly/YearlyNav';
import { TimingGrid } from '@/components/yearly/TimingGrid';

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function TimingPage({ searchParams }: PageProps) {
  const { year: yearStr } = await searchParams;
  const year = parseInt(yearStr ?? String(new Date().getUTCFullYear()), 10);

  const [{ habits, entries }, streaks] = await Promise.all([
    getYearlyData(year),
    getHabitStreaks(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <YearlyNav year={year} activeView="timing" />
      </Suspense>

      <TimingGrid habits={habits} entries={entries} year={year} streaks={streaks} />
    </div>
  );
}
