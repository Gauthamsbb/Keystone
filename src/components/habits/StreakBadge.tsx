interface StreakBadgeProps {
  count: number;
  isDimmed: boolean;
  /** 'light' for light backgrounds (main page, weekly); 'dark' for dark backgrounds (WoW spreadsheet) */
  variant?: 'light' | 'dark';
}

export function StreakBadge({ count, isDimmed, variant = 'light' }: StreakBadgeProps) {
  if (count === 0) return null;

  const title = isDimmed
    ? `${count} week streak — quota not fully met last week`
    : `${count} week streak 🔥`;

  if (variant === 'dark') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 transition-opacity ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
        title={title}
      >
        <span className={`text-[13px] leading-none ${isDimmed ? 'grayscale' : ''}`}>🔥</span>
        <span className={`text-[11px] font-bold tabular-nums ${isDimmed ? 'text-gray-500' : 'text-amber-300'}`}>
          {count}
        </span>
      </span>
    );
  }

  if (isDimmed) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200"
        title={title}
      >
        <span className="text-sm leading-none grayscale opacity-50">🔥</span>
        <span className="text-xs font-semibold text-gray-400 tabular-nums">{count}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.55)]"
      title={title}
    >
      <span className="text-sm leading-none">🔥</span>
      <span className="text-xs font-bold text-white tabular-nums">{count}</span>
    </span>
  );
}
