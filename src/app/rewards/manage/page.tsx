'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getBuckets,
  createBucket,
  updateBucket,
  deleteBucket,
  addHabitToBucket,
  removeHabitFromBucket,
  addMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/lib/actions/rewards';
import { getHabits } from '@/lib/actions/habits';
import { getMilestoneColor } from '@/components/rewards/milestoneColors';
import type { RewardBucketRecord, BucketMilestoneRecord, HabitRecord } from '@/lib/types/schema';
import { useEffect } from 'react';

// ── Small shared components ───────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ManageRewardsPage() {
  const router = useRouter();
  const [buckets, setBuckets] = useState<RewardBucketRecord[]>([]);
  const [allHabits, setAllHabits] = useState<HabitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // New bucket form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const [b, h] = await Promise.all([getBuckets(), getHabits()]);
    setBuckets(b);
    setAllHabits(h.filter((h) => h.is_active));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleCreateBucket(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await createBucket({ name: newName.trim(), description: newDesc.trim() || undefined });
    setNewName('');
    setNewDesc('');
    setCreating(false);
    startTransition(() => refresh());
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10 flex justify-center">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Create bucket form */}
      <section className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-[#1E1B4B] uppercase tracking-wider mb-3">
          New Bucket
        </h2>
        <form onSubmit={handleCreateBucket} className="space-y-2">
          <input
            type="text"
            placeholder="Bucket name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-[#1E1B4B] text-sm placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <textarea
            placeholder="Purpose / intent (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-[#1E1B4B] text-sm placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? <Spinner /> : null}
            Create Bucket
          </button>
        </form>
      </section>

      {/* Existing buckets */}
      {buckets.length === 0 ? (
        <p className="text-center text-[#6B7280] text-sm py-8">
          No buckets yet. Create one above.
        </p>
      ) : (
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <BucketEditor
              key={bucket.id}
              bucket={bucket}
              allHabits={allHabits}
              onRefresh={() => startTransition(() => refresh())}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// ── BucketEditor ──────────────────────────────────────────────────────────────

function BucketEditor({
  bucket,
  allHabits,
  onRefresh,
}: {
  bucket: RewardBucketRecord;
  allHabits: HabitRecord[];
  onRefresh: () => void;
}) {
  const [editName, setEditName] = useState(bucket.name);
  const [editDesc, setEditDesc] = useState(bucket.description ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Milestone form
  const [newStreakTarget, setNewStreakTarget] = useState('');
  const [newReward, setNewReward] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Habit picker
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [addingHabit, setAddingHabit] = useState(false);

  const bucketHabitIds = new Set(bucket.habits.map((bh) => bh.habit_id));
  const availableHabits = allHabits.filter((h) => !bucketHabitIds.has(h.id));

  async function handleSaveName() {
    if (editName.trim() === bucket.name && editDesc.trim() === (bucket.description ?? '')) return;
    setSaving(true);
    await updateBucket({ id: bucket.id, name: editName.trim(), description: editDesc.trim() || null });
    setSaving(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await deleteBucket(bucket.id);
    onRefresh();
  }

  async function handleAddHabit() {
    if (!selectedHabitId) return;
    setAddingHabit(true);
    await addHabitToBucket(bucket.id, selectedHabitId);
    setSelectedHabitId('');
    setAddingHabit(false);
    onRefresh();
  }

  async function handleRemoveHabit(habitId: string) {
    await removeHabitFromBucket(bucket.id, habitId);
    onRefresh();
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    const target = parseInt(newStreakTarget, 10);
    if (!target || target < 1 || !newReward.trim()) return;
    setAddingMilestone(true);
    await addMilestone({ bucket_id: bucket.id, streak_target: target, reward: newReward.trim() });
    setNewStreakTarget('');
    setNewReward('');
    setAddingMilestone(false);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
      {/* Bucket header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <span className="text-base">🪣</span>

        <div className="flex-1 min-w-0 space-y-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            className="w-full text-sm font-bold text-[#1E1B4B] bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onBlur={handleSaveName}
            placeholder="Purpose / intent..."
            className="w-full text-xs text-[#6B7280] bg-transparent border-0 focus:outline-none focus:ring-0 p-0 placeholder-gray-300"
          />
        </div>

        {saving && <Spinner />}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
            confirmDelete
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'text-red-400 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {deleting ? '...' : confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
        {confirmDelete && !deleting && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-[#6B7280] hover:text-[#1E1B4B]"
          >
            Cancel
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-violet-50 pt-4">
          {/* Habits section */}
          <div>
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Habits</h3>
            <div className="space-y-1 mb-2">
              {bucket.habits.length === 0 ? (
                <p className="text-xs text-[#6B7280] italic">No habits in this bucket yet.</p>
              ) : (
                bucket.habits.map((bh) => (
                  <div key={bh.id} className="flex items-center justify-between bg-violet-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-[#1E1B4B]">{bh.habit.name}</span>
                    <button
                      onClick={() => handleRemoveHabit(bh.habit_id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add habit picker */}
            {availableHabits.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="flex-1 text-sm px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">Select habit…</option>
                  {availableHabits.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddHabit}
                  disabled={!selectedHabitId || addingHabit}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {addingHabit ? '...' : 'Add'}
                </button>
              </div>
            )}
            {availableHabits.length === 0 && bucket.habits.length > 0 && (
              <p className="text-xs text-[#6B7280] italic">All active habits already added.</p>
            )}
          </div>

          {/* Milestones section */}
          <div>
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Milestones</h3>
            <div className="space-y-1 mb-2">
              {bucket.milestones.length === 0 ? (
                <p className="text-xs text-[#6B7280] italic">No milestones set yet.</p>
              ) : (
                bucket.milestones
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((m) => (
                    <MilestoneRow key={m.id} milestone={m} onRefresh={onRefresh} />
                  ))
              )}
            </div>

            {/* Add milestone form */}
            <form onSubmit={handleAddMilestone} className="flex gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#6B7280] font-medium uppercase tracking-wide">
                  Streak (weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newStreakTarget}
                  onChange={(e) => setNewStreakTarget(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-20 text-sm px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] text-[#6B7280] font-medium uppercase tracking-wide">
                  Reward
                </label>
                <input
                  type="text"
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  placeholder="e.g. Movie night!"
                  className="w-full text-sm px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <button
                type="submit"
                disabled={!newStreakTarget || !newReward.trim() || addingMilestone}
                className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
              >
                {addingMilestone ? '...' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MilestoneRow ──────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  onRefresh,
}: {
  milestone: BucketMilestoneRecord;
  onRefresh: () => void;
}) {
  const [editTarget, setEditTarget] = useState(String(milestone.streak_target));
  const [editReward, setEditReward] = useState(milestone.reward);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = getMilestoneColor(milestone.display_order);

  async function handleBlur() {
    const target = parseInt(editTarget, 10);
    if (!target || target < 1) { setEditTarget(String(milestone.streak_target)); return; }
    if (target === milestone.streak_target && editReward.trim() === milestone.reward) return;
    setSaving(true);
    await updateMilestone({ id: milestone.id, streak_target: target, reward: editReward.trim() });
    setSaving(false);
    onRefresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteMilestone(milestone.id);
    onRefresh();
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 border"
      style={{
        backgroundColor: `${color.hex}15`,
        borderColor: `${color.hex}40`,
      }}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color.hex }}
      />

      {/* Streak target */}
      <input
        type="number"
        min="1"
        value={editTarget}
        onChange={(e) => setEditTarget(e.target.value)}
        onBlur={handleBlur}
        className="w-10 text-xs font-bold bg-transparent border-0 focus:outline-none text-center"
        style={{ color: color.hex }}
      />
      <span className="text-xs text-[#6B7280]">wks</span>

      {/* Reward */}
      <input
        type="text"
        value={editReward}
        onChange={(e) => setEditReward(e.target.value)}
        onBlur={handleBlur}
        className="flex-1 text-sm text-[#1E1B4B] bg-transparent border-0 focus:outline-none min-w-0"
      />

      {saving && <Spinner />}

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
        title="Remove milestone"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
