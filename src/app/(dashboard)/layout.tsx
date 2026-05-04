import { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <AppShell user={{ name: session?.user?.user_metadata?.name, email: session?.user?.email }}>
      {children}
    </AppShell>
  )
}
