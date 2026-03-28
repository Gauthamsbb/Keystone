import { Suspense } from 'react';
import { getYearlyData, getHabitStreaks } from '@/lib/actions/entries';
import { YearlyNav } from '@/components/yearly/YearlyNav';
import { WoWSpreadsheet } from '@/components/yearly/WoWSpreadsheet';

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function WoWPage({ searchParams }: PageProps) {
  const { year: yearStr } = await searchParams;
  const year = parseInt(yearStr ?? String(new Date().getUTCFullYear()), 10);

  const [{ habits, entries }, streaks] = await Promise.all([
    getYearlyData(year),
    getHabitStreaks(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Suspense>
        <YearlyNav year={year} activeView="wow" />
      </Suspense>

      <WoWSpreadsheet habits={habits} entries={entries} year={year} streaks={streaks} />
    </div>
  );
}
