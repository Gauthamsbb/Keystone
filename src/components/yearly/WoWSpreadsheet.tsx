'use client';

import { useMemo } from 'react';
import type { EntryRecord, HabitRecord } from '@/lib/types/schema';
import { getWeekCompletions, getISOWeekNumber } from '@/lib/utils/progress';
import { StreakBadge } from '@/components/habits/StreakBadge';

interface StreakData {
  habitId: string;
  count: number;
  isDimmed: boolean;
}

interface WoWSpreadsheetProps {
  habits: HabitRecord[];
  entries: EntryRecord[];
  year: number;
  streaks: StreakData[];
}

// 13 groups of 4 weeks = 52 weeks
const GROUPS = Array.from({ length: 13 }, (_, gi) =>
  Array.from({ length: 4 }, (_, wi) => gi * 4 + wi + 1)
);

function isoWeekMonday(year: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const weekMonday = new Date(week1Monday);
  weekMonday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return weekMonday;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function groupLabel(year: number, groupIdx: number): string {
  const firstWeek = groupIdx * 4 + 1;
  const monday = isoWeekMonday(year, firstWeek);
  return MONTH_SHORT[monday.getUTCMonth()];
}

function cellStyle(completions: number, quota: number, partial: number, isCurrent: boolean): string {
  const ring = isCurrent ? ' ring-2 ring-violet-500 ring-inset' : '';
  if (completions === 0) return `bg-gray-100 text-gray-400${ring}`;
  if (completions >= quota) return `bg-emerald-400 text-white${ring}`;
  if (completions >= partial) return `bg-amber-300 text-amber-900${ring}`;
  return `bg-amber-100 text-amber-700${ring}`;
}

export function WoWSpreadsheet({ habits, entries, year, streaks }: WoWSpreadsheetProps) {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentISOWeek = getISOWeekNumber(today.toISOString().split('T')[0]);

  const streakMap = useMemo(
    () => Object.fromEntries(streaks.map((s) => [s.habitId, s])),
    [streaks]
  );

  return (
    <div className="rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(124,58,237,0.08)] border border-violet-100 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-max">

          {/* ── Month group header row ──────────────────────────── */}
          <div className="flex items-end bg-violet-50 border-b border-violet-100">
            <div className="w-44 shrink-0 px-3 py-1.5">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Habit</span>
            </div>
            {GROUPS.map((group, gi) => (
              <div key={gi} className={`flex flex-col items-center ${gi < 12 ? 'mr-2' : ''}`}>
                <span className="text-[9px] text-violet-400 font-medium mb-0.5 w-full text-center px-0.5">
                  {groupLabel(year, gi)}
                </span>
                <div className="flex gap-0.5">
                  {group.map((wk) => (
                    <div
                      key={wk}
                      className={`w-5 h-4 flex items-center justify-center text-[8px] font-medium rounded-sm
                        ${year === currentYear && wk === currentISOWeek
                          ? 'bg-violet-500 text-white'
                          : 'text-violet-300'
                        }`}
                    >
                      {wk}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Habit rows ─────────────────────────────────────── */}
          {habits.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No active habits.</div>
          ) : (
            habits.map((habit, hi) => {
              const partial = Math.ceil(habit.weekly_quota / 2);
              const streak = streakMap[habit.id];

              return (
                <div
                  key={habit.id}
                  className={`flex items-center min-h-[36px] border-b border-violet-50 hover:bg-violet-50/40 transition-colors
                    ${hi % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'}`}
                >
                  {/* Sticky left column */}
                  <div className={`w-44 shrink-0 sticky left-0 z-10 flex flex-col justify-center px-3 py-1.5 gap-0.5 border-r border-violet-100
                    ${hi % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}`}>
                    <span className="text-sm font-semibold text-[#1E1B4B] truncate leading-tight">{habit.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-violet-400">quota {habit.weekly_quota}/wk</span>
                      {streak && (
                        <StreakBadge count={streak.count} isDimmed={streak.isDimmed} variant="light" />
                      )}
                    </div>
                  </div>

                  {/* Week cells grouped by 4 */}
                  {GROUPS.map((group, gi) => (
                    <div key={gi} className={`flex gap-0.5 py-2 ${gi < 12 ? 'mr-2' : ''}`}>
                      {group.map((wk) => {
                        const count = getWeekCompletions(entries, habit, year, wk);
                        const isCurrent = year === currentYear && wk === currentISOWeek;
                        const cls = cellStyle(count, habit.weekly_quota, partial, isCurrent);
                        return (
                          <div
                            key={wk}
                            className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] transition-colors font-medium ${cls}`}
                            title={`Wk ${wk}: ${count}/${habit.weekly_quota}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* ── Legend ─────────────────────────────────────────── */}
          <div className="flex items-center gap-4 px-3 py-2 bg-violet-50 border-t border-violet-100">
            <span className="text-[10px] text-violet-400 font-medium uppercase tracking-wider">Legend</span>
            {[
              { bg: 'bg-gray-100',    label: 'No entries' },
              { bg: 'bg-amber-100',   label: 'Below partial' },
              { bg: 'bg-amber-300',   label: 'Partial' },
              { bg: 'bg-emerald-400', label: 'Full quota ✓' },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${bg}`} />
                <span className="text-[10px] text-violet-400">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm ring-2 ring-violet-500" />
              <span className="text-[10px] text-violet-400">Current week</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
