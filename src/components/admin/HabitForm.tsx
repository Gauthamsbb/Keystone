'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { createHabit, updateHabit } from '@/lib/actions/habits';
import type { CompletionLimit, CompletionLimitDirection, CreateHabitInput, HabitRecord, InputFieldType, InputSchemaField } from '@/lib/types/schema';
import { minsToTimeInput } from '@/lib/utils/progress';

const FIELD_TYPES: { value: InputFieldType; label: string; description: string }[] = [
  { value: 'yes_no',       label: 'Yes / No',     description: 'Binary toggle' },
  { value: 'int',          label: 'Int',           description: 'Counter with + / − arrows' },
  { value: 'duration',     label: 'Duration',      description: 'HH:MM — auto-calculates hours & mins' },
  { value: 'time',         label: 'Time',          description: 'HH:MM AM/PM time picker' },
  { value: 'text',         label: 'Text',          description: 'Free-text input' },
  { value: 'multi_select', label: 'Multi-select',  description: 'Choose one or more from a list of options' },
];

interface HabitFormProps {
  habit?: HabitRecord;
}

export function HabitForm({ habit }: HabitFormProps) {
  const router = useRouter();
  const isEdit = !!habit;

  const [name, setName] = useState(habit?.name ?? '');
  const [subtitle, setSubtitle] = useState(habit?.subtitle ?? '');
  const [quota, setQuota] = useState(String(habit?.weekly_quota ?? 3));
  const [isActive, setIsActive] = useState(habit?.is_active ?? true);
  const [fields, setFields] = useState<InputSchemaField[]>(
    habit?.input_schema.length
      ? habit.input_schema
      : [{ id: Math.ceil(Math.random() * 2_000_000_000), type: 'yes_no', label: '' }]
  );
  const [completionFieldId, setCompletionFieldId] = useState<number | null>(
    habit?.completion_field_id ?? null
  );
  const [completionLimit, setCompletionLimit] = useState<CompletionLimit | null>(
    habit?.completion_limit ?? null
  );
  const [timingFieldId, setTimingFieldId] = useState<number | null>(
    habit?.timing_field_id ?? null
  );
  const [errors, setErrors] = useState<string[]>([]);
  // Field deletion: null = idle, fieldId = first confirm shown, 'confirmed' = second confirm shown
  const [deleteConfirm, setDeleteConfirm] = useState<{ fieldId: number; step: 1 | 2 } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateHabitInput) =>
      isEdit ? updateHabit({ id: habit!.id, ...data }) : createHabit(data),
    onSuccess: () => router.push('/habits'),
  });

  function addField() {
    const newField: InputSchemaField = { id: Math.ceil(Math.random() * 2_000_000_000), type: 'yes_no', label: '' };
    setFields((prev) => [...prev, newField]);
  }

  function removeField(id: number) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (completionFieldId === id) { setCompletionFieldId(null); setCompletionLimit(null); }
    if (timingFieldId === id) setTimingFieldId(null);
  }

  function toggleArchiveField(id: number) {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const archiving = !field.is_archived;
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, is_archived: archiving } : f)));
    if (archiving) {
      if (completionFieldId === id) { setCompletionFieldId(null); setCompletionLimit(null); }
      if (timingFieldId === id) setTimingFieldId(null);
    }
  }

  function updateField(id: number, patch: Partial<InputSchemaField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Habit name is required.');
    const q = parseInt(quota, 10);
    if (isNaN(q) || q < 1 || q > 7) errs.push('Weekly quota must be between 1 and 7.');
    const activeFields = fields.filter((f) => !f.is_archived);
    if (activeFields.length === 0) errs.push('At least one active input field is required.');
    activeFields.forEach((f, i) => {
      if (!f.label.trim()) errs.push(`Field ${i + 1} needs a label.`);
      if (f.type === 'multi_select') {
        const activeOpts = (f.options ?? []).filter(
          (o) => o.trim() && !(f.archived_options ?? []).includes(o)
        );
        if (activeOpts.length === 0) {
          errs.push(`Field "${f.label.trim() || i + 1}" (Multi-select) needs at least one active option.`);
        }
      }
    });
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    // Filter blank options from multi_select fields before saving
    const cleanedFields = fields.map((f) => ({
      ...f,
      ...(f.type === 'multi_select' && {
        options: (f.options ?? []).filter((o) => o.trim()),
        archived_options: (f.archived_options ?? []).filter((o) => o.trim()),
      }),
    }));
    mutation.mutate({
      name: name.trim(),
      subtitle: subtitle.trim() || null,
      weekly_quota: parseInt(quota, 10),
      is_active: isActive,
      input_schema: cleanedFields,
      completion_field_id: completionFieldId,
      completion_limit: completionLimit,
      timing_field_id: timingFieldId,
    });
  }

  const labelledFields = fields.filter((f) => f.label.trim() && !f.is_archived);
  const completionField = fields.find((f) => f.id === completionFieldId) ?? null;
  const completionFieldType = completionField?.type ?? null;
  const limitApplies = completionFieldType === 'time' || completionFieldType === 'int' || completionFieldType === 'duration';
  const isMultiSelectCompletion = completionFieldType === 'multi_select';

  function handleCompletionFieldChange(id: number | null) {
    const newType = fields.find((f) => f.id === id)?.type ?? null;
    const newLimitApplies = newType === 'time' || newType === 'int' || newType === 'duration';
    setCompletionFieldId(id);
    if (!newLimitApplies) setCompletionLimit(null);
  }

  function handleLimitDirectionChange(direction: CompletionLimitDirection) {
    setCompletionLimit((prev) => prev ? { ...prev, direction } : { direction, value: 0 });
  }

  function handleLimitValueChange(raw: string) {
    if (completionFieldType === 'time') {
      // raw is "HH:MM" from <input type="time">
      const [h, m] = raw.split(':').map(Number);
      const mins = (h || 0) * 60 + (m || 0);
      setCompletionLimit((prev) => prev ? { ...prev, value: mins } : { direction: 'before', value: mins });
    } else {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0) {
        setCompletionLimit((prev) => prev ? { ...prev, value: n } : { direction: 'above', value: n });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Habit name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. Morning run"
        />
      </div>

      {/* Subtitle */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Subtitle
          <span className="ml-1 text-xs text-gray-400 font-normal">— shown under the habit name on the main page</span>
        </label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. Aim for 5km or more"
        />
      </div>

      {/* Weekly quota */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Weekly quota (1–7)</label>
        <input
          type="number"
          min={1}
          max={7}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-24"
        />
      </div>

      {/* Is active toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-medium text-gray-700">Active</span>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
            isActive ? 'bg-green-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* Input fields */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Input fields</span>
        <div className="flex flex-col gap-2 pr-11">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex flex-col gap-1">
              {/* Field row + archive button */}
              <div className="relative">
              <div
                className={`flex gap-2 items-center rounded-lg px-3 py-2 ${
                  field.is_archived ? 'bg-gray-50 opacity-60' : 'bg-gray-50'
                }`}
              >
                <span className="text-xs text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                {field.is_archived ? (
                  <span className="flex-1 text-sm text-gray-400 line-through min-w-0 truncate">
                    {field.label || `(${field.type})`}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-300 min-w-0"
                    placeholder="Label (e.g. Distance)"
                  />
                )}
                {!field.is_archived && (
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as InputFieldType })}
                    className="text-xs bg-white border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 shrink-0"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                )}
                {field.is_archived && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 shrink-0">
                    archived
                  </span>
                )}
                {/* Delete button — small and faint, requires 2-step confirm */}
                {!field.is_archived && (() => {
                  const isConfirm1 = deleteConfirm?.fieldId === field.id && deleteConfirm.step === 1;
                  const isConfirm2 = deleteConfirm?.fieldId === field.id && deleteConfirm.step === 2;
                  const onlyActiveField = fields.filter((f) => !f.is_archived).length === 1;

                  if (isConfirm2) {
                    return (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => setDeleteConfirm(null)} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        <button type="button" onClick={() => { removeField(field.id); setDeleteConfirm(null); }} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">Remove</button>
                      </div>
                    );
                  }
                  if (isConfirm1) {
                    return (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => setDeleteConfirm(null)} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        <button type="button" onClick={() => setDeleteConfirm({ fieldId: field.id, step: 2 })} className="text-[11px] text-red-400 hover:text-red-600 transition-colors">Sure?</button>
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => !onlyActiveField && setDeleteConfirm({ fieldId: field.id, step: 1 })}
                      disabled={onlyActiveField}
                      className="text-[11px] text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors shrink-0"
                      aria-label="Remove field"
                    >
                      ✕
                    </button>
                  );
                })()}
              </div>

              {/* Archive / unarchive — floating square button to the right */}
              <button
                type="button"
                onClick={() => toggleArchiveField(field.id)}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+6px)] w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                  field.is_archived
                    ? 'bg-blue-50 border-blue-200 text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500'
                }`}
                aria-label={field.is_archived ? 'Unarchive field' : 'Archive field'}
                title={field.is_archived ? 'Unarchive' : 'Archive'}
              >
                {field.is_archived ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
                  </svg>
                )}
              </button>
              </div>

              {/* Options editor — only for multi_select, only when not archived */}
              {!field.is_archived && field.type === 'multi_select' && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-3 py-2.5 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Options</span>
                  {/* Active options */}
                  {(field.options ?? []).filter((o) => !(field.archived_options ?? []).includes(o)).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: (field.options ?? []).map((o) => (o === opt ? e.target.value : o)),
                          })
                        }
                        placeholder="Option label"
                        className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      {/* Archive button */}
                      <button
                        type="button"
                        onClick={() =>
                          updateField(field.id, {
                            archived_options: [...(field.archived_options ?? []), opt],
                          })
                        }
                        className="text-[11px] text-gray-300 hover:text-amber-500 transition-colors shrink-0"
                        aria-label="Archive option"
                        title="Archive option"
                      >
                        ⊘
                      </button>
                      {/* Delete button — only for blank/new options */}
                      {!opt.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            updateField(field.id, {
                              options: (field.options ?? []).filter((o) => o !== opt),
                            })
                          }
                          className="text-[11px] text-gray-300 hover:text-red-400 transition-colors shrink-0"
                          aria-label="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Archived options */}
                  {(field.archived_options ?? []).length > 0 && (
                    <>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-1">Archived</span>
                      {(field.archived_options ?? []).map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-gray-400 line-through min-w-0 truncate">{opt}</span>
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 shrink-0">archived</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(field.id, {
                                archived_options: (field.archived_options ?? []).filter((o) => o !== opt),
                              })
                            }
                            className="text-[11px] text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                            aria-label="Unarchive option"
                            title="Unarchive"
                          >
                            ⊙
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => updateField(field.id, { options: [...(field.options ?? []), ''] })}
                    className="self-start text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    + Add option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="self-start text-sm text-green-600 hover:text-green-700 font-medium"
        >
          + Add field
        </button>
      </div>

      {/* Field type descriptions (helper) */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 flex flex-col gap-1">
        {FIELD_TYPES.map((t) => (
          <p key={t.value} className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{t.label}:</span> {t.description}
          </p>
        ))}
      </div>

      {/* Completion field selector */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Completion field
          <span className="ml-1 text-xs text-gray-400 font-normal">— which field marks this entry as done?</span>
        </label>
        <select
          value={completionFieldId ?? ''}
          onChange={(e) => handleCompletionFieldChange(e.target.value === '' ? null : Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Any entry counts (no specific field)</option>
          {labelledFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label} ({FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          Used for streaks, weekly quota bars, and all report calculations.
        </p>

        {/* Completion options — only for multi_select fields */}
        {isMultiSelectCompletion && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-xs font-medium text-gray-700">
              Which options count as completion?
              <span className="ml-1 font-normal text-gray-400">— leave all unchecked to count any selection</span>
            </p>
            {(completionField?.options ?? []).filter((o) => o.trim() && !(completionField?.archived_options ?? []).includes(o)).length === 0 ? (
              <p className="text-xs text-gray-400 italic">Add options to the field first</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {(completionField?.options ?? []).filter((o) => o.trim() && !(completionField?.archived_options ?? []).includes(o)).map((opt) => {
                  const compOpts = completionField?.completion_options ?? [];
                  const checked = compOpts.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const newOpts = checked
                            ? compOpts.filter((o) => o !== opt)
                            : [...compOpts, opt];
                          updateField(completionFieldId!, { completion_options: newOpts });
                        }}
                        className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completion limit — only for time, int, duration fields */}
        {limitApplies && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-xs font-medium text-gray-700">
              Streak limit
              <span className="ml-1 font-normal text-gray-400">
                — entry only counts when the value is {completionFieldType === 'time' ? 'before/after a time' : 'above/below a number'}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={completionLimit?.direction ?? (completionFieldType === 'time' ? 'before' : 'above')}
                onChange={(e) => handleLimitDirectionChange(e.target.value as CompletionLimitDirection)}
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {completionFieldType === 'time' ? (
                  <>
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </>
                ) : (
                  <>
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </>
                )}
              </select>

              {completionFieldType === 'time' ? (
                <input
                  type="time"
                  value={completionLimit?.value != null ? minsToTimeInput(completionLimit.value) : ''}
                  onChange={(e) => handleLimitValueChange(e.target.value)}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              ) : completionFieldType === 'duration' ? (
                <input
                  type="text"
                  placeholder="HH:MM"
                  value={completionLimit?.value != null
                    ? `${String(Math.floor(completionLimit.value / 60)).padStart(2, '0')}:${String(completionLimit.value % 60).padStart(2, '0')}`
                    : ''}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const mins = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
                    setCompletionLimit((prev) => prev ? { ...prev, value: mins } : { direction: 'above', value: mins });
                  }}
                  className="w-24 rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={completionLimit?.value ?? ''}
                  onChange={(e) => handleLimitValueChange(e.target.value)}
                  className="w-24 rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              )}

              {completionLimit && (
                <button
                  type="button"
                  onClick={() => setCompletionLimit(null)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove limit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timing field selector */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Timing field
          <span className="ml-1 text-xs text-gray-400 font-normal">— which time field to show in timing reports?</span>
        </label>
        <select
          value={timingFieldId ?? ''}
          onChange={(e) => setTimingFieldId(e.target.value === '' ? null : Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">None (hide from timing reports)</option>
          {labelledFields.filter((f) => f.type === 'time').map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          Only Time fields are shown here. Used to display when the habit was logged in the Timing report.
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 bg-green-500 text-white font-medium py-2.5 rounded-lg hover:bg-green-600 disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create habit'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/habits')}
          className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
