'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertEntry, getHabitHistory } from '@/lib/actions/entries';
import { updateHabit } from '@/lib/actions/habits';
import { debounce } from '@/lib/utils/debounce';
import {
  getISOWeekStart,
  getWeeklyCompletions,
  getTypedValue,
} from '@/lib/utils/progress';
import type { EntryRecord, FieldValueInput, FormState, HabitRecord, InputSchema } from '@/lib/types/schema';
import { DynamicField } from './DynamicField';
import { WeeklyBars } from './WeeklyBars';
import { StreakBadge } from './StreakBadge';

interface HabitCardProps {
  habit: HabitRecord;
  existingEntry: EntryRecord | undefined;
  selectedDate: string;
  streakCount: number;
  streakDimmed: boolean;
}

// Field types that save immediately on change (no debounce)
const IMMEDIATE_TYPES = new Set(['yes_no', 'int']);

// Initialize form state from a saved entry
function entryToFormState(entry: EntryRecord | undefined, habit: HabitRecord): FormState {
  if (!entry) return {};
  return entry.values.reduce<FormState>((acc, val) => {
    const field = habit.input_schema.find((f) => f.id === val.field_id);
    if (field) acc[String(field.id)] = getTypedValue(val, field.type);
    return acc;
  }, {});
}

export function HabitCard({ habit, existingEntry, selectedDate, streakCount, streakDimmed }: HabitCardProps) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<FormState>(() =>
    entryToFormState(existingEntry, habit)
  );

  // Local copy of input_schema so inline option additions are reflected immediately
  const [localSchema, setLocalSchema] = useState<InputSchema>(habit.input_schema);

  // Reset form when fresh entry data arrives (e.g. after a save refetch),
  // but only if the user has no unsaved changes in flight.
  const pendingStateRef = useRef<FormState | null>(null);

  useEffect(() => {
    if (pendingStateRef.current === null) {
      setFormState(entryToFormState(existingEntry, habit));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEntry]);

  const { data: history = [] } = useQuery({
    queryKey: ['history', habit.id],
    queryFn: () => getHabitHistory(habit.id, 12),
    staleTime: 60_000,
  });

  const selectedDateObj = new Date(`${selectedDate}T00:00:00.000Z`);
  const weekStart = getISOWeekStart(selectedDateObj);
  const completionsThisWeek = getWeeklyCompletions(history, habit, weekStart);

  const saveMutation = useMutation({
    mutationFn: (state: FormState) => {
      const field_values: FieldValueInput[] = habit.input_schema.map((field) => ({
        field_id: field.id,
        field_type: field.type,
        raw_value: String(field.id) in state ? state[String(field.id)] : undefined,
      }));
      return upsertEntry({ habit_id: habit.id, date: selectedDate, field_values });
    },
    onSuccess: () => {
      pendingStateRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['entries', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['history', habit.id] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
    },
  });

  const debouncedSave = useMemo(
    () => debounce((state: FormState) => saveMutation.mutate(state), 600),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habit.id, selectedDate]
  );

  function handleAddOption(fieldId: number, newOption: string) {
    const updatedSchema = localSchema.map((f) =>
      f.id === fieldId ? { ...f, options: [...(f.options ?? []), newOption] } : f
    );
    setLocalSchema(updatedSchema);
    updateHabit({ id: habit.id, input_schema: updatedSchema });
  }

  function handleChange(fieldId: number, value: string | number | boolean | null) {
    const next = { ...formState, [String(fieldId)]: value };
    setFormState(next);
    const field = habit.input_schema.find((f) => f.id === fieldId);
    if (field && IMMEDIATE_TYPES.has(field.type)) {
      // Immediate fields save right away; no pending debounce to track
      saveMutation.mutate(next);
    } else {
      // Mark state as pending until the debounce fires and saves
      pendingStateRef.current = next;
      debouncedSave(next);
    }
  }

  // On unmount, flush any pending debounced save directly via the server action
  // so that navigating away mid-type doesn't silently discard unsaved data.
  useEffect(() => {
    return () => {
      const pending = pendingStateRef.current;
      if (pending !== null) {
        debouncedSave.cancel();
        const field_values: FieldValueInput[] = habit.input_schema.map((field) => ({
          field_id: field.id,
          field_type: field.type,
          raw_value: String(field.id) in pending ? pending[String(field.id)] : undefined,
        }));
        upsertEntry({ habit_id: habit.id, date: selectedDate, field_values })
          .then(() => queryClient.invalidateQueries({ queryKey: ['entries', selectedDate] }))
          .catch(() => { /* best-effort */ });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isComplete = completionsThisWeek >= habit.weekly_quota;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${
      isComplete
        ? 'border-emerald-200 shadow-[0_2px_16px_rgba(5,150,105,0.12)]'
        : 'border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.07)]'
    }`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isComplete
          ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/40 border-emerald-200'
          : 'bg-gradient-to-r from-violet-50 to-violet-50/30 border-violet-100'
      }`}>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E1B4B] text-[15px] leading-tight">{habit.name}</span>
            {isComplete && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          {habit.subtitle && (
            <span className={`text-[13px] font-semibold leading-tight ${
              isComplete ? 'text-emerald-700/80' : 'text-violet-600/80'
            }`}>
              {habit.subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <WeeklyBars quota={habit.weekly_quota} completions={completionsThisWeek} />
          <StreakBadge count={streakCount} isDimmed={streakDimmed} />
          {saveMutation.isPending && (
            <span className="text-xs text-violet-400 font-medium">saving…</span>
          )}
        </div>
      </div>

      {/* Input fields */}
      <div className="px-4 py-3.5 flex flex-col gap-3.5">
        {localSchema.filter((f) => !f.is_archived).map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            value={formState[String(field.id)] ?? null}
            onChange={(val) => handleChange(field.id, val)}
            onAddOption={field.type === 'multi_select' ? (opt) => handleAddOption(field.id, opt) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
