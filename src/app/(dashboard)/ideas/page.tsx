'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ArrowRight, X, Plus } from 'lucide-react'
import { useIdeas, type Idea } from '@/hooks/useIdeas'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { clsx } from 'clsx'

type StatusFilter = 'all' | 'raw' | 'ready' | 'used'

const STATUS_NEXT: Record<string, 'raw' | 'ready' | 'used'> = {
  raw: 'ready',
  ready: 'used',
  used: 'raw',
}

const STATUS_BADGE: Record<string, 'muted' | 'accent' | 'success'> = {
  raw: 'muted',
  ready: 'accent',
  used: 'success',
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function IdeaCard({
  idea,
  onDelete,
  onStatusChange,
  onWriteFrom,
}: {
  idea: Idea
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'raw' | 'ready' | 'used') => void
  onWriteFrom: (idea: Idea) => void
}) {
  return (
    <div className="break-inside-avoid mb-4 group bg-surface border border-border rounded-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:scale-[1.01]">
      <p className="text-sm text-text-primary leading-relaxed mb-3 whitespace-pre-wrap">
        {idea.content}
      </p>

      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {idea.tags.map(tag => (
            <span key={tag} className="badge bg-accent-light text-accent text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {formatRelativeDate(idea.created_at)}
          </span>
          <button
            onClick={() => onStatusChange(idea.id, STATUS_NEXT[idea.status])}
            className="transition-opacity"
            title="Click to advance status"
          >
            <Badge variant={STATUS_BADGE[idea.status]} className="cursor-pointer capitalize text-xs">
              {idea.status}
            </Badge>
          </button>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onWriteFrom(idea)}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium px-2 py-1 rounded-button hover:bg-accent-light transition-colors"
          >
            Write from this <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(idea.id)}
            className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-button transition-colors"
            title="Delete idea"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const router = useRouter()
  const { ideas, loading, createIdea, deleteIdea, updateIdea } = useIdeas()

  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }, [tagInput, tags])

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSave = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await createIdea(trimmed, tags)
      setContent('')
      setTags([])
      textareaRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  const handleWriteFrom = (idea: Idea) => {
    localStorage.setItem('selected_idea', idea.id)
    updateIdea(idea.id, { status: 'ready' })
    router.push('/write')
  }

  const filtered = ideas.filter(idea => {
    const matchesFilter = filter === 'all' || idea.status === filter
    const matchesSearch = !search || idea.content.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all: ideas.length,
    raw: ideas.filter(i => i.status === 'raw').length,
    ready: ideas.filter(i => i.status === 'ready').length,
    used: ideas.filter(i => i.status === 'used').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Idea Bank</h1>
        <p className="text-text-secondary mt-1">Your raw thoughts, ready to become posts</p>
      </div>

      {/* Quick Capture */}
      <Card>
        <div className="p-4 space-y-3">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Drop an idea, observation, or half-formed thought..."
            rows={3}
            className="resize-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-medium"
              >
                {tag}
                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="Add tag..."
              className="text-xs bg-transparent border-none outline-none text-text-secondary placeholder:text-text-secondary/60 w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              <kbd className="px-1 py-0.5 rounded bg-border text-text-secondary font-mono">⌘</kbd>
              {' + '}
              <kbd className="px-1 py-0.5 rounded bg-border text-text-secondary font-mono">↵</kbd>
              {' to save'}
            </p>
            <Button onClick={handleSave} loading={saving} disabled={!content.trim()}>
              Save idea
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters + Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center bg-surface border border-border rounded-button p-0.5 gap-0.5">
          {(['all', 'raw', 'ready', 'used'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors',
                filter === f
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background'
              )}
            >
              {f}
              <span className={clsx(
                'ml-1.5 text-xs',
                filter === f ? 'text-white/70' : 'text-text-secondary'
              )}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ideas..."
          className="input-base max-w-xs"
        />

        <span className="text-sm text-text-secondary ml-auto">
          {filtered.length} {filtered.length === 1 ? 'idea' : 'ideas'}
        </span>
      </div>

      {/* Ideas grid */}
      {loading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4 h-28 bg-surface border border-border rounded-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-text-secondary" />
          </div>
          <h3 className="font-serif text-lg text-text-primary mb-2">
            {ideas.length === 0 ? 'Your idea bank is empty' : 'No ideas match this filter'}
          </h3>
          <p className="text-text-secondary text-sm">
            {ideas.length === 0
              ? 'Start capturing thoughts above. No idea is too raw.'
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDelete={deleteIdea}
              onStatusChange={(id, status) => updateIdea(id, { status })}
              onWriteFrom={handleWriteFrom}
            />
          ))}
        </div>
      )}
    </div>
  )
}
