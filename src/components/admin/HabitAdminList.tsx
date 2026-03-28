'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updateHabit, deleteHabit } from '@/lib/actions/habits';
import type { HabitRecord } from '@/lib/types/schema';

interface HabitAdminListProps {
  habits: HabitRecord[];
}

type DeleteStep = 'typing' | 'confirm1' | 'confirm2';

interface DeleteState {
  step: DeleteStep;
  text: string;
}

export function HabitAdminList({ habits }: HabitAdminListProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteStates, setDeleteStates] = useState<Record<string, DeleteState>>({});

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateHabit({ id, is_active }),
    onSuccess: () => router.refresh(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      setExpandedId(null);
      setDeleteStates({});
      router.refresh();
    },
  });

  function getDelState(id: string): DeleteState | null {
    return deleteStates[id] ?? null;
  }

  function setDelState(id: string, state: DeleteState | null) {
    setDeleteStates((prev) => {
      if (state === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: state };
    });
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDelState(id, null);
    } else {
      setExpandedId(id);
    }
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.06)]">
        <p className="text-lg font-semibold text-[#1E1B4B]">No habits yet</p>
        <p className="text-sm mt-1 text-violet-400">Create your first habit below.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {habits.map((habit) => {
        const isExpanded = expandedId === habit.id;
        const delState = getDelState(habit.id);
        const expectedText = `delete ${habit.name.toLowerCase()}`;
        const textMatches = (delState?.text ?? '').toLowerCase().trim() === expectedText;

        return (
          <div
            key={habit.id}
            className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
              habit.is_active ? 'border-violet-100' : 'border-violet-50 opacity-60'
            }`}
          >
            {/* ── Main row ── */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Clickable name area */}
              <button
                className="flex-1 min-w-0 text-left flex items-center gap-2 group"
                onClick={() => toggleExpand(habit.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1E1B4B] truncate">{habit.name}</span>
                    {habit.is_active ? (
                      <span className="shrink-0 text-[10px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-400 mt-0.5">
                    Quota: {habit.weekly_quota}/week · {habit.input_schema.length} field{habit.input_schema.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-violet-300 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Archive / unarchive + Edit — always visible */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: habit.id, is_active: !habit.is_active })}
                  disabled={toggleMutation.isPending}
                  className="p-1.5 rounded-lg text-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title={habit.is_active ? 'Archive' : 'Unarchive'}
                >
                  {habit.is_active ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </button>

                <Link
                  href={`/habits/${habit.id}/edit`}
                  className="p-1.5 rounded-lg text-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* ── Expanded section ── */}
            {isExpanded && (
              <div className="border-t border-violet-50 px-4 py-3 bg-red-50/30">
                {delState === null && (
                  <button
                    onClick={() => setDelState(habit.id, { step: 'typing', text: '' })}
                    className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete habit
                  </button>
                )}

                {delState?.step === 'typing' && (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs text-gray-600">
                      Type{' '}
                      <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                        delete {habit.name.toLowerCase()}
                      </span>{' '}
                      to continue
                    </p>
                    <input
                      type="text"
                      value={delState.text}
                      onChange={(e) => setDelState(habit.id, { ...delState, text: e.target.value })}
                      placeholder={`delete ${habit.name.toLowerCase()}`}
                      autoFocus
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-gray-300"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDelState(habit.id, null)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!textMatches}
                        onClick={() => setDelState(habit.id, { step: 'confirm1', text: delState.text })}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {delState?.step === 'confirm1' && (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-sm font-semibold text-gray-800">Are you sure?</p>
                    <p className="text-xs text-gray-500">
                      This will permanently delete <span className="font-semibold text-gray-700">&ldquo;{habit.name}&rdquo;</span> and all of its logged entries. This action cannot be undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDelState(habit.id, null)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setDelState(habit.id, { step: 'confirm2', text: delState.text })}
                        className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Yes, delete
                      </button>
                    </div>
                  </div>
                )}

                {delState?.step === 'confirm2' && (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-sm font-bold text-red-600">Final confirmation</p>
                    <p className="text-xs text-gray-500">
                      Are you absolutely sure? All entries for{' '}
                      <span className="font-semibold text-gray-700">&ldquo;{habit.name}&rdquo;</span>{' '}
                      will be lost forever.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDelState(habit.id, null)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(habit.id)}
                        className="px-3 py-1.5 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        {deleteMutation.isPending ? 'Deleting…' : 'Permanently delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
