'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FileText, Lightbulb, Hash, BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Post {
  id: string
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

interface PlatformCount {
  platform: string
  count: number
}

export default function InsightsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, ideasRes] = await Promise.all([
          fetch('/api/posts'),
          fetch('/api/ideas')
        ])
        const postsData = await postsRes.json()
        const ideasData = await ideasRes.json()

        setPosts(Array.isArray(postsData) ? postsData : [])
        setIdeas(Array.isArray(ideasData) ? ideasData : [])
      } catch (e) {
        console.error('Failed to fetch insights:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalPosts = posts.length
  const totalIdeas = ideas.length

  const platformCounts = posts.reduce((acc: Record<string, number>, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const platformData: PlatformCount[] = [
    { platform: 'twitter', count: platformCounts.twitter || 0 },
    { platform: 'linkedin', count: platformCounts.linkedin || 0 },
    { platform: 'instagram', count: platformCounts.instagram || 0 },
    { platform: 'facebook', count: platformCounts.facebook || 0 },
  ].filter(p => p.count > 0).sort((a, b) => b.count - a.count)

  const mostUsedPlatform = platformData[0]?.platform || 'N/A'

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const postsThisWeek = posts.filter(p => new Date(p.created_at) >= oneWeekAgo).length

  const stats = [
    { 
      label: 'Total Posts Generated', 
      value: totalPosts, 
      icon: FileText 
    },
    { 
      label: 'Total Ideas Captured', 
      value: totalIdeas, 
      icon: Lightbulb 
    },
    { 
      label: 'Most Used Platform', 
      value: mostUsedPlatform, 
      icon: Hash,
      isPlatform: true
    },
    { 
      label: 'This Week', 
      value: postsThisWeek, 
      icon: BarChart2 
    },
  ]

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'bg-black'
      case 'linkedin': return 'bg-[#0077B5]'
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500'
      case 'facebook': return 'bg-[#1877F2]'
      default: return 'bg-border'
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title text-2xl md:text-3xl">Insights</h1>
        <p className="text-text-secondary mt-1">Your content performance at a glance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-4">
                <div className="p-2 rounded-lg bg-accent-light w-fit mb-3">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <p className={clsx(
                  'text-xl md:text-2xl font-serif text-text-primary',
                  stat.isPlatform && 'capitalize'
                )}>
                  {loading ? '—' : stat.value}
                </p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Platform Breakdown */}
      <div>
        <h2 className="text-lg font-serif text-text-primary mb-4">Posts by Platform</h2>
        {platformData.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-text-secondary text-sm">No posts generated yet.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              {platformData.map((item) => {
                const percentage = totalPosts > 0 
                  ? Math.round((item.count / totalPosts) * 100) 
                  : 0
                return (
                  <div key={item.platform}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-text-primary capitalize">
                        {item.platform}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          getPlatformColor(item.platform)
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Ideas Status */}
      <div>
        <h2 className="text-lg font-serif text-text-primary mb-4">Ideas by Status</h2>
        <Card className="p-4 md:p-6">
          <div className="flex flex-wrap gap-3">
            {['raw', 'ready', 'used'].map((status) => {
              const count = ideas.filter(i => i.status === status).length
              const variant = status === 'raw' ? 'muted' : status === 'ready' ? 'accent' : 'success'
              return (
                <Badge key={status} variant={variant}>
                  {status}: {count}
                </Badge>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}