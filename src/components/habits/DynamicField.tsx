'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InputSchemaField } from '@/lib/types/schema';

// ── Multi-select ────────────────────────────────────────────────────────────

function MultiSelectField({
  field,
  value,
  onChange,
  onAddOption,
}: {
  field: InputSchemaField;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | null) => void;
  onAddOption?: (option: string) => void;
}) {
  const options = (field.options ?? []).filter((o) => !(field.archived_options ?? []).includes(o));

  let selected: string[] = [];
  try {
    const parsed = JSON.parse(typeof value === 'string' ? value : '[]');
    if (Array.isArray(parsed)) selected = parsed;
  } catch { /* ignore */ }

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [newOpt, setNewOpt] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function openDropdown() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  function toggleOption(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next.length > 0 ? JSON.stringify(next) : null);
  }

  function handleAddOption() {
    const trimmed = newOpt.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onAddOption?.(trimmed);
    const next = [...selected, trimmed];
    onChange(JSON.stringify(next));
    setNewOpt('');
  }

  const dropdownContent = isOpen && dropdownStyle && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        zIndex: 9999,
      }}
      className="bg-white rounded-xl border border-violet-200 shadow-xl overflow-hidden"
    >
      {options.length === 0 ? (
        <p className="px-3 py-3 text-sm text-gray-400 italic">No options yet — add one below</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto divide-y divide-violet-50">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-violet-50 transition-colors text-left"
                >
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? 'bg-violet-600 border-violet-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={checked ? 'font-semibold text-[#1E1B4B]' : 'text-gray-700'}>
                    {opt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-violet-100 px-3 py-2 flex items-center gap-2 bg-violet-50/40">
        <input
          type="text"
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
          placeholder="Add an option…"
          className="flex-1 text-sm bg-transparent focus:outline-none text-[#1E1B4B] placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={handleAddOption}
          disabled={!newOpt.trim()}
          className="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-30 transition-colors px-1"
        >
          Add
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#1E1B4B]">{field.label}</label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="w-full flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm min-h-[46px]"
      >
        {selected.length === 0 ? (
          <span className="text-sm text-gray-400 flex-1">Select options…</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold"
              >
                {s}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleOption(s); }}
                  className="text-violet-500 hover:text-violet-800 leading-none"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <svg
          className={`w-4 h-4 text-violet-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdownContent}
    </div>
  );
}

interface DynamicFieldProps {
  field: InputSchemaField;
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
  onAddOption?: (option: string) => void;
}

export function DynamicField({ field, value, onChange, onAddOption }: DynamicFieldProps) {
  switch (field.type) {
    // ── Yes/No — iOS-style toggle ──────────────────────────────────────────
    case 'yes_no':
      return (
        <label className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm font-semibold text-[#1E1B4B]">{field.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
              value ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
            }`}
          >
            <span
              className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200 ${
                value ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </label>
      );

    // ── Int counter — tap ±, or tap number to type ─────────────────────────
    case 'int': {
      const numVal = typeof value === 'number' ? value : (parseInt(String(value ?? '0'), 10) || 0);
      return (
        <div className="flex items-center justify-between py-1">
          <span className="text-sm font-semibold text-[#1E1B4B]">{field.label}</span>
          <div className="flex items-center gap-0 rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => onChange(Math.max(0, numVal - 1))}
              className="w-10 h-10 flex items-center justify-center text-2xl font-light text-violet-500 hover:bg-violet-50 active:bg-violet-100 transition-colors border-r border-violet-200"
              aria-label="Decrease"
            >
              −
            </button>
            <input
              type="number"
              value={numVal}
              min={0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange(isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="w-14 h-10 text-center text-base font-bold text-[#1E1B4B] bg-white focus:outline-none focus:bg-violet-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Value"
            />
            <button
              type="button"
              onClick={() => onChange(numVal + 1)}
              className="w-10 h-10 flex items-center justify-center text-2xl font-light text-violet-500 hover:bg-violet-50 active:bg-violet-100 transition-colors border-l border-violet-200"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      );
    }

    // ── Duration (HH:MM with auto-calc display) ────────────────────────────
    case 'duration':
      return <DurationField field={field} value={value} onChange={onChange} />;

    // ── Time (HH:MM AM/PM) ─────────────────────────────────────────────────
    case 'time':
      return <TimeField field={field} value={value} onChange={onChange} />;

    // ── Multi-select — dropdown with checkboxes ────────────────────────────
    case 'multi_select':
      return (
        <MultiSelectField
          field={field}
          value={value}
          onChange={onChange as (v: string | null) => void}
          onAddOption={onAddOption}
        />
      );

    // ── Text — auto-expanding textarea ─────────────────────────────────────
    case 'text':
    default:
      return <AutoExpandingText field={field} value={value} onChange={onChange} />;
  }
}

function DurationField({
  field,
  value,
  onChange,
}: {
  field: InputSchemaField;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const strVal = value !== null && value !== undefined ? String(value) : '';
  const [localVal, setLocalVal] = useState(strVal);
  const isFocused = useRef(false);
  useEffect(() => {
    if (!isFocused.current) setLocalVal(strVal);
  }, [strVal]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#1E1B4B]">{field.label}</label>
        {localVal && <DurationPreview raw={localVal} />}
      </div>
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => { isFocused.current = true; }}
        onBlur={(e) => {
          isFocused.current = false;
          const v = e.target.value.trim();
          onChange(v === '' ? null : v);
        }}
        className="w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2.5 text-base font-semibold text-[#1E1B4B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
        placeholder="HH:MM (e.g. 01:30)"
        pattern="[0-9]{1,2}:[0-5][0-9]"
      />
    </div>
  );
}

function TimeField({
  field,
  value,
  onChange,
}: {
  field: InputSchemaField;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const strVal = value !== null && value !== undefined ? String(value) : '';
  const [localVal, setLocalVal] = useState(strVal);
  const isFocused = useRef(false);
  useEffect(() => {
    if (!isFocused.current) setLocalVal(strVal);
  }, [strVal]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#1E1B4B]">{field.label}</label>
      <input
        type="time"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => { isFocused.current = true; }}
        onBlur={(e) => {
          isFocused.current = false;
          const v = e.target.value;
          onChange(v === '' ? null : v);
        }}
        className="w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2.5 text-base font-semibold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
      />
    </div>
  );
}

function AutoExpandingText({
  field,
  value,
  onChange,
}: {
  field: InputSchemaField;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const strVal = value !== null && value !== undefined ? String(value) : '';
  const [localVal, setLocalVal] = useState(strVal);
  const isFocused = useRef(false);
  useEffect(() => {
    if (!isFocused.current) setLocalVal(strVal);
  }, [strVal]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#1E1B4B]">{field.label}</label>
      <textarea
        ref={textareaRef}
        value={localVal}
        rows={2}
        onChange={(e) => { setLocalVal(e.target.value); autoResize(); }}
        onFocus={() => { isFocused.current = true; }}
        onBlur={(e) => {
          isFocused.current = false;
          const v = e.target.value.trim();
          onChange(v === '' ? null : v);
        }}
        className="w-full rounded-xl border border-violet-200 bg-violet-50/30 px-3 py-2.5 text-base font-semibold text-[#1E1B4B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm resize-none overflow-hidden"
        placeholder="Enter value"
      />
    </div>
  );
}

// Shows auto-calculated breakdown next to duration field (e.g. "1h 30m")
function DurationPreview({ raw }: { raw: string }) {
  const parts = raw.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  const total = h * 60 + m;
  if (total <= 0) return null;

  const display = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
  return <span className="text-sm text-emerald-600 font-semibold">{display}</span>;
}
