import Link from 'next/link';
import { getAdminStats, getRecentActivity } from '@/lib/actions/admin';
import { ActivityFeed } from '@/components/admin/ActivityFeed';

export default async function AdminPage() {
  const [stats, recentActivity] = await Promise.all([
    getAdminStats(),
    getRecentActivity(20),
  ]);

  const statCards = [
    { label: 'Total users', value: stats.totalUsers },
    { label: 'Active habits', value: stats.totalHabits },
    { label: 'Entries today', value: stats.entriesToday },
    { label: 'Total entries', value: stats.totalEntries },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">Platform-wide stats across all accounts.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-2xl font-bold text-white">{s.value.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        {[
          { href: '/admin/users', label: 'Manage users' },
          { href: '/admin/audit', label: 'Audit log' },
          { href: '/admin/heatmap', label: 'Activity heatmap' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>

      {/* Live activity feed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent activity</h2>
        <ActivityFeed initialEvents={recentActivity} />
      </div>
    </div>
  );
}
