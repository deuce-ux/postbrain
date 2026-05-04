'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Bookmark, Plus } from 'lucide-react'
import { useSwipe, type ViralPost } from '@/hooks/useSwipe'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

type Platform = 'Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook'
type HookType = 'Question' | 'Bold statement' | 'Story' | 'Statistic' | 'Controversial' | 'How-to' | 'List' | 'Personal'

const PLATFORMS: Platform[] = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook']
const HOOK_TYPES: HookType[] = ['Question', 'Bold statement', 'Story', 'Statistic', 'Controversial', 'How-to', 'List', 'Personal']

const PLATFORM_COLORS: Record<Platform, string> = {
  Twitter: 'border-l-gray-900',
  LinkedIn: 'border-l-[#0077B5]',
  Instagram: 'border-l-pink-500',
  Facebook: 'border-l-[#1877F2]',
}

const HOOK_COLORS: Record<HookType, string> = {
  'Question': 'bg-blue-50 text-blue-700',
  'Bold statement': 'bg-red-50 text-red-700',
  'Story': 'bg-purple-50 text-purple-700',
  'Statistic': 'bg-green-50 text-green-700',
  'Controversial': 'bg-orange-50 text-orange-700',
  'How-to': 'bg-teal-50 text-teal-700',
  'List': 'bg-indigo-50 text-indigo-700',
  'Personal': 'bg-pink-50 text-pink-700',
}

function AddPostModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void
  onSave: (content: string, platform: Platform, hook_type: string, structure_notes: string, emotional_trigger: string) => void
  saving: boolean
}) {
  const [platform, setPlatform] = useState<Platform>('Twitter')
  const [content, setContent] = useState('')
  const [hook_type, setHook_type] = useState<HookType | ''>('')
  const [structure_notes, setStructure_notes] = useState('')
  const [emotional_trigger, setEmotional_trigger] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) return
    onSave(
      content.trim(),
      platform,
      hook_type || '',
      structure_notes.trim(),
      emotional_trigger.trim()
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-[#1A1714]">Save a viral post</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F3F0] rounded-lg transition-colors">
            <X className="h-5 w-5 text-[#5C5A55]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={clsx(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    platform === p
                      ? p === 'Twitter' ? 'bg-gray-900 text-white'
                        : p === 'LinkedIn' ? 'bg-[#0077B5] text-white'
                        : p === 'Instagram' ? 'bg-pink-500 text-white'
                        : 'bg-[#1877F2] text-white'
                      : 'bg-[#F5F3F0] text-[#5C5A55] hover:bg-[#E8E5E0]'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Post content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste the post here..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1714] placeholder-[#9A958F] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Hook type</label>
            <select
              value={hook_type}
              onChange={e => setHook_type(e.target.value as HookType)}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
            >
              <option value="">Select hook type...</option>
              {HOOK_TYPES.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Why it works</label>
            <textarea
              value={structure_notes}
              onChange={e => setStructure_notes(e.target.value)}
              placeholder="What made this post go viral?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1714] placeholder-[#9A958F] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Emotional trigger</label>
            <input
              type="text"
              value={emotional_trigger}
              onChange={e => setEmotional_trigger(e.target.value)}
              placeholder="Fear, curiosity, inspiration..."
              className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1714] placeholder-[#9A958F] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving} className="flex-1" disabled={!content.trim()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SwipeCard({
  post,
  onDelete,
  onUse,
}: {
  post: ViralPost
  onDelete: (id: string) => void
  onUse: (hook_type: string, structure_notes: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLongContent = post.content.length > 400

  return (
    <div className={clsx(
      'bg-white border border-[#E8E5E0] rounded-2xl p-5 relative group',
      PLATFORM_COLORS[post.platform as Platform]
    )}>
      <button
        onClick={() => onDelete(post.id)}
        className="absolute top-3 right-3 p-1.5 text-[#9A958F] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className={clsx(
          'px-2 py-1 rounded text-xs font-medium',
          post.platform === 'Twitter' ? 'bg-gray-900 text-white'
            : post.platform === 'LinkedIn' ? 'bg-[#0077B5] text-white'
            : post.platform === 'Instagram' ? 'bg-pink-500 text-white'
            : 'bg-[#1877F2] text-white'
        )}>
          {post.platform}
        </span>
        {post.hook_type && (
          <span className={clsx('px-2 py-1 rounded text-xs font-medium', HOOK_COLORS[post.hook_type as HookType])}>
            {post.hook_type}
          </span>
        )}
        <span className="text-xs text-[#9A958F]">
          {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-[#1A1714] mb-4">
        {isLongContent && !expanded ? (
          <>
            {post.content.slice(0, 400)}...
            <button onClick={() => setExpanded(true)} className="text-[#4F46E5] text-xs ml-1">
              Show more
            </button>
          </>
        ) : post.content}
        {isLongContent && expanded && (
          <button onClick={() => setExpanded(false)} className="text-[#4F46E5] text-xs ml-1">
            Show less
          </button>
        )}
      </p>

      <div className="border-t border-[#E8E5E0] pt-3 mb-3">
        {post.structure_notes && (
          <div className="mb-2">
            <span className="text-xs font-medium text-[#5C5A55]">Why it works:</span>
            <p className="text-sm text-[#1A1714] mt-1">{post.structure_notes}</p>
          </div>
        )}
        {post.emotional_trigger && (
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700">
            {post.emotional_trigger}
          </span>
        )}
      </div>

      {post.hook_type && post.structure_notes && (
        <button
          onClick={() => onUse(post.hook_type!, post.structure_notes!)}
          className="text-sm text-[#4F46E5] font-medium hover:text-[#4338CA] transition-colors"
        >
          Use this structure →
        </button>
      )}
    </div>
  )
}

export default function SwipePage() {
  const router = useRouter()
  const { posts, loading, createPost, deletePost } = useSwipe()

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<string>('All')
  const [search, setSearch] = useState('')

  const handleSave = async (
    content: string,
    platform: Platform,
    hook_type: string,
    structure_notes: string,
    emotional_trigger: string
  ) => {
    setSaving(true)
    try {
      await createPost(content, platform, hook_type, structure_notes, emotional_trigger)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleUse = (hook_type: string, structure_notes: string) => {
    localStorage.setItem('swipe_inspiration', JSON.stringify({ hook_type, structure_notes }))
    router.push('/write')
  }

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesPlatform = platformFilter === 'All' || post.platform === platformFilter
      const matchesSearch = !search || post.content.toLowerCase().includes(search.toLowerCase())
      return matchesPlatform && matchesSearch
    })
  }, [posts, platformFilter, search])

  const platformCounts = useMemo(() => {
    const counts = { All: posts.length, Twitter: 0, LinkedIn: 0, Instagram: 0, Facebook: 0 }
    posts.forEach(p => {
      if (counts[p.platform as keyof typeof counts] !== undefined) {
        counts[p.platform as keyof typeof counts]++
      }
    })
    return counts
  }, [posts])

  return (
    <div className="space-y-6 animate-fade-in px-6 md:px-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Swipe File</h1>
          <p className="text-[#5C5A55] mt-1">Posts that work. Study them. Steal the structure.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Post
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-[#F5F3F0] p-1 rounded-lg">
          {(['All', 'Twitter', 'LinkedIn', 'Instagram', 'Facebook'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                platformFilter === p
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white border border-[#E8E5E0] text-[#6B6560] hover:bg-[#FAF9F7]'
              )}
            >
              {p}
              <span className="ml-1.5 text-xs opacity-70">{platformCounts[p]}</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="input-base max-w-xs"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E8E5E0] rounded-2xl p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#F5F3F0] flex items-center justify-center mb-4">
            <Bookmark className="h-8 w-8 text-[#9A958F]" />
          </div>
          <h3 className="font-serif text-lg text-[#1A1714] mb-2">Your swipe file is empty</h3>
          <p className="text-[#5C5A55] text-sm mb-6">When you see a post that stops your scroll, save it here. Study what works.</p>
          <Button onClick={() => setShowModal(true)}>Save your first post</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map(post => (
            <SwipeCard
              key={post.id}
              post={post}
              onDelete={deletePost}
              onUse={handleUse}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddPostModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}