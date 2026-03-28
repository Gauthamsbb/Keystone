'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { AdminAuditEntry } from '@/lib/actions/admin';

interface Props {
  rows: AdminAuditEntry[];
  page: number;
  totalPages: number;
  filters: { userId?: string; action?: string };
}

function timeStr(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionColor(action: string): string {
  if (action.includes('deleted')) return 'text-red-400';
  if (action.includes('created')) return 'text-emerald-400';
  return 'text-violet-400';
}

export function AuditTable({ rows, page, totalPages, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/admin/audit?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Filter by action…"
          defaultValue={filters.action ?? ''}
          className="text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate({ action: (e.target as HTMLInputElement).value || undefined, page: '1' });
            }
          }}
        />
        {(filters.action || filters.userId) && (
          <button
            onClick={() => navigate({ action: undefined, userId: undefined, page: '1' })}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Table</th>
              <th className="px-5 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                  No audit events found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors"
              >
                <td className="px-5 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                  {timeStr(row.createdAt)}
                </td>
                <td className="px-5 py-2.5">
                  <button
                    onClick={() => navigate({ userId: row.userId, page: '1' })}
                    className="text-gray-300 hover:text-violet-300 transition-colors text-xs"
                  >
                    {row.userEmail}
                  </button>
                </td>
                <td className="px-5 py-2.5">
                  <span className={`text-xs font-medium ${actionColor(row.action)}`}>
                    {row.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-gray-500 text-xs">{row.tableName}</td>
                <td className="px-5 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                  {row.details ? JSON.stringify(row.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ page: String(page - 1) })}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => navigate({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
