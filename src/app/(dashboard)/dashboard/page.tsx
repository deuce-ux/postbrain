import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          Welcome to PostBrain
        </h1>
        <p className="text-gray-400 text-lg">Signed in as {user.email}</p>
      </div>
    </main>
  )
}
