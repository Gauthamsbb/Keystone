import type { EntryRecord, EntryValueRecord, HabitRecord, InputFieldType } from '@/lib/types/schema';

// ── Display helpers ───────────────────────────────────────────────────────────

export function minsToDisplay(totalMins: number): string {
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function minsToTimeDisplay(minsFromMidnight: number): string {
  const totalH = Math.floor(minsFromMidnight / 60);
  const m = minsFromMidnight % 60;
  const ampm = totalH >= 12 ? 'PM' : 'AM';
  const h12 = totalH % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDuration(totalMins: number): string {
  if (totalMins <= 0) return '0m';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

// Get the typed value from an EntryValueRecord for a given field type
export function getTypedValue(val: EntryValueRecord, type: InputFieldType): string | number | boolean | null {
  switch (type) {
    case 'text': return val.text_value;
    case 'int': return val.int_value;
    case 'duration': return val.duration_mins !== null ? minsToDisplay(val.duration_mins) : null;
    case 'time': return val.time_mins !== null ? minsToTimeInput(val.time_mins) : null;
    case 'yes_no': return val.boolean_value;
    case 'multi_select': return val.text_value; // JSON string of string[]
    default: return null;
  }
}

// Returns 24h "HH:MM" string for use in <input type="time">
export function minsToTimeInput(minsFromMidnight: number): string {
  const h = Math.floor(minsFromMidnight / 60).toString().padStart(2, '0');
  const m = (minsFromMidnight % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ── Completion logic ──────────────────────────────────────────────────────────

// Returns true if an entry counts as a "completion" for quota/streak purposes.
// Uses the habit's completion_field_id to evaluate.
// Falls back to "any entry exists = complete" if no completion_field_id is set.
// When completion_limit is set on a time/int/duration field, the value must satisfy
// the directional constraint (before/after for time; above/below for int/duration).
export function isEntryComplete(entry: EntryRecord, habit: HabitRecord): boolean {
  if (!habit.completion_field_id) return true;

  const val = entry.values.find((v) => v.field_id === habit.completion_field_id);
  if (!val) return false;

  const field = habit.input_schema.find((f) => f.id === habit.completion_field_id);
  if (!field) return false;

  const limit = habit.completion_limit;

  switch (field.type) {
    case 'yes_no':  return val.boolean_value === true;
    case 'text':    return !!val.text_value;
    case 'multi_select': {
      if (!val.text_value) return false;
      let selected: string[];
      try { selected = JSON.parse(val.text_value); } catch { return false; }
      if (!Array.isArray(selected) || selected.length === 0) return false;
      const compOpts = field.completion_options;
      if (compOpts && compOpts.length > 0) {
        return selected.some((s) => compOpts.includes(s));
      }
      return true;
    }
    case 'time': {
      if (val.time_mins === null) return false;
      if (!limit) return true;
      return limit.direction === 'before'
        ? val.time_mins < limit.value
        : val.time_mins > limit.value;
    }
    case 'int': {
      const n = val.int_value ?? 0;
      if (!limit) return n > 0;
      return limit.direction === 'above'
        ? n > limit.value
        : n > 0 && n < limit.value;
    }
    case 'duration': {
      const mins = val.duration_mins ?? 0;
      if (!limit) return mins > 0;
      return limit.direction === 'above'
        ? mins > limit.value
        : mins > 0 && mins < limit.value;
    }
    default: return false;
  }
}

// ── ISO week helpers ──────────────────────────────────────────────────────────

export function getISOWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function getWeeklyCompletions(
  entries: EntryRecord[],
  habit: HabitRecord,
  weekStart: Date
): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const start = weekStart.toISOString().split('T')[0];
  const end = weekEnd.toISOString().split('T')[0];

  return entries
    .filter((e) => e.habit_id === habit.id && e.date >= start && e.date <= end)
    .filter((e) => isEntryComplete(e, habit))
    .length;
}


export function calculateStreak(
  habitHistory: EntryRecord[],
  habit: HabitRecord,
  today: Date
): { count: number; isDimmed: boolean } {
  const currentWeekStart = getISOWeekStart(today);
  let count = 0;
  let isDimmed = false;

  // Iterate forward (oldest → newest) so the running total naturally resets at 0
  // and weeks before a reset don't carry forward.
  for (let w = 52; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setUTCDate(currentWeekStart.getUTCDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const weekEntries = habitHistory.filter(
      (e) => e.habit_id === habit.id && e.date >= startStr && e.date <= endStr
    );
    const completions = weekEntries.filter((e) => isEntryComplete(e, habit)).length;
    // An entry with all-default values (int=0, toggle=off, blank fields) is treated
    // the same as not logging at all — only entries with at least one completion count.
    const hasEntries = completions > 0;
    const metQuota = completions >= habit.weekly_quota;

    if (w === 0) {
      // Current week is in progress — only apply rules if quota is already met or entries exist
      if (hasEntries && metQuota) {
        count += 1;
        isDimmed = false;
      } else if (hasEntries && !metQuota) {
        isDimmed = true; // partial in progress: dim but no penalty yet
      }
      // No entries yet: neutral, skip (week isn't over)
    } else if (hasEntries && metQuota) {
      count += 1;
      isDimmed = false;
    } else if (hasEntries && !metQuota) {
      // Partial: save the streak, dim the badge
      isDimmed = true;
    } else {
      // Empty past week: -2 with floor at 0
      count = Math.max(0, count - 2);
    }
  }

  return { count, isDimmed };
}

// ── Weekly summary label ──────────────────────────────────────────────────────

export function weeklyTotalLabel(habit: HabitRecord, entries: EntryRecord[]): string {
  const completions = getWeeklyCompletions(entries, habit, getISOWeekStart(new Date()));
  const compField = habit.input_schema.find((f) => f.id === habit.completion_field_id);

  if (compField?.type === 'duration') {
    const total = entries
      .filter((e) => e.habit_id === habit.id)
      .reduce((acc, e) => {
        const val = e.values.find((v) => v.field_id === compField.id);
        return acc + (val?.duration_mins ?? 0);
      }, 0);
    return `${formatDuration(total)} / quota ${habit.weekly_quota}`;
  }

  return `${completions} / ${habit.weekly_quota}`;
}

// ── Yearly / heatmap helpers ──────────────────────────────────────────────────

export function buildDailyMap(
  entries: EntryRecord[],
  habitId: string
): Record<string, EntryRecord> {
  return entries
    .filter((e) => e.habit_id === habitId)
    .reduce<Record<string, EntryRecord>>((acc, e) => {
      acc[e.date] = e;
      return acc;
    }, {});
}

export function getISOWeekNumber(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + (4 - (d.getUTCDay() || 7)));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeekCompletions(
  entries: EntryRecord[],
  habit: HabitRecord,
  year: number,
  isoWeek: number
): number {
  return entries
    .filter((e) => {
      if (e.habit_id !== habit.id) return false;
      if (!e.date.startsWith(String(year))) return false;
      return getISOWeekNumber(e.date) === isoWeek;
    })
    .filter((e) => isEntryComplete(e, habit))
    .length;
}

export function computeP90(entries: EntryRecord[], habit: HabitRecord): number {
  const compField = habit.input_schema.find((f) => f.id === habit.completion_field_id)
    ?? habit.input_schema[0];

  if (!compField || compField.type === 'yes_no' || compField.type === 'text' || compField.type === 'time' || compField.type === 'multi_select') return 1;

  const values = entries
    .filter((e) => e.habit_id === habit.id)
    .map((e) => {
      const val = e.values.find((v) => v.field_id === compField.id);
      if (!val) return 0;
      return compField.type === 'duration' ? (val.duration_mins ?? 0) : (val.int_value ?? 0);
    })
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return 1;
  return values[Math.min(Math.floor(values.length * 0.9), values.length - 1)];
}

export function cellIntensity(
  entry: EntryRecord | undefined,
  habit: HabitRecord,
  p90: number
): 0 | 1 | 2 | 3 | 4 {
  if (!entry) return 0;
  if (!isEntryComplete(entry, habit)) return 0;

  const compField = habit.input_schema.find((f) => f.id === habit.completion_field_id)
    ?? habit.input_schema[0];
  if (!compField) return entry ? 4 : 0;

  const val = entry.values.find((v) => v.field_id === compField.id);
  if (!val) return 0;

  switch (compField.type) {
    case 'yes_no': return val.boolean_value ? 4 : 0;
    case 'time': return val.time_mins !== null ? 4 : 0;
    case 'text': return val.text_value ? 4 : 0;
    case 'multi_select': {
      try {
        const arr = val.text_value ? JSON.parse(val.text_value) : [];
        return Array.isArray(arr) && arr.length > 0 ? 4 : 0;
      } catch { return 0; }
    }
    case 'duration': {
      const mins = val.duration_mins ?? 0;
      if (mins === 0) return 0;
      if (mins <= 30) return 1;
      if (mins <= 60) return 2;
      if (mins <= 90) return 3;
      return 4;
    }
    case 'int': {
      const n = val.int_value ?? 0;
      if (n === 0) return 0;
      const ratio = n / (p90 || 1);
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    }
    default: return 0;
  }
}

// ── Timing helpers ────────────────────────────────────────────────────────────

// Returns the average time_mins (minutes since midnight) for the timing_field_id
// across all entries in the given ISO week of the given year.
// Returns null if the habit has no timing_field_id or no entries with timing data.
export function getWeekTimingValue(
  entries: EntryRecord[],
  habit: HabitRecord,
  year: number,
  isoWeek: number
): number | null {
  if (!habit.timing_field_id) return null;

  const weekEntries = entries.filter((e) => {
    if (e.habit_id !== habit.id) return false;
    if (!e.date.startsWith(String(year))) return false;
    return getISOWeekNumber(e.date) === isoWeek;
  });

  const timeMins = weekEntries
    .map((e) => {
      const val = e.values.find((v) => v.field_id === habit.timing_field_id);
      return val?.time_mins ?? null;
    })
    .filter((v): v is number => v !== null);

  if (timeMins.length === 0) return null;
  return Math.round(timeMins.reduce((a, b) => a + b, 0) / timeMins.length);
}
