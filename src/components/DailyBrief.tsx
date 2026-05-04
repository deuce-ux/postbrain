'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'

interface CalendarEntry {
  id: string
  scheduled_date: string
  platform: string
  topic: string | null
}

interface Idea {
  id: string
  content: string
  status?: string
}

interface Post {
  created_at: string
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPlatformBadge(platform: string): string {
  switch (platform) {
    case 'Twitter': return 'bg-gray-900 text-white'
    case 'LinkedIn': return 'bg-[#0077B5] text-white'
    case 'Instagram': return 'bg-pink-500 text-white'
    case 'Facebook': return 'bg-[#1877F2] text-white'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function calculateStreak(posts: Post[]): number {
  if (posts.length === 0) return 0

  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    const hasPost = sortedPosts.some(p => {
      const postDate = new Date(p.created_at).toISOString().split('T')[0]
      return postDate === dateStr
    })

    if (hasPost) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

export function DailyBrief() {
  const router = useRouter()
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([])
  const [readyIdeas, setReadyIdeas] = useState<Idea[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [calRes, ideasRes, postsRes] = await Promise.all([
          fetch('/api/calendar'),
          fetch('/api/ideas'),
          fetch('/api/posts')
        ])
        
        const calData = await calRes.json()
        const ideasData = await ideasRes.json()
        const postsData = await postsRes.json()

        setCalendarEntries(Array.isArray(calData) ? calData : [])
        setReadyIdeas(Array.isArray(ideasData) ? ideasData.filter((i: Idea) => i.status === 'ready') : [])
        setPosts(Array.isArray(postsData) ? postsData : [])
      } catch (e) {
        console.error('Failed to fetch daily brief data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const todaysPosts = useMemo(() => {
    return calendarEntries.filter(entry => entry.scheduled_date.split('T')[0] === todayStr)
  }, [calendarEntries, todayStr])

  const streak = useMemo(() => calculateStreak(posts), [posts])

  const handleIdeaClick = (idea: Idea) => {
    localStorage.setItem('selected_idea', idea.id)
    router.push('/write')
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#E8E5E0] rounded-2xl p-5 mb-6 animate-pulse">
        <div className="h-5 w-32 bg-[#F5F3F0] rounded mb-3" />
        <div className="h-px bg-[#E8E5E0] my-3" />
        <div className="space-y-2">
          <div className="h-4 bg-[#F5F3F0] rounded w-3/4" />
          <div className="h-4 bg-[#F5F3F0] rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E8E5E0] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-medium text-[#1A1714]">Today&apos;s Brief</span>
        <span className="text-xs text-[#6B6560]">{formatDate()}</span>
      </div>
      
      <div className="border-b border-[#E8E5E0] my-3" />

      <div className="space-y-4">
        {/* What to write today */}
        <div>
          <h3 className="text-sm font-medium text-[#5C5A55] mb-2">What to write today</h3>
          {todaysPosts.length > 0 ? (
            <div className="space-y-2">
              {todaysPosts.map(entry => (
                <div key={entry.id} className="flex items-center gap-2">
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getPlatformBadge(entry.platform))}>
                    {entry.platform}
                  </span>
                  <span className="text-sm text-[#1A1714] truncate">{entry.topic}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B6560]">
              Nothing scheduled — pick an idea below and write
            </p>
          )}
        </div>

        {/* Ready ideas */}
        <div>
          <h3 className="text-sm font-medium text-[#5C5A55] mb-2">Ready ideas</h3>
          {readyIdeas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {readyIdeas.slice(0, 3).map(idea => (
                <button
                  key={idea.id}
                  onClick={() => handleIdeaClick(idea)}
                  className="max-w-[200px] px-3 py-1.5 bg-[#EEF2FF] text-[#4F46E5] text-sm rounded-full truncate hover:bg-[#E0E7FF] transition-colors"
                >
                  {idea.content}
                </button>
              ))}
            </div>
          ) : (
            <Link href="/ideas" className="text-sm text-[#4F46E5] hover:underline">
              No ideas marked ready. Go to Idea Bank and mark some ready →
            </Link>
          )}
        </div>

        {/* Posting streak */}
        <div>
          <h3 className="text-sm font-medium text-[#5C5A55] mb-2">Posting streak</h3>
          {streak > 0 ? (
            <span className="text-sm">🔥 {streak} day streak</span>
          ) : (
            <span className="text-sm text-[#6B6560]">Start your streak today</span>
          )}
        </div>
      </div>
    </div>
  )
}