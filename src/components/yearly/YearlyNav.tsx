'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export type ActiveView = 'wow' | 'timing' | 'duration';

interface YearlyNavProps {
  year: number;
  activeView: ActiveView;
}

export function YearlyNav({ year, activeView }: YearlyNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(delta: number) {
    const newYear = year + delta;
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(newYear));
    router.push(`/yearly/${activeView}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => go(-1)}
          className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
          aria-label="Previous year"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[#1E1B4B] w-12 text-center">{year}</span>
        <button
          onClick={() => go(1)}
          className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
          aria-label="Next year"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View toggle */}
      <div className="flex bg-violet-50 border border-violet-100 rounded-lg p-0.5 self-center">
        <Link
          href={`/yearly/wow?year=${year}`}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            activeView === 'wow'
              ? 'bg-white text-[#1E1B4B] shadow-sm border border-violet-100'
              : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Week-over-Week
        </Link>
        <Link
          href={`/yearly/timing?year=${year}`}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            activeView === 'timing'
              ? 'bg-white text-[#1E1B4B] shadow-sm border border-violet-100'
              : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Timing
        </Link>
        <Link
          href={`/yearly/duration?year=${year}`}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            activeView === 'duration'
              ? 'bg-white text-[#1E1B4B] shadow-sm border border-violet-100'
              : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          Duration
        </Link>
      </div>
    </div>
  );
}
