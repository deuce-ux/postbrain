'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Mic, LogOut, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'voice' | 'account'

interface Profile {
  id: string
  display_name?: string
  role?: string
  building?: string
  topics?: string[]
  voice_style?: string
  voice_examples_count?: number
  voice_summary?: string
  email?: string
}

const TOPICS = [
  'AI & Tech', 'Business', 'Career', 'Design', 'Education',
  'Finance', 'Health', 'Marketing', 'Productivity', 'Social Media',
]

// ─── Main component ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  const [profile, setProfile] = useState<Profile>({
    id: '',
    display_name: '',
    role: '',
    building: '',
    topics: [],
    voice_style: '',
    voice_examples_count: 0,
    voice_summary: '',
    email: '',
  })
  
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    role: '',
    building: '',
    topics: [] as string[],
  })

  // ── Show toast ─────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  // ── Fetch profile ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile({
            id: data.id || '',
            display_name: data.display_name || '',
            role: data.role || '',
            building: data.building || '',
            topics: data.topics || [],
            voice_style: data.voice_style || '',
            voice_examples_count: data.voice_examples_count || 0,
            voice_summary: data.voice_summary || '',
            email: data.email || '',
          })
          setProfileForm({
            display_name: data.display_name || '',
            role: data.role || '',
            building: data.building || '',
            topics: data.topics || [],
          })
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e)
      }
    }
    fetchProfile()
  }, [])

  // ── Save profile ────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      if (res.ok) {
        showToast('Settings saved')
        const data = await res.json()
        setProfile(prev => ({ ...prev, ...data }))
      } else {
        showToast('Failed to save')
      }
    } catch {
      showToast('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle topic ────────────────────────────────────────────────────
  const toggleTopic = (topic: string) => {
    setProfileForm(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }))
  }

  // ── Sign out ───────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Components ──────────────────────────────────────────────────
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'voice', label: 'Voice DNA', icon: Mic },
    { id: 'account', label: 'Account', icon: LogOut },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* Two column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Nav tabs */}
        <nav className="w-full md:w-48 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full text-left',
                    activeTab === tab.id
                      ? 'bg-[#4F46E5] text-white'
                      : 'text-text-secondary hover:bg-background hover:text-text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Right: Content panel */}
        <div className="flex-1 bg-white border border-[#E8E5E0] rounded-xl p-4 md:p-6">
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="font-medium text-[#1A1714]">Profile Information</h2>
              
              <Input
                label="Display name"
                value={profileForm.display_name}
                onChange={e => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Your name"
              />
              
              <Input
                label="Your role"
                value={profileForm.role}
                onChange={e => setProfileForm(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Product Manager, Indie Hacker"
              />
              
              <Input
                label="What you're building"
                value={profileForm.building}
                onChange={e => setProfileForm(prev => ({ ...prev, building: e.target.value }))}
                placeholder="e.g. AI-powered content tool"
              />
              
              <div className="space-y-2">
                <label className="label">Content topics</label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(topic => (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        profileForm.topics.includes(topic)
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-white text-text-secondary border-border hover:border-[#4F46E5]/40'
                      )}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleSaveProfile} loading={saving} className="mt-2">
                Save
              </Button>
            </div>
          )}

          {/* Voice DNA tab */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <h2 className="font-medium text-[#1A1714]">Voice DNA</h2>
              
              {profile.voice_style ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#EEF2FF] rounded-lg">
                    <Badge variant="accent">{profile.voice_style}</Badge>
                    <span className="text-sm text-text-secondary">
                      {profile.voice_examples_count} posts saved
                    </span>
                  </div>
                  
                  {profile.voice_summary && (
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-text-secondary">{profile.voice_summary}</p>
                    </div>
                  )}
                  
                  <Button variant="secondary" onClick={() => router.push('/voice')}>
                    Redo Voice Setup
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">Voice DNA not set up yet</p>
                  <Button onClick={() => router.push('/voice')}>
                    Set Up Voice DNA
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Account tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-medium text-[#1A1714] mb-4">Account</h2>
                <div className="p-4 bg-background rounded-lg">
                  <label className="label">Email address</label>
                  <p className="text-sm text-text-primary mt-1">{profile.email || 'Not set'}</p>
                </div>
              </div>
              
              <Button variant="secondary" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
              
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-destructive mb-2">Danger zone</h3>
                <Button
                  variant="ghost"
                  onClick={() => showToast('Coming soon')}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-text-primary text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}