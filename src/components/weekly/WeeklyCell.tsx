import type { EntryRecord, HabitRecord } from '@/lib/types/schema';
import { formatDuration, minsToTimeDisplay } from '@/lib/utils/progress';

interface WeeklyCellProps {
  habit: HabitRecord;
  entry: EntryRecord | undefined;
  isExpanded: boolean;
  onClick: () => void;
}

function primaryDisplay(habit: HabitRecord, entry: EntryRecord): string {
  // Use completion field if set, otherwise first field
  const fieldId = habit.completion_field_id ?? habit.input_schema[0]?.id;
  const field = habit.input_schema.find((f) => f.id === fieldId) ?? habit.input_schema[0];
  if (!field) return '✓';

  const val = entry.values.find((v) => v.field_id === field.id);
  if (!val) return '–';

  switch (field.type) {
    case 'yes_no':
      return val.boolean_value ? '✓' : '–';
    case 'int':
      return val.int_value !== null ? String(val.int_value) : '–';
    case 'duration':
      return val.duration_mins !== null ? formatDuration(val.duration_mins) : '–';
    case 'time':
      return val.time_mins !== null ? minsToTimeDisplay(val.time_mins) : '–';
    case 'text': {
      const s = val.text_value ?? '';
      return s ? (s.length > 8 ? s.slice(0, 7) + '…' : s) : '–';
    }
    case 'multi_select': {
      if (!val.text_value) return '–';
      try {
        const arr = JSON.parse(val.text_value) as string[];
        if (!Array.isArray(arr) || arr.length === 0) return '–';
        const joined = arr.join(', ');
        return joined.length > 10 ? joined.slice(0, 9) + '…' : joined;
      } catch { return '–'; }
    }
    default:
      return '✓';
  }
}

export function WeeklyCell({ habit, entry, isExpanded, onClick }: WeeklyCellProps) {
  const hasEntry = !!entry;
  const display = entry ? primaryDisplay(habit, entry) : '–';

  return (
    <td
      onClick={onClick}
      className={`text-center py-2 px-1 text-xs cursor-pointer select-none rounded transition-colors ${
        hasEntry
          ? isExpanded
            ? 'text-emerald-700 font-semibold bg-emerald-100'
            : 'text-emerald-600 font-medium hover:bg-emerald-50'
          : 'text-violet-200 hover:bg-violet-50'
      }`}
    >
      {display}
    </td>
  );
}

interface ExpandedRowProps {
  habit: HabitRecord;
  entry: EntryRecord;
  colSpan: number;
}

function fieldDisplay(entry: EntryRecord, field: HabitRecord['input_schema'][0]): string {
  const val = entry.values.find((v) => v.field_id === field.id);
  if (!val) return '–';

  switch (field.type) {
    case 'yes_no':       return val.boolean_value ? 'Yes' : 'No';
    case 'int':          return val.int_value !== null ? String(val.int_value) : '–';
    case 'duration':     return val.duration_mins !== null ? formatDuration(val.duration_mins) : '–';
    case 'time':         return val.time_mins !== null ? minsToTimeDisplay(val.time_mins) : '–';
    case 'text':         return val.text_value ?? '–';
    case 'multi_select': {
      if (!val.text_value) return '–';
      try {
        const arr = JSON.parse(val.text_value) as string[];
        return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '–';
      } catch { return '–'; }
    }
    default:             return '–';
  }
}

export function ExpandedRow({ habit, entry, colSpan }: ExpandedRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 pb-2">
        <div className="flex flex-wrap gap-2 bg-violet-50 rounded-lg px-3 py-2">
          {habit.input_schema.filter((f) => !f.is_archived).map((field) => (
            <span key={field.id} className="text-xs bg-white border border-violet-200 rounded px-2 py-0.5 text-[#1E1B4B]">
              <span className="text-violet-400">{field.label}:</span> {fieldDisplay(entry, field)}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

export { fieldDisplay };
