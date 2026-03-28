import { getChangeLog } from '@/lib/actions/changelog';
import type { ChangeEvent } from '@/lib/actions/changelog';

function eventIcon(event: ChangeEvent): string {
  switch (event) {
    case 'created':                  return '✦';
    case 'deleted':                  return '✕';
    case 'activated':                return '●';
    case 'archived':                 return '○';
    case 'quota_changed':            return '↕';
    case 'fields_changed':           return '≡';
    case 'completion_limit_changed': return '◎';
    case 'field_archived':           return '⊘';
    case 'field_unarchived':         return '⊙';
    case 'reward_bucket_created':    return '◈';
    case 'reward_bucket_updated':    return '◇';
    case 'reward_bucket_deleted':    return '◆';
    case 'reward_milestone_added':   return '★';
    case 'reward_milestone_updated': return '☆';
    case 'reward_milestone_deleted': return '✦';
    case 'reward_habit_added':       return '⊕';
    case 'reward_habit_removed':     return '⊖';
  }
}

function eventLabel(event: ChangeEvent): string {
  switch (event) {
    case 'created':                  return 'Created';
    case 'deleted':                  return 'Deleted';
    case 'activated':                return 'Activated';
    case 'archived':                 return 'Archived';
    case 'quota_changed':            return 'Quota changed';
    case 'fields_changed':           return 'Fields changed';
    case 'completion_limit_changed': return 'Completion limit changed';
    case 'field_archived':           return 'Field archived';
    case 'field_unarchived':         return 'Field unarchived';
    case 'reward_bucket_created':    return 'Bucket created';
    case 'reward_bucket_updated':    return 'Bucket updated';
    case 'reward_bucket_deleted':    return 'Bucket deleted';
    case 'reward_milestone_added':   return 'Milestone added';
    case 'reward_milestone_updated': return 'Milestone updated';
    case 'reward_milestone_deleted': return 'Milestone deleted';
    case 'reward_habit_added':       return 'Habit added to bucket';
    case 'reward_habit_removed':     return 'Habit removed from bucket';
  }
}

function eventColor(event: ChangeEvent): string {
  switch (event) {
    case 'created':                  return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'deleted':                  return 'bg-red-50 text-red-500 border-red-100';
    case 'activated':                return 'bg-violet-50 text-violet-600 border-violet-100';
    case 'archived':                 return 'bg-gray-50 text-gray-400 border-gray-100';
    case 'quota_changed':            return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'fields_changed':           return 'bg-blue-50 text-blue-500 border-blue-100';
    case 'completion_limit_changed': return 'bg-violet-50 text-violet-500 border-violet-100';
    case 'field_archived':           return 'bg-amber-50 text-amber-500 border-amber-100';
    case 'field_unarchived':         return 'bg-blue-50 text-blue-500 border-blue-100';
    case 'reward_bucket_created':    return 'bg-violet-50 text-violet-600 border-violet-100';
    case 'reward_bucket_updated':    return 'bg-violet-50 text-violet-500 border-violet-100';
    case 'reward_bucket_deleted':    return 'bg-red-50 text-red-400 border-red-100';
    case 'reward_milestone_added':   return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'reward_milestone_updated': return 'bg-amber-50 text-amber-500 border-amber-100';
    case 'reward_milestone_deleted': return 'bg-red-50 text-red-400 border-red-100';
    case 'reward_habit_added':       return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'reward_habit_removed':     return 'bg-gray-50 text-gray-400 border-gray-100';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderDetails(event: ChangeEvent, details: Record<string, any> | null): string | null {
  if (!details) return null;
  switch (event) {
    case 'quota_changed':
      return `${details.from} → ${details.to} per week`;
    case 'fields_changed': {
      const parts: string[] = [];
      if (details.added?.length) parts.push(`Added: ${details.added.join(', ')}`);
      if (details.removed?.length) parts.push(`Removed: ${details.removed.join(', ')}`);
      return parts.join(' · ') || null;
    }
    case 'field_archived':
    case 'field_unarchived':
      return details.field_label ?? null;
    case 'completion_limit_changed': {
      const fmt = (l: { direction: string; value: number } | null) => {
        if (!l) return 'None';
        return `${l.direction} ${l.value}`;
      };
      return `${fmt(details.from)} → ${fmt(details.to)}`;
    }
    case 'reward_bucket_updated': {
      const parts: string[] = [];
      if (details.name) parts.push(`Name: "${details.name.from}" → "${details.name.to}"`);
      if ('description' in details) parts.push('Description updated');
      return parts.join(' · ') || null;
    }
    case 'reward_milestone_added':
    case 'reward_milestone_updated':
      return details.reward ? `${details.streak_target}wk → ${details.reward}` : null;
    case 'reward_milestone_deleted':
      return details.reward ? `Removed: ${details.streak_target}wk → ${details.reward}` : null;
    case 'reward_habit_added':
    case 'reward_habit_removed':
      return details.habit_name ?? null;
    default:
      return null;
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export default async function ChangelogPage() {
  const entries = await getChangeLog();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-800">Change Log</h1>

      {entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-violet-100 shadow-[0_2px_12px_rgba(124,58,237,0.06)]">
          <p className="text-lg font-semibold text-[#1E1B4B]">No changes yet</p>
          <p className="text-sm mt-1 text-violet-400">Changes to habits will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const colorClass = eventColor(entry.event);
            const detail = renderDetails(entry.event, entry.details);
            return (
              <div
                key={entry.id}
                className={`bg-white rounded-xl border px-4 py-3 flex items-start gap-3 shadow-sm ${colorClass.split(' ')[2]}`}
              >
                {/* Icon */}
                <span
                  className={`shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center rounded-full border text-xs font-bold ${colorClass}`}
                >
                  {eventIcon(entry.event)}
                </span>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {eventLabel(entry.event)}
                    </span>
                    <span className="text-sm font-semibold text-[#1E1B4B] truncate">
                      &ldquo;{entry.habit_name}&rdquo;
                    </span>
                  </div>
                  {detail && (
                    <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
                  )}
                </div>

                {/* Time */}
                <span className="shrink-0 text-xs text-gray-300 mt-0.5">
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
