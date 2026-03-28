'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface WeeklyHeaderProps {
  weekStart: string;
  weekEnd: string;
}

function formatShort(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateStr}T00:00:00.000Z`));
}

function formatYear(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCFullYear();
}

export function WeeklyHeader({ weekStart, weekEnd }: WeeklyHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  function go(delta: number) {
    router.push(`/weekly?offset=${offset + delta}`);
  }

  const label = `${formatShort(weekStart)} – ${formatShort(weekEnd)}, ${formatYear(weekEnd)}`;

  return (
    <div className="flex items-center justify-center gap-2 py-2 mb-4">
      <button
        onClick={() => go(-1)}
        className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
        aria-label="Previous week"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-[#1E1B4B] bg-violet-50 border border-violet-200 rounded-full px-3 py-1">{label}</span>
      <button
        onClick={() => go(1)}
        className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
        aria-label="Next week"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
