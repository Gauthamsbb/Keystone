/**
 * Bootstrap admin seed script.
 * Run: npx tsx prisma/seed-admin.ts
 *
 * Creates a Super Admin user in Supabase Auth, inserts their profile,
 * and assigns all existing ownerless data to them.
 *
 * Set these env vars before running (or use .env):
 *   ADMIN_EMAIL    - email for the Super Admin account
 *   ADMIN_PASSWORD - password for the Super Admin account
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role key needed to create users
)

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running.')
    process.exit(1)
  }

  console.log(`Creating Supabase Auth user: ${email}`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    console.error('Supabase auth error:', error.message)
    process.exit(1)
  }

  const userId = data.user!.id
  console.log(`Supabase user created: ${userId}`)

  // Insert profile with super_admin role
  await prisma.profile.upsert({
    where: { id: userId },
    update: { role: 'super_admin' },
    create: { id: userId, email, role: 'super_admin' },
  })
  console.log('Profile inserted with super_admin role.')

  // Assign all ownerless rows to this admin
  const [habits, sections, buckets, logs] = await Promise.all([
    prisma.habit.updateMany({ where: { user_id: null }, data: { user_id: userId } }),
    prisma.habitSection.updateMany({ where: { user_id: null }, data: { user_id: userId } }),
    prisma.rewardBucket.updateMany({ where: { user_id: null }, data: { user_id: userId } }),
    prisma.habitChangeLog.updateMany({ where: { user_id: null }, data: { user_id: userId } }),
  ])

  console.log(`Assigned ${habits.count} habits, ${sections.count} sections, ${buckets.count} buckets, ${logs.count} change logs to admin.`)
  console.log('\nDone! You can now run Migration B to make user_id NOT NULL.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
