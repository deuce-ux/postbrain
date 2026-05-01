import { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppShell user={{ name: user?.user_metadata?.name, email: user?.email }}>
      {children}
    </AppShell>
  )
}
