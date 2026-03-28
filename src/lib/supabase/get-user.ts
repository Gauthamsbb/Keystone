import { redirect } from 'next/navigation'
import { createClient } from './server'
import { prisma } from '@/lib/prisma'

/** Returns the authenticated Supabase user. Redirects to /login if not authenticated. */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    redirect('/login')
  }

  return user
}

/** Returns the authenticated user's Profile (with role). Redirects to /login if not authenticated. */
export async function getCurrentProfile() {
  const user = await getCurrentUser()

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) {
    redirect('/login')
  }

  return profile
}

/** Returns the current user, or null without redirecting (for use in layouts). */
export async function getCurrentUserOrNull() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}
