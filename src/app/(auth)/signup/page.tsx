'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/actions/auth'

export default function SignupPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signUp, undefined)

  useEffect(() => {
    if (state && 'success' in state) router.push('/')
  }, [state, router])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Start tracking habits today.</p>
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
            autoComplete="new-password"
            required
            minLength={8}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirm" className="text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-center text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
