'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { SyncIndicator } from './SyncIndicator';
import { ReorderSheet } from './habits/ReorderSheet';
import { signOut } from '@/lib/actions/auth';

// ── Date nav with calendar picker ────────────────────────────────────────────

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
    router.push(`/?date=${d.toISOString().split('T')[0]}`);
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

      {/* Clicking the pill opens the native date picker */}
      <div className="relative">
        <span className="text-sm font-semibold text-[#1E1B4B] bg-violet-50 border border-violet-200 rounded-full px-3 py-1 min-w-[120px] text-center block pointer-events-none select-none">
          {formatted}
        </span>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { if (e.target.value) router.push(`/?date=${e.target.value}`); }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Pick a date"
        />
      </div>

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

// ── Hamburger nav drawer ──────────────────────────────────────────────────────

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const NAV_ITEMS = [
  { label: 'Today', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Weekly', href: '/weekly', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Year — Week over Week', href: '/yearly/wow', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Year — Timing', href: '/yearly/timing', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Year — Duration', href: '/yearly/duration', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { label: 'Rewards', href: '/rewards', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
] as const;

const HABIT_ITEMS = [
  { label: 'Manage Habits', href: '/habits', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Change Log', href: '/habits/changelog', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
] as const;

function NavDrawer({ open, onClose, isSuperAdmin }: NavDrawerProps) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl animate-[slideInLeft_180ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-100">
          <span className="text-sm font-bold text-[#1E1B4B] tracking-wide uppercase">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {/* Main pages */}
          <div className="px-3 pb-1">
            <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Views</p>
            {NAV_ITEMS.map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-violet-100 text-violet-800'
                    : 'text-gray-700 hover:bg-violet-50 hover:text-violet-800'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {label}
              </Link>
            ))}
          </div>

          <div className="mx-3 my-2 border-t border-violet-100" />

          {/* Habits section */}
          <div className="px-3 pb-1">
            <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Habits</p>
            {HABIT_ITEMS.map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-violet-100 text-violet-800'
                    : 'text-gray-700 hover:bg-violet-50 hover:text-violet-800'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {label}
              </Link>
            ))}
          </div>

          {/* Admin (super_admin only) */}
          {isSuperAdmin && (
            <>
              <div className="mx-3 my-2 border-t border-violet-100" />
              <div className="px-3 pb-1">
                <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Admin</p>
                <a
                  href="/admin"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-violet-100 text-violet-800'
                      : 'text-gray-700 hover:bg-violet-50 hover:text-violet-800'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Super Admin
                </a>
              </div>
            </>
          )}
        </nav>

        {/* Sign out at the bottom */}
        <div className="border-t border-violet-100 px-4 py-4">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

// ── Main header ───────────────────────────────────────────────────────────────

export function Header({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [reorderOpen, setReorderOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = !pathname.startsWith('/habits') && !pathname.startsWith('/weekly') && !pathname.startsWith('/yearly') && !pathname.startsWith('/rewards') && !pathname.startsWith('/admin');
  const isRewardsPage = pathname.startsWith('/rewards');
  const isHabitsPage = pathname.startsWith('/habits');
  const showReorder = !isHabitsPage && !isRewardsPage;
  const isSuperAdmin = userRole === 'super_admin';

  const pageTitle = pathname === '/habits/changelog' ? 'Change Log'
    : pathname.startsWith('/habits') ? 'Habits'
    : pathname.startsWith('/weekly') ? 'Weekly View'
    : pathname.startsWith('/yearly/wow') ? 'Week-over-Week'
    : pathname.startsWith('/yearly/timing') ? 'Timing Report'
    : pathname.startsWith('/yearly/duration') ? 'Duration Report'
    : pathname === '/rewards/manage' ? 'Manage Rewards'
    : pathname.startsWith('/rewards') ? 'Rewards'
    : pathname.startsWith('/admin') ? 'Admin'
    : '';

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-violet-100/80 shadow-[0_1px_12px_rgba(124,58,237,0.06)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Left: hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Center: date picker (home) or page title */}
          <div className="flex items-center justify-center flex-1">
            {isHome ? (
              <Suspense fallback={<div className="h-8 w-[160px] rounded-full bg-violet-100 animate-pulse" />}>
                <DateNav />
              </Suspense>
            ) : (
              <span className="text-sm font-semibold text-violet-800">{pageTitle}</span>
            )}
          </div>

          {/* Right: reorder + sync only */}
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

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} isSuperAdmin={isSuperAdmin} />
      {reorderOpen && <ReorderSheet onClose={() => setReorderOpen(false)} />}
    </>
  );
}
