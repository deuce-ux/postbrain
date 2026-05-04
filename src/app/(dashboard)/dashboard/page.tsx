'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Lightbulb, FileText, Send, Check } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { DailyBrief } from '@/components/DailyBrief'
import { StreakWidget } from '@/components/StreakWidget'
import { clsx } from 'clsx'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPlatformBadge(platform: string): { bg: string; text: string } {
  switch (platform) {
    case 'twitter': return { bg: 'bg-black', text: 'text-white' }
    case 'linkedin': return { bg: 'bg-[#0077B5]', text: 'text-white' }
    case 'instagram': return { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white' }
    case 'facebook': return { bg: 'bg-[#1877F2]', text: 'text-white' }
    default: return { bg: 'bg-border', text: 'text-text-primary' }
  }
}

interface Post {
  id: string
  generated_text: string
  platform: string
  status: string
  created_at: string
}

interface Idea {
  id: string
  content: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { postsWritten, ideasSaved, postsPublished, loading } = useDashboardStats()
  const [displayName, setDisplayName] = useState<string>('there')
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([])
  const [quickCapture, setQuickCapture] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [voiceSetupComplete, setVoiceSetupComplete] = useState<boolean>(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, postsRes, ideasRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/posts'),
          fetch('/api/ideas')
        ])
        const profile = await profileRes.json()
        const posts = await postsRes.json()
        const ideas = await ideasRes.json()

        if (profile?.display_name) {
          setDisplayName(profile.display_name)
        }
        if (profile && typeof profile.voice_setup_complete === 'boolean') {
          setVoiceSetupComplete(profile.voice_setup_complete)
        }
        if (Array.isArray(posts)) {
          setRecentPosts(posts.slice(0, 3))
        }
        if (Array.isArray(ideas)) {
          setRecentIdeas(ideas.slice(0, 3))
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e)
      }
    }
    fetchData()
  }, [])

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = quickCapture.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      setQuickCapture('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const stats = [
    { label: 'Posts Written', value: postsWritten, icon: FileText },
    { label: 'Ideas Saved', value: ideasSaved, icon: Lightbulb },
    { label: 'Posts Published', value: postsPublished, icon: Send },
  ]

  return (
    <div className="space-y-8 animate-fade-in px-4 py-4 md:px-10 md:py-8">
      <div className="space-y-1">
        <h1 className="page-title text-2xl md:text-3xl">
          Good {getGreeting()}, {displayName}
        </h1>
        <p className="text-text-secondary">{formatDate()}</p>
      </div>

      {!voiceSetupComplete && (
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">✦</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1714]">
                Set up Voice DNA
              </p>
              <p className="text-xs text-[#6B6560]">
                Get posts that sound exactly like you
              </p>
            </div>
          </div>
          <a href="/voice" className="bg-[#4F46E5] text-white text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap">
            Set up now
          </a>
        </div>
      )}

      <DailyBrief />

      <StreakWidget />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-button bg-accent-light">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">
                    {loading ? '—' : stat.value}
                  </p>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <form onSubmit={handleQuickCapture} className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full md:max-w-md space-y-1.5">
          <label className="label">Quick Capture</label>
          <input
            value={quickCapture}
            onChange={e => setQuickCapture(e.target.value)}
            placeholder="Quick capture an idea..."
            className="input-base"
          />
        </div>
        <Button type="submit" loading={saving} disabled={!quickCapture.trim()}>
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            '+ Add Idea'
          )}
        </Button>
        <Link href="/write">
          <Button variant="secondary">Start Writing</Button>
        </Link>
      </form>

      {/* Recent Posts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif text-text-primary">Recent Posts</h2>
          <Link href="/library" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-text-secondary text-sm">No posts yet. Start writing.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentPosts.map((post) => {
              const badge = getPlatformBadge(post.platform)
              return (
                <Card key={post.id} variant="hover" className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', badge.bg, badge.text)}>
                      {post.platform}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatRelativeTime(post.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary line-clamp-2">
                    {post.generated_text}
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Ideas Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif text-text-primary">Recent Ideas</h2>
          <Link href="/ideas" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {recentIdeas.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-text-secondary text-sm">No ideas yet. Start capturing.</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentIdeas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg"
              >
                <span className="text-sm text-text-primary max-w-xs truncate">
                  {idea.content}
                </span>
                <Badge variant="muted">{idea.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}