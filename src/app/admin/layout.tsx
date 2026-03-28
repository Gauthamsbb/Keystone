import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/get-user';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/actions/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== 'super_admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-semibold text-violet-400 hover:text-violet-300">
              Super Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-400">
              <Link href="/admin" className="hover:text-gray-200 transition-colors">Overview</Link>
              <Link href="/admin/users" className="hover:text-gray-200 transition-colors">Users</Link>
              <Link href="/admin/audit" className="hover:text-gray-200 transition-colors">Audit Log</Link>
              <Link href="/admin/heatmap" className="hover:text-gray-200 transition-colors">Heatmap</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{profile.email}</span>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
              ← App
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
