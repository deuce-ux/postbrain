'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Copy, Check, RefreshCw, Trash2, BookOpen,
  Search, X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'twitter' | 'linkedin' | 'instagram' | 'facebook'
type Status = 'draft' | 'published'

interface Post {
  id: string
  original_idea: string
  generated_text: string
  platform: Platform
  status: Status
  created_at: string
  performance_views?: number
  performance_likes?: number
  performance_comments?: number
  performance_shares?: number
  performance_notes?: string
  performance_logged_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'drafts', 'published'] as const
const PLATFORM_FILTERS = ['all', 'twitter', 'linkedin', 'instagram', 'facebook'] as const

type StatusFilter = typeof STATUS_FILTERS[number]
type PlatformFilter = typeof PLATFORM_FILTERS[number]

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'twitter': return 'bg-black text-white'
    case 'linkedin': return 'bg-[#0077B5] text-white'
    case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    case 'facebook': return 'bg-[#1877F2] text-white'
  }
}

function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case 'twitter': return 'Twitter / X'
    case 'linkedin': return 'LinkedIn'
    case 'instagram': return 'Instagram'
    case 'facebook': return 'Facebook'
  }
}

function getPlatformBorderColor(platform: Platform): string {
  switch (platform) {
    case 'twitter': return 'border-l-4 border-l-gray-900'
    case 'linkedin': return 'border-l-4 border-l-[#0077B5]'
    case 'instagram': return 'border-l-4 border-l-[#E1306C]'
    case 'facebook': return 'border-l-4 border-l-[#1877F2]'
    default: return 'border-l-4 border-l-[#4F46E5]'
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="bg-white border border-[#E8E5E0] rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 rounded-full bg-border" />
        <div className="h-3 w-16 bg-border rounded" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-border rounded w-full" />
        <div className="h-4 bg-border rounded w-5/6" />
        <div className="h-4 bg-border rounded w-4/5" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-16 bg-border rounded" />
        <div className="h-6 w-16 bg-border rounded" />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loggingPerformanceId, setLoggingPerformanceId] = useState<string | null>(null)
  const [repurposePostId, setRepurposePostId] = useState<string | null>(null)
  const [repurposeTo, setRepurposeTo] = useState<Platform | null>(null)
  const [repurposing, setRepurposing] = useState(false)
  const [repurposedContent, setRepurposedContent] = useState<string | null>(null)
  const [performanceForm, setPerformanceForm] = useState({
    views: '',
    likes: '',
    comments: '',
    shares: '',
    notes: ''
  })
  const [savingPerformance, setSavingPerformance] = useState(false)

  // ── Fetch posts ─────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts')
      if (res.ok) {
        const data = await res.json()
        setPosts(data)
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // ── Filter posts ────────────────────────────────────────────────────────
  const filteredPosts = posts.filter(post => {
    if (statusFilter !== 'all') {
      const targetStatus = statusFilter === 'drafts' ? 'draft' : 'published'
      if (post.status !== targetStatus) return false
    }
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      if (!post.generated_text.toLowerCase().includes(searchLower) &&
          !post.original_idea.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    return true
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCopy = async (post: Post) => {
    await navigator.clipboard.writeText(post.generated_text)
    setCopiedId(post.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleWriteAgain = (post: Post) => {
    localStorage.setItem('selected_idea', post.original_idea)
    window.location.href = '/write'
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    setDeletingId(postId)
    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId }),
      })
      if (res.ok) {
        setPosts(p => p.filter(post => post.id !== postId))
      }
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  const handleLogPerformance = async (postId: string) => {
    setSavingPerformance(true)
    try {
      const res = await fetch(`/api/posts/${postId}/performance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          views: parseInt(performanceForm.views) || 0,
          likes: parseInt(performanceForm.likes) || 0,
          comments: parseInt(performanceForm.comments) || 0,
          shares: parseInt(performanceForm.shares) || 0,
          notes: performanceForm.notes
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setPosts(p => p.map(post => post.id === postId ? { ...post, ...updated } : post))
        setLoggingPerformanceId(null)
        setPerformanceForm({ views: '', likes: '', comments: '', shares: '', notes: '' })
      }
    } catch (e) {
      console.error('Failed to save performance:', e)
    } finally {
      setSavingPerformance(false)
    }
  }

  const openPerformanceForm = (post: Post) => {
    setLoggingPerformanceId(post.id)
    setPerformanceForm({
      views: post.performance_views?.toString() || '',
      likes: post.performance_likes?.toString() || '',
      comments: post.performance_comments?.toString() || '',
      shares: post.performance_shares?.toString() || '',
      notes: post.performance_notes || ''
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in px-6 md:px-10">
      {/* Header */}
      <div>
        <h1 className="page-title">Library</h1>
        <p className="text-text-secondary mt-1 text-sm">All your generated posts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center bg-white border border-[#E8E5E0] rounded-lg p-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                statusFilter === filter
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Platform pills */}
        <div className="flex items-center gap-1">
          {PLATFORM_FILTERS.map(platform => (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                platformFilter === platform
                  ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                  : 'bg-white text-text-secondary border-border hover:border-[#4F46E5]/40'
              )}
            >
              {platform === 'all' ? 'All' : platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
          />
        </div>

        {/* Count */}
        <Badge variant="muted">{filteredPosts.length} posts</Badge>
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <PostSkeleton key={i} />)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-text-secondary" />
          </div>
          <h3 className="font-serif text-xl text-text-primary mb-2">No posts yet</h3>
          <p className="text-text-secondary text-sm mb-4">Posts you generate will appear here</p>
          <Link href="/write">
            <Button>Start Writing</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map(post => {
            const isExpanded = expandedPosts.has(post.id)
            const needsTruncation = post.generated_text.length > 300

            return (
              <div
                key={post.id}
                className={clsx('group bg-white border border-[#E8E5E0] rounded-xl p-5', getPlatformBorderColor(post.platform))}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', getPlatformColor(post.platform))}>
                    {getPlatformLabel(post.platform)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatRelativeTime(post.created_at)}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <p className={clsx('text-sm text-[#1A1714] leading-relaxed', !isExpanded && needsTruncation && 'line-clamp-4')}>
                    {post.generated_text}
                  </p>
                  {needsTruncation && (
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="text-xs text-[#4F46E5] hover:underline mt-1"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center gap-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant={post.status === 'published' ? 'success' : 'muted'}>
                    {post.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(post)}
                  >
                    {copiedId === post.id ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWriteAgain(post)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Write again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRepurposePostId(post.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Repurpose
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {/* Performance summary or log button */}
                {post.performance_logged_at ? (
                  <div className="mt-3 pt-3 border-t border-[#E8E5E0]">
                    <div className="flex items-center gap-3 text-xs text-[#6B6560]">
                      <span>👁 {post.performance_views || 0}</span>
                      <span>❤️ {post.performance_likes || 0}</span>
                      <span>💬 {post.performance_comments || 0}</span>
                      <span>🔁 {post.performance_shares || 0}</span>
                      <button onClick={() => openPerformanceForm(post)} className="text-[#4F46E5] hover:underline ml-auto">
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-[#E8E5E0]">
                    <button
                      onClick={() => openPerformanceForm(post)}
                      className="text-xs text-[#4F46E5] hover:underline"
                    >
                      Log performance
                    </button>
                  </div>
                )}

                {/* Performance logging form */}
                {loggingPerformanceId === post.id && (
                  <div className="mt-3 pt-3 border-t border-[#E8E5E0] space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs text-[#6B6560]">Views</label>
                        <input
                          type="number"
                          value={performanceForm.views}
                          onChange={e => setPerformanceForm(f => ({ ...f, views: e.target.value }))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-[#E8E5E0] rounded focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#6B6560]">Likes</label>
                        <input
                          type="number"
                          value={performanceForm.likes}
                          onChange={e => setPerformanceForm(f => ({ ...f, likes: e.target.value }))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-[#E8E5E0] rounded focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#6B6560]">Comments</label>
                        <input
                          type="number"
                          value={performanceForm.comments}
                          onChange={e => setPerformanceForm(f => ({ ...f, comments: e.target.value }))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-[#E8E5E0] rounded focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#6B6560]">Shares</label>
                        <input
                          type="number"
                          value={performanceForm.shares}
                          onChange={e => setPerformanceForm(f => ({ ...f, shares: e.target.value }))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm border border-[#E8E5E0] rounded focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#6B6560]">Notes</label>
                      <textarea
                        value={performanceForm.notes}
                        onChange={e => setPerformanceForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Any observations about this post..."
                        rows={2}
                        className="w-full px-2 py-1 text-sm border border-[#E8E5E0] rounded focus:outline-none focus:ring-1 focus:ring-[#4F46E5] resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleLogPerformance(post.id)} loading={savingPerformance}>
                        Save performance
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setLoggingPerformanceId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Repurpose panel */}
                {repurposePostId === post.id && (
                  <div className="mt-3 pt-3 border-t border-[#E8E5E0] bg-[#F8F9FF] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#6B6560]">Repurpose to:</span>
                      <button onClick={() => { setRepurposePostId(null); setRepurposedContent(null); setRepurposeTo(null) }}>
                        <X className="h-4 w-4 text-[#6B6560]" />
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {PLATFORM_FILTERS.filter(p => p !== 'all' && p !== post.platform).map(p => (
                        <button
                          key={p}
                          onClick={async () => {
                            setRepurposeTo(p as Platform)
                            setRepurposing(true)
                            try {
                              const res = await fetch('/api/repurpose', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  content: post.generated_text,
                                  fromPlatform: post.platform,
                                  toPlatform: p,
                                }),
                              })
                              const data = await res.json()
                              if (data.content) setRepurposedContent(data.content)
                            } catch (e) { console.error(e) }
                            setRepurposing(false)
                          }}
                          disabled={repurposing}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#E8E5E0] text-[#6B6560] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                    {repurposing && <p className="text-sm text-[#6B6560] mb-2">Repurposing...</p>}
                    {repurposedContent && (
                      <>
                        <div className="bg-white border border-[#E8E5E0] rounded-lg p-3 mb-3">
                          <p className="text-sm text-[#1A1714] whitespace-pre-wrap line-clamp-6">{repurposedContent}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(repurposedContent)
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await fetch('/api/posts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  idea: post.original_idea,
                                  generated_text: repurposedContent,
                                  platform: repurposeTo,
                                }),
                              })
                              setRepurposePostId(null)
                              setRepurposedContent(null)
                              setRepurposeTo(null)
                              fetchPosts()
                            }}
                          >
                            Save to Library
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}