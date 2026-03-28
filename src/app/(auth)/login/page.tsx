'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signIn, undefined)

  useEffect(() => {
    if (state && 'success' in state) router.push('/')
  }, [state, router])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sign in to GTrack</h1>
        <p className="text-sm text-gray-500 mt-1">Track your habits, earn your streaks.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {'error' in (state ?? {}) && (state as { error: string }).error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {(state as { error: string }).error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-violet-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-center text-gray-500">
        No account?{' '}
        <Link href="/signup" className="text-violet-600 hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
