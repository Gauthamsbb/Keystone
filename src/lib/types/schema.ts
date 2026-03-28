export type InputFieldType = 'text' | 'int' | 'duration' | 'time' | 'yes_no' | 'multi_select';

// Direction for completion limit thresholds:
// 'before'/'after' apply to time fields; 'above'/'below' apply to int/duration fields.
export type CompletionLimitDirection = 'before' | 'after' | 'above' | 'below';

export interface CompletionLimit {
  direction: CompletionLimitDirection;
  value: number; // time_mins for 'time'; duration_mins for 'duration'; raw int for 'int'
}

export interface InputSchemaField {
  id: number;
  type: InputFieldType;
  label: string;
  is_archived?: boolean;
  options?: string[];            // multi_select: the available options list
  archived_options?: string[];   // multi_select: option values hidden from entry UI but preserved in data
  completion_options?: string[]; // multi_select completion field: which selections count as done
}

export type InputSchema = InputSchemaField[];

// One row in entry_values — each field gets its own typed row
export interface EntryValueRecord {
  field_id: number;
  text_value: string | null;
  int_value: number | null;
  duration_mins: number | null; // total minutes, e.g. 90 = 1:30
  time_mins: number | null;     // minutes since midnight, e.g. 510 = 8:30 AM
  boolean_value: boolean | null;
}

export interface EntryRecord {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  values: EntryValueRecord[];
}

export interface EntryWithHabit extends EntryRecord {
  habit: HabitRecord;
}

export interface HabitRecord {
  id: string;
  name: string;
  subtitle: string | null;
  is_active: boolean;
  display_order: number;
  weekly_quota: number;
  input_schema: InputSchema;
  completion_field_id: number | null;
  completion_limit: CompletionLimit | null;
  timing_field_id: number | null;
}

// Input to save a single field value — raw from the form
export interface FieldValueInput {
  field_id: number;
  field_type: InputFieldType;
  // raw_value is the display-layer value (string "01:30" for duration, number for int, etc.)
  raw_value: string | number | boolean | null | undefined;
}

export interface UpsertEntryInput {
  habit_id: string;
  date: string; // YYYY-MM-DD
  field_values: FieldValueInput[];
}

export interface CreateHabitInput {
  name: string;
  subtitle?: string | null;
  is_active: boolean;
  weekly_quota: number;
  input_schema: InputSchema;
  completion_field_id: number | null;
  completion_limit: CompletionLimit | null;
  timing_field_id: number | null;
}

export interface UpdateHabitInput extends Partial<CreateHabitInput> {
  id: string;
}

// Client-side form state: field_id (as string key) → display value
export type FormState = Record<string, string | number | boolean | null>;

export interface HabitSectionRecord {
  id: string;
  title: string;
  subtitle: string | null;
  display_order: number;
}

export type HabitListItem =
  | { type: 'habit'; data: HabitRecord }
  | { type: 'section'; data: HabitSectionRecord };

// ── Rewards ───────────────────────────────────────────────────────────────────

export interface BucketMilestoneRecord {
  id: string;
  bucket_id: string;
  streak_target: number;
  reward: string;
  display_order: number;
}

export interface BucketHabitRecord {
  id: string;
  bucket_id: string;
  habit_id: string;
  habit: HabitRecord;
}

export interface RewardBucketRecord {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  habits: BucketHabitRecord[];
  milestones: BucketMilestoneRecord[];
}

export interface BucketWithStreaks extends RewardBucketRecord {
  // habitId → { count, isDimmed }
  habitStreaks: Record<string, { count: number; isDimmed: boolean }>;
}
