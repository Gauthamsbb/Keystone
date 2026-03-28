'use client';

import { useState } from 'react';
import type { EntryRecord, HabitRecord } from '@/lib/types/schema';
import { getWeeklyCompletions } from '@/lib/utils/progress';
import { WeeklyCell, ExpandedRow, fieldDisplay } from './WeeklyCell';
import { StreakBadge } from '@/components/habits/StreakBadge';

interface StreakData {
  habitId: string;
  count: number;
  isDimmed: boolean;
}

interface WeeklyGridProps {
  habits: HabitRecord[];
  weekStart: string;
  entriesByHabitAndDate: Record<string, Record<string, EntryRecord>>;
  streaks: StreakData[];
}

function getDaysOfWeek(weekStartStr: string): string[] {
  const days: string[] = [];
  const start = new Date(`${weekStartStr}T00:00:00.000Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---- Advanced view helpers ----

// Text note icon SVG
function TextNoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="w-3 h-3"
    >
      <path d="M3 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3Zm1 3h8v1H4V5Zm0 2.5h8v1H4v-1Zm0 2.5h5v1H4v-1Z" />
    </svg>
  );
}

interface AdvancedViewProps {
  habits: HabitRecord[];
  days: string[];
  entriesByHabitAndDate: Record<string, Record<string, EntryRecord>>;
  streaks: Record<string, StreakData>;
  weekStart: string;
}

function AdvancedView({ habits, days, entriesByHabitAndDate, streaks, weekStart }: AdvancedViewProps) {
  const [expandedTextKey, setExpandedTextKey] = useState<string | null>(null);

  function toggleText(habitId: string, fieldId: number, dateStr: string) {
    const key = `${habitId}-${fieldId}-${dateStr}`;
    setExpandedTextKey((prev) => (prev === key ? null : key));
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left text-xs font-medium text-violet-400 py-2 pr-2 min-w-[120px]"></th>
          {DAY_LABELS.map((d) => (
            <th key={d} className="text-center text-xs font-medium text-violet-400 py-2 px-1 w-10">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {habits.map((habit, habitIdx) => {
          const habitEntries = entriesByHabitAndDate[habit.id] ?? {};
          const allEntries: EntryRecord[] = Object.values(habitEntries);
          const completions = getWeeklyCompletions(allEntries, habit, new Date(`${weekStart}T00:00:00.000Z`));
          const metQuota = completions >= habit.weekly_quota;
          const streak = streaks[habit.id];
          const activeFields = habit.input_schema.filter((f) => !f.is_archived);

          const rows = [];

          // Habit header row
          rows.push(
            <tr key={`${habit.id}-header`}>
              <td
                colSpan={8}
                className={`px-2 pb-1 ${habitIdx > 0 ? 'pt-5 border-t-2 border-violet-100' : 'pt-2'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1E1B4B]">{habit.name}</span>
                  {streak && streak.count > 0 && (
                    <StreakBadge count={streak.count} isDimmed={streak.isDimmed} />
                  )}
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    metQuota
                      ? 'bg-emerald-50 text-emerald-600'
                      : completions / habit.weekly_quota >= 0.5
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-violet-50 text-violet-300'
                  }`}>
                    {completions}/{habit.weekly_quota}
                  </span>
                </div>
              </td>
            </tr>
          );

          // One row per active field
          for (const field of activeFields) {
            const isCompletionField = habit.completion_field_id === field.id;

            rows.push(
              <tr
                key={`${habit.id}-field-${field.id}`}
                className={`border-t ${isCompletionField ? 'border-violet-100 bg-violet-50/40' : 'border-violet-50'}`}
              >
                <td className="py-2 pr-3 pl-2">
                  <span className={`text-[11px] truncate max-w-[110px] block ${
                    isCompletionField ? 'font-bold text-violet-600' : 'font-medium text-violet-400'
                  }`}>
                    {field.label}
                  </span>
                </td>
                {days.map((dateStr) => {
                  const entry = habitEntries[dateStr];
                  if (!entry) {
                    return (
                      <td key={dateStr} className="text-center py-2 px-1 text-xs text-violet-200">
                        –
                      </td>
                    );
                  }

                  if (field.type === 'text') {
                    const val = entry.values.find((v) => v.field_id === field.id);
                    const hasText = !!(val?.text_value);
                    const textKey = `${habit.id}-${field.id}-${dateStr}`;
                    const isExpanded = expandedTextKey === textKey;

                    return (
                      <td key={dateStr} className="text-center py-2 px-1">
                        {hasText ? (
                          <button
                            type="button"
                            onClick={() => toggleText(habit.id, field.id, dateStr)}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-colors ${
                              isExpanded
                                ? 'text-violet-700 bg-violet-100 border-violet-300'
                                : 'text-violet-400 bg-white border-violet-200 hover:bg-violet-50 hover:text-violet-600'
                            }`}
                            title="View text"
                          >
                            <TextNoteIcon />
                          </button>
                        ) : (
                          <span className="text-xs text-violet-200">–</span>
                        )}
                      </td>
                    );
                  }

                  const display = fieldDisplay(entry, field);
                  const isEmpty = display === '–';
                  return (
                    <td key={dateStr} className="text-center py-2 px-1">
                      {isEmpty ? (
                        <span className="text-xs text-violet-200">–</span>
                      ) : (
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md ${
                          isCompletionField
                            ? 'font-bold text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'font-medium text-gray-600 bg-white border border-gray-200'
                        }`}>
                          {display}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );

            // Text expanded rows
            if (field.type === 'text') {
              for (const dateStr of days) {
                const textKey = `${habit.id}-${field.id}-${dateStr}`;
                if (expandedTextKey !== textKey) continue;
                const entry = habitEntries[dateStr];
                const val = entry?.values.find((v) => v.field_id === field.id);
                const text = val?.text_value ?? '';
                rows.push(
                  <tr key={`${textKey}-expanded`}>
                    <td colSpan={8} className="px-2 pb-2">
                      <div className="bg-white border border-violet-200 rounded-lg px-3 py-2.5 text-xs text-[#1E1B4B] whitespace-pre-wrap leading-relaxed shadow-sm">
                        <span className="text-violet-400 font-semibold mr-1.5">{field.label}</span>
                        {text}
                      </div>
                    </td>
                  </tr>
                );
              }
            }
          }

          return rows;
        })}
      </tbody>
    </table>
  );
}

// ---- Main component ----

export function WeeklyGrid({ habits, weekStart, entriesByHabitAndDate, streaks }: WeeklyGridProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const days = getDaysOfWeek(weekStart);
  const streakMap = Object.fromEntries(streaks.map((s) => [s.habitId, s]));

  function toggleExpand(habitId: string, dateStr: string) {
    const key = `${habitId}-${dateStr}`;
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  if (habits.length === 0) {
    return (
      <p className="text-center text-violet-400 py-12 bg-white rounded-2xl border border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.06)]">
        No active habits to display.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.07)] p-4 overflow-x-auto">
      {/* View toggle */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setIsAdvanced((v) => !v)}
          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
            isAdvanced
              ? 'bg-violet-100 text-violet-700 border-violet-200'
              : 'bg-white text-violet-400 border-violet-100 hover:bg-violet-50'
          }`}
        >
          {isAdvanced ? 'Simple view' : 'Advanced view'}
        </button>
      </div>

      {isAdvanced ? (
        <AdvancedView
          habits={habits}
          days={days}
          entriesByHabitAndDate={entriesByHabitAndDate}
          streaks={streakMap}
          weekStart={weekStart}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-violet-400 py-2 pr-2 min-w-[120px]">Habit</th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="text-center text-xs font-medium text-violet-400 py-2 px-1 w-10">
                  {d}
                </th>
              ))}
              <th className="text-center text-xs font-medium text-violet-400 py-2 px-1 min-w-[48px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const habitEntries = entriesByHabitAndDate[habit.id] ?? {};
              const allEntries: EntryRecord[] = Object.values(habitEntries);
              const completions = getWeeklyCompletions(allEntries, habit, new Date(`${weekStart}T00:00:00.000Z`));
              const metQuota = completions >= habit.weekly_quota;
              const streak = streakMap[habit.id];

              const rows = [];

              // Main row
              rows.push(
                <tr key={habit.id} className="border-t border-violet-50">
                  <td className="py-2 pr-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[110px]">
                        {habit.name}
                      </span>
                      {streak && streak.count > 0 && (
                        <StreakBadge count={streak.count} isDimmed={streak.isDimmed} />
                      )}
                    </div>
                  </td>
                  {days.map((dateStr) => {
                    const entry = habitEntries[dateStr];
                    const key = `${habit.id}-${dateStr}`;
                    return (
                      <WeeklyCell
                        key={dateStr}
                        habit={habit}
                        entry={entry}
                        isExpanded={expandedKey === key}
                        onClick={() => entry && toggleExpand(habit.id, dateStr)}
                      />
                    );
                  })}
                  <td className={`text-center text-xs font-semibold px-1 ${
                    metQuota ? 'text-emerald-600' : completions / habit.weekly_quota >= 0.5 ? 'text-amber-500' : 'text-violet-300'
                  }`}>
                    {completions}/{habit.weekly_quota}
                  </td>
                </tr>
              );

              // Expanded detail row
              const expandedDateStr = expandedKey?.startsWith(habit.id)
                ? expandedKey.replace(`${habit.id}-`, '')
                : null;
              if (expandedDateStr && habitEntries[expandedDateStr]) {
                rows.push(
                  <ExpandedRow
                    key={`${habit.id}-expanded`}
                    habit={habit}
                    entry={habitEntries[expandedDateStr]}
                    colSpan={9}
                  />
                );
              }

              return rows;
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
