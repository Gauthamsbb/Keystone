'use client';

import { useMemo } from 'react';
import type { EntryRecord, HabitRecord } from '@/lib/types/schema';
import { buildDailyMap, getISOWeekNumber } from '@/lib/utils/progress';

interface StreakData {
  habitId: string;
  count: number;
  isDimmed: boolean;
}

interface DurationGridProps {
  habits: HabitRecord[];
  entries: EntryRecord[];
  year: number;
  streaks: StreakData[];
}

const GROUPS = Array.from({ length: 13 }, (_, gi) =>
  Array.from({ length: 4 }, (_, wi) => gi * 4 + wi + 1)
);

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoWeekMonday(year: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1);
  monday.setUTCDate(monday.getUTCDate() + (isoWeek - 1) * 7);
  return monday;
}

function groupLabel(year: number, groupIdx: number): string {
  const monday = isoWeekMonday(year, groupIdx * 4 + 1);
  return MONTH_SHORT[monday.getUTCMonth()];
}

function dateForDay(year: number, isoWeek: number, dayIndex: number): string {
  const monday = isoWeekMonday(year, isoWeek);
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

function durationCellStyle(mins: number | null): { bg: string; text: string } {
  if (mins === null || mins === 0) return { bg: 'bg-gray-100', text: 'text-gray-300' };
  if (mins <= 30)  return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (mins <= 60)  return { bg: 'bg-emerald-300', text: 'text-emerald-900' };
  if (mins <= 90)  return { bg: 'bg-emerald-500', text: 'text-white' };
  return               { bg: 'bg-emerald-700', text: 'text-white' };
}

// Short duration label: "45m" or "1:30"
function durShort(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}:${m.toString().padStart(2, '0')}`;
}

export function DurationGrid({ habits, entries, year, streaks }: DurationGridProps) {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentISOWeek = getISOWeekNumber(today.toISOString().split('T')[0]);
  const todayStr = today.toISOString().split('T')[0];

  const streakMap = useMemo(
    () => Object.fromEntries(streaks.map((s) => [s.habitId, s])),
    [streaks]
  );

  // Only habits that have a duration field as their completion field
  const durationHabits = habits.filter((h) => {
    if (!h.completion_field_id) return false;
    const field = h.input_schema.find((f) => f.id === h.completion_field_id);
    return field?.type === 'duration';
  });

  return (
    <div className="rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(124,58,237,0.08)] border border-violet-100 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-max">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-end bg-violet-50 border-b border-violet-100">
            <div className="w-24 shrink-0 px-3 py-1.5 sticky left-0 z-20 bg-violet-50">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Habit</span>
            </div>

            {GROUPS.map((group, gi) => (
              <div key={gi} className={`flex flex-col items-start ${gi < 12 ? 'mr-3' : ''}`}>
                <span className="text-[9px] text-violet-400 font-medium mb-0.5 pl-0.5">
                  {groupLabel(year, gi)}
                </span>
                <div className="flex gap-2">
                  {group.map((wk) => {
                    const isCurWk = year === currentYear && wk === currentISOWeek;
                    return (
                      <div key={wk} className="flex flex-col items-center">
                        <span className={`text-[8px] font-semibold mb-0.5 leading-none ${isCurWk ? 'text-violet-600' : 'text-violet-300'}`}>
                          W{wk}
                        </span>
                        <div className="flex gap-px">
                          {DAY_LETTERS.map((d, di) => (
                            <div
                              key={di}
                              className={`w-10 flex items-center justify-center text-[8px] font-medium
                                ${di >= 5 ? 'text-violet-300' : 'text-violet-400'}`}
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── Habit rows ─────────────────────────────────────── */}
          {durationHabits.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No habits with a Duration completion field configured.{' '}
              <span className="text-gray-400">Edit a habit and set a Duration field as the Completion field.</span>
            </div>
          ) : (
            durationHabits.map((habit, hi) => {
              const streak = streakMap[habit.id];
              const dailyMap = buildDailyMap(entries, habit.id);
              const durationFieldId = habit.completion_field_id!;
              const fieldLabel = habit.input_schema.find((f) => f.id === durationFieldId)?.label ?? 'Duration';

              return (
                <div
                  key={habit.id}
                  className={`flex items-center border-b border-violet-50 hover:bg-violet-50/40 transition-colors
                    ${hi % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'}`}
                >
                  {/* Sticky left column */}
                  <div
                    className={`w-24 shrink-0 sticky left-0 z-10 flex flex-col justify-center px-2 py-2 gap-0.5
                      border-r border-violet-100
                      ${hi % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}`}
                  >
                    <span className="text-xs font-semibold text-[#1E1B4B] leading-tight line-clamp-2">
                      {habit.name}
                    </span>
                    <span className="text-[10px] text-violet-400">{fieldLabel}</span>
                    {streak && streak.count > 0 && (
                      <span
                        className={`text-[10px] font-semibold ${streak.isDimmed ? 'opacity-40' : 'opacity-100'} text-amber-500`}
                        title={streak.isDimmed ? 'Streak at risk' : `${streak.count} week streak`}
                      >
                        🔥 {streak.count}
                      </span>
                    )}
                  </div>

                  {/* 13 month groups × 4 weeks × 7 days */}
                  {GROUPS.map((group, gi) => (
                    <div key={gi} className={`flex gap-2 py-1.5 ${gi < 12 ? 'mr-3' : ''}`}>
                      {group.map((wk) => {
                        const isCurWk = year === currentYear && wk === currentISOWeek;
                        return (
                          <div key={wk} className="flex gap-px">
                            {DAY_LETTERS.map((_, di) => {
                              const dateStr = dateForDay(year, wk, di);
                              const entry = dailyMap[dateStr];
                              const durationMins =
                                entry?.values.find((v) => v.field_id === durationFieldId)?.duration_mins ?? null;
                              const isToday = dateStr === todayStr;
                              const { bg, text } = durationCellStyle(durationMins);
                              const ring = isToday
                                ? 'ring-2 ring-violet-500 ring-inset'
                                : isCurWk
                                ? 'ring-1 ring-violet-300 ring-inset'
                                : '';

                              return (
                                <div
                                  key={di}
                                  className={`w-10 h-9 rounded-md flex items-center justify-center transition-colors ${bg} ${ring}`}
                                  title={`${dateStr}: ${durationMins ? durShort(durationMins) : 'no entry'}`}
                                >
                                  {durationMins !== null && durationMins > 0 && (
                                    <span className={`text-[8px] font-semibold leading-none ${text}`}>
                                      {durShort(durationMins)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
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
          <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-violet-50 border-t border-violet-100">
            <span className="text-[10px] text-violet-400 font-medium uppercase tracking-wider">Duration</span>
            {[
              { bg: 'bg-gray-100',      label: 'No entry' },
              { bg: 'bg-emerald-100',   label: '1–30 min' },
              { bg: 'bg-emerald-300',   label: '31–60 min' },
              { bg: 'bg-emerald-500',   label: '61–90 min' },
              { bg: 'bg-emerald-700',   label: '90+ min' },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${bg}`} />
                <span className="text-[10px] text-violet-400">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-md ring-2 ring-violet-500" />
              <span className="text-[10px] text-violet-400">Today</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
