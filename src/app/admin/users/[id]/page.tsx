import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getAdminUser, getAdminWeeklyReport, updateUserCredentials } from '@/lib/actions/admin';
import { WeeklyGrid } from '@/components/weekly/WeeklyGrid';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string; success?: string; error?: string }>;
}

function formatDateRange(weekStart: string, weekEnd: string) {
  const fmt = (s: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${s}T00:00:00.000Z`),
    );
  const year = new Date(`${weekEnd}T00:00:00.000Z`).getUTCFullYear();
  return `${fmt(weekStart)} – ${fmt(weekEnd)}, ${year}`;
}

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { offset: offsetStr, success, error } = await searchParams;
  const offset = parseInt(offsetStr ?? '0', 10);

  const user = await getAdminUser(id);
  if (!user) redirect('/admin/users');

  const report = await getAdminWeeklyReport(id, offset);

  async function handleUpdateEmail(formData: FormData) {
    'use server';
    const email = (formData.get('email') as string | null)?.trim();
    if (!email) redirect(`/admin/users/${id}?error=Email+is+required`);
    const result = await updateUserCredentials(id, { email });
    if (result.error) redirect(`/admin/users/${id}?error=${encodeURIComponent(result.error)}`);
    redirect(`/admin/users/${id}?success=email`);
  }

  async function handleUpdatePassword(formData: FormData) {
    'use server';
    const password = (formData.get('password') as string | null)?.trim();
    if (!password || password.length < 6)
      redirect(`/admin/users/${id}?error=Password+must+be+at+least+6+characters`);
    const result = await updateUserCredentials(id, { password });
    if (result.error) redirect(`/admin/users/${id}?error=${encodeURIComponent(result.error)}`);
    redirect(`/admin/users/${id}?success=password`);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          ← Users
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-semibold text-white">{user.email}</h1>
        <span
          className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            user.role === 'super_admin'
              ? 'bg-violet-900/50 text-violet-300 border border-violet-700/50'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          {user.role === 'super_admin' ? 'Super Admin' : 'User'}
        </span>
      </div>

      {/* Feedback banner */}
      {success && (
        <div className="bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-sm px-4 py-3 rounded-lg">
          {success === 'email' ? 'Email updated successfully.' : 'Password updated successfully.'}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change email */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Change Email</h2>
          <form action={handleUpdateEmail} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">New email</label>
              <input
                type="email"
                name="email"
                defaultValue={user.email}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
              />
            </div>
            <button
              type="submit"
              className="self-start text-sm bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Update Email
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Change Password</h2>
          <form action={handleUpdatePassword} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">New password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
              />
            </div>
            <button
              type="submit"
              className="self-start text-sm bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Weekly report */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Weekly Report</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/users/${id}?offset=${offset - 1}`}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
              {formatDateRange(report.weekStart, report.weekEnd)}
            </span>
            <Link
              href={`/admin/users/${id}?offset=${offset + 1}`}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Next week"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <Suspense fallback={<div className="text-gray-500 text-sm py-8 text-center">Loading…</div>}>
          <WeeklyGrid
            habits={report.habits}
            weekStart={report.weekStart}
            entriesByHabitAndDate={report.entriesByHabitAndDate}
            streaks={report.streaks}
          />
        </Suspense>
      </div>
    </div>
  );
}
