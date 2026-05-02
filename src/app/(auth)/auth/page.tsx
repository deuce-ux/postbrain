'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } =
      tab === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: { full_name: name }
            }
          })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E8E5E0] p-8 w-full max-w-md shadow-[0_4px_24px_0_rgba(26,23,20,0.08)]">
        
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white font-bold text-sm mb-4">
            PB
          </div>
          <h1 className="font-serif text-2xl text-[#1A1714] text-center mb-1">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-[#6B6560] text-center mb-6">
            {tab === 'signin' ? 'Sign in to your PostBrain account' : 'Start writing in your voice today'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E8E5E0] mb-6">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 text-center pb-3 text-sm cursor-pointer ${
              tab === 'signin' 
                ? 'border-b-2 border-[#4F46E5] text-[#4F46E5] font-medium' 
                : 'text-[#6B6560]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 text-center pb-3 text-sm cursor-pointer ${
              tab === 'signup' 
                ? 'border-b-2 border-[#4F46E5] text-[#4F46E5] font-medium' 
                : 'text-[#6B6560]'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-1.5">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white border border-[#E8E5E0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-shadow"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-[#1A1714] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white border border-[#E8E5E0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-shadow"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1A1714] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white border border-[#E8E5E0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-shadow"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#4338CA] transition-colors disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading 
                ? (tab === 'signin' ? 'Signing in...' : 'Creating account...') 
                : (tab === 'signin' ? 'Sign in' : 'Create account')
              }
            </button>
          </div>

          {/* Error handling */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mt-4 text-center">
              {error}
            </div>
          )}
        </form>

        {/* Bottom link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-[#6B6560] hover:text-[#1A1714] transition-colors">
            Back to home
          </Link>
        </div>

      </div>
    </main>
  )
}
