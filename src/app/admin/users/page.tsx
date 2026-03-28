import Link from 'next/link';
import { getAdminUsers, setUserRole } from '@/lib/actions/admin';
import { getCurrentProfile } from '@/lib/supabase/get-user';

function timeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function AdminUsersPage() {
  const [users, me] = await Promise.all([getAdminUsers(), getCurrentProfile()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="text-sm text-gray-400 mt-1">{users.length} account{users.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 text-right">Habits</th>
              <th className="px-5 py-3 text-right">Last active</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === me.id;
              return (
                <tr key={user.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 text-gray-200">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'super_admin'
                        ? 'bg-violet-900/50 text-violet-300 border border-violet-700/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400">{user.habitCount}</td>
                  <td className="px-5 py-3 text-right text-gray-400">{timeAgo(user.lastActivity)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        Manage
                      </Link>
                      {!isSelf && (
                        <form
                          action={async () => {
                            'use server';
                            await setUserRole(user.id, user.role === 'super_admin' ? 'user' : 'super_admin');
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs text-violet-400 hover:text-violet-200 transition-colors"
                          >
                            {user.role === 'super_admin' ? 'Demote' : 'Promote'}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
