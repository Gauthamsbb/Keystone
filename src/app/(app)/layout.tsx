import { Header } from '@/components/Header'
import { getCurrentProfile } from '@/lib/supabase/get-user'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  return (
    <>
      <Header userRole={profile.role} />
      <main className="flex-1 px-4 py-6 max-w-2xl w-full mx-auto">{children}</main>
    </>
  )
}
