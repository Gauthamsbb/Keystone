'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHabitListItems,
  reorderItems,
  createSection,
  updateSection,
  deleteSection,
} from '@/lib/actions/habits';
import type { HabitListItem } from '@/lib/types/schema';

interface ReorderSheetProps {
  onClose: () => void;
}

interface EditingSection {
  id: string;
  title: string;
  subtitle: string;
}

export function ReorderSheet({ onClose }: ReorderSheetProps) {
  const queryClient = useQueryClient();

  const { data: fetchedItems, isLoading } = useQuery({
    queryKey: ['habit-list-items'],
    queryFn: getHabitListItems,
    staleTime: 0,
  });

  const [items, setItems] = useState<HabitListItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditingSection | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const pointerStartY = useRef(0);
  const initialized = useRef(false);

  if (fetchedItems && !initialized.current) {
    initialized.current = true;
    setItems(fetchedItems);
  }

  const saveMutation = useMutation({
    mutationFn: (ordered: HabitListItem[]) =>
      reorderItems(ordered.map((i) => ({ id: i.data.id, type: i.type }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-list-items'] });
      onClose();
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: (input: { id: string; title: string; subtitle?: string | null }) =>
      updateSection(input),
    onSuccess: (updated) => {
      setItems((prev) =>
        prev.map((item) =>
          item.type === 'section' && item.data.id === updated.id
            ? { type: 'section', data: updated }
            : item
        )
      );
      setEditing(null);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: (_, id) => {
      setItems((prev) => prev.filter((item) => !(item.type === 'section' && item.data.id === id)));
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: (input: { title: string; subtitle?: string }) => createSection(input),
    onSuccess: (created) => {
      setItems((prev) => [...prev, { type: 'section', data: created }]);
      setAddingSection(false);
      setNewTitle('');
      setNewSubtitle('');
    },
  });

  function getItemHeight(): number {
    if (!listRef.current) return 56;
    const first = listRef.current.firstElementChild as HTMLElement | null;
    return first?.getBoundingClientRect().height ?? 56;
  }

  function handleAddSection() {
    if (!newTitle.trim()) return;
    createSectionMutation.mutate({
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
    });
  }

  function handleSaveEdit() {
    if (!editing || !editing.title.trim()) return;
    updateSectionMutation.mutate({
      id: editing.id,
      title: editing.title,
      subtitle: editing.subtitle || null,
    });
  }

  function makeDragHandlers(idx: number) {
    return {
      onPointerDown(e: React.PointerEvent) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerStartY.current = e.clientY;
        setDragIdx(idx);
      },
      onPointerMove(e: React.PointerEvent) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const itemH = getItemHeight();
        const delta = e.clientY - pointerStartY.current;
        const steps = Math.round(delta / itemH);
        if (steps !== 0) {
          const newIdx = Math.max(0, Math.min(items.length - 1, idx + steps));
          if (newIdx !== idx) {
            setItems((prev) => {
              const next = [...prev];
              const [moved] = next.splice(idx, 1);
              next.splice(newIdx, 0, moved);
              return next;
            });
            setDragIdx(newIdx);
            pointerStartY.current += (newIdx - idx) * itemH;
          }
        }
      },
      onPointerUp(e: React.PointerEvent) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDragIdx(null);
      },
      onPointerCancel() {
        setDragIdx(null);
      },
    };
  }

  const DragHandle = ({ idx }: { idx: number }) => (
    <button
      className="text-gray-300 hover:text-violet-400 transition-colors cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none shrink-0"
      aria-label="Drag to reorder"
      {...makeDragHandlers(idx)}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm8-15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
      </svg>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl flex flex-col"
        style={{ maxHeight: '82vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pill */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 shrink-0">
          <span className="font-semibold text-[#1E1B4B]">Reorder Habits</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-2" ref={listRef}>
          {isLoading || items.length === 0 ? (
            <div className="flex flex-col gap-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-violet-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            items.map((item, idx) => {
              const isBeingDragged = dragIdx === idx;

              /* ── Section row ── */
              if (item.type === 'section') {
                const isEditingThis = editing?.id === item.data.id;

                if (isEditingThis) {
                  return (
                    <div key={item.data.id} className="mb-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-3 flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Edit section</p>
                      <input
                        autoFocus
                        value={editing.title}
                        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        placeholder="Section title"
                        className="bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
                      />
                      <input
                        value={editing.subtitle}
                        onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        placeholder="Subtitle (optional)"
                        className="bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs text-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors">Cancel</button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editing.title.trim() || updateSectionMutation.isPending}
                          className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
                        >
                          {updateSectionMutation.isPending ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.data.id}
                    className={`flex items-center gap-2 px-3 py-2.5 mb-1.5 rounded-xl select-none transition-shadow ${
                      isBeingDragged
                        ? 'bg-violet-100 shadow-lg ring-1 ring-violet-300'
                        : 'bg-gradient-to-r from-violet-50 to-violet-50/20 border border-violet-100 shadow-sm'
                    }`}
                  >
                    <DragHandle idx={idx} />

                    {/* Mini accent bar */}
                    <div className="w-0.5 h-7 rounded-full bg-gradient-to-b from-violet-500 to-violet-300 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1E1B4B] truncate">{item.data.title}</p>
                      {item.data.subtitle && (
                        <p className="text-[11px] text-violet-400 truncate">{item.data.subtitle}</p>
                      )}
                    </div>

                    <button
                      onClick={() => setEditing({ id: item.data.id, title: item.data.title, subtitle: item.data.subtitle ?? '' })}
                      className="p-1.5 rounded-lg text-violet-300 hover:text-violet-600 hover:bg-violet-100 transition-colors shrink-0"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteSectionMutation.mutate(item.data.id)}
                      disabled={deleteSectionMutation.isPending}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              }

              /* ── Habit row ── */
              const habit = item.data;
              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1.5 select-none transition-shadow ${
                    isBeingDragged
                      ? 'bg-violet-50 shadow-lg ring-1 ring-violet-200'
                      : 'bg-white border border-gray-100 shadow-sm'
                  } ${!habit.is_active ? 'opacity-50' : ''}`}
                >
                  <DragHandle idx={idx} />
                  <span className="flex-1 text-sm font-medium text-[#1E1B4B] truncate">{habit.name}</span>
                  {!habit.is_active && (
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">
                      Archived
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Add section */}
          {addingSection ? (
            <div className="mt-1 mb-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-3 flex flex-col gap-2">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">New section</p>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                placeholder="Section title"
                className="bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
              />
              <input
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                placeholder="Subtitle (optional)"
                className="bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs text-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setAddingSection(false); setNewTitle(''); setNewSubtitle(''); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors">Cancel</button>
                <button
                  onClick={handleAddSection}
                  disabled={!newTitle.trim() || createSectionMutation.isPending}
                  className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  {createSectionMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="w-full mt-1 mb-1.5 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-violet-200 text-xs font-medium text-violet-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add section
            </button>
          )}
        </div>

        {/* Save */}
        <div className="px-4 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => saveMutation.mutate(items)}
            disabled={saveMutation.isPending || isLoading || items.length === 0}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 active:bg-violet-800 transition-colors"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
    </div>
  );
}
