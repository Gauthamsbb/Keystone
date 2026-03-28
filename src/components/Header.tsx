'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { SyncIndicator } from './SyncIndicator';
import { ReorderSheet } from './habits/ReorderSheet';

function DateNav() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = new Date().toISOString().split('T')[0];
  const selectedDate = searchParams.get('date') ?? today;

  const formatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDate}T00:00:00.000Z`));

  function changeDate(delta: number) {
    const d = new Date(`${selectedDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    const next = d.toISOString().split('T')[0];
    router.push(`/?date=${next}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => changeDate(-1)}
        className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 hover:text-violet-700 active:bg-violet-200 transition-colors"
        aria-label="Previous day"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-[#1E1B4B] bg-violet-50 border border-violet-200 rounded-full px-3 py-1 min-w-[120px] text-center">
        {formatted}
      </span>
      <button
        onClick={() => changeDate(1)}
        className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 hover:text-violet-700 active:bg-violet-200 transition-colors"
        aria-label="Next day"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function NavLinks() {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith('/habits');
  const isWeekly = pathname.startsWith('/weekly');
  const isYearly = pathname.startsWith('/yearly');
  const isRewards = pathname.startsWith('/rewards');
  const isHome = !isAdmin && !isWeekly && !isYearly && !isRewards;

  return (
    <div className="flex items-center gap-0.5">
      {isHome ? (
        <>
          <Link
            href="/weekly"
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            title="Weekly view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
          <Link
            href="/yearly/wow"
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            title="Yearly view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
          <Link
            href="/rewards"
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            title="Rewards"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14l-1.5 9H6.5L5 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12v9m6-9v9M3 21h18" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3a4 4 0 008 0" />
            </svg>
          </Link>
          <Link
            href="/habits"
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            title="Manage habits"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </>
      ) : (
        <Link
          href={isRewards && pathname !== '/rewards' ? '/rewards' : '/'}
          className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
          title={isRewards && pathname !== '/rewards' ? 'Back to Rewards' : 'Back to dashboard'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [reorderOpen, setReorderOpen] = useState(false);

  const isHome = !pathname.startsWith('/habits') && !pathname.startsWith('/weekly') && !pathname.startsWith('/yearly') && !pathname.startsWith('/rewards');
  const isAdmin = pathname.startsWith('/habits');
  const isRewardsPage = pathname.startsWith('/rewards');
  const showReorder = !isAdmin && !isRewardsPage;

  const pageTitle = pathname === '/habits/changelog' ? 'Change Log'
    : pathname.startsWith('/habits') ? 'Habits'
    : pathname.startsWith('/weekly') ? 'Weekly View'
    : pathname.startsWith('/yearly/wow') ? 'Week-over-Week'
    : pathname.startsWith('/yearly/timing') ? 'Timing Report'
    : pathname.startsWith('/yearly/duration') ? 'Duration Report'
    : pathname === '/rewards/manage' ? 'Manage Rewards'
    : pathname.startsWith('/rewards') ? 'Rewards'
    : '';

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-violet-100/80 shadow-[0_1px_12px_rgba(124,58,237,0.06)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left: nav icons */}
          <NavLinks />

          {/* Center: date nav (home) or page title (other pages) */}
          <div className="flex items-center justify-center flex-1">
            {isHome ? (
              <Suspense fallback={<div className="h-8 w-[160px] rounded-full bg-violet-100 animate-pulse" />}>
                <DateNav />
              </Suspense>
            ) : (
              <span className="text-sm font-semibold text-violet-800">{pageTitle}</span>
            )}
          </div>

          {/* Right: reorder + sync indicator */}
          <div className="flex items-center gap-0.5">
            {showReorder && (
              <button
                onClick={() => setReorderOpen(true)}
                className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
                title="Reorder habits"
                aria-label="Reorder habits"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            )}
            <SyncIndicator />
          </div>
        </div>
      </header>

      {reorderOpen && <ReorderSheet onClose={() => setReorderOpen(false)} />}
    </>
  );
}
