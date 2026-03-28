'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminAuditEntry } from '@/lib/actions/admin';

interface Props {
  initialEvents: AdminAuditEntry[];
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ');
}

function actionColor(action: string): string {
  if (action.includes('deleted')) return 'text-red-400';
  if (action.includes('created')) return 'text-emerald-400';
  if (action.includes('upserted') || action.includes('updated')) return 'text-violet-400';
  return 'text-gray-400';
}

export function ActivityFeed({ initialEvents }: Props) {
  const [events, setEvents] = useState<AdminAuditEntry[]>(initialEvents);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('admin_audit_logs_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' },
        (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            action: string;
            table_name: string;
            record_id: string;
            details: Record<string, unknown> | null;
            created_at: string;
          };

          const newEvent: AdminAuditEntry = {
            id: row.id,
            userId: row.user_id,
            userEmail: '…',
            action: row.action,
            tableName: row.table_name,
            recordId: row.record_id,
            details: row.details,
            createdAt: new Date(row.created_at),
          };

          setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      ref={listRef}
      className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800/60 max-h-96 overflow-y-auto"
    >
      {events.length === 0 && (
        <div className="px-5 py-6 text-sm text-gray-500 text-center">No activity yet.</div>
      )}
      {events.map((event) => (
        <div key={event.id} className="px-5 py-3 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${actionColor(event.action)}`}>
                {actionLabel(event.action)}
              </span>
              <span className="text-xs text-gray-500">on {event.tableName}</span>
            </div>
            <span className="text-xs text-gray-400">{event.userEmail}</span>
          </div>
          <span className="text-xs text-gray-600 shrink-0">{timeAgo(event.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
