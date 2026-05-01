'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Hash, Briefcase, Camera, ChevronDown, ChevronUp,
  Copy, Check, RefreshCw, BookMarked, PenLine, X, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'twitter' | 'linkedin' | 'instagram' | 'facebook'
type WriteMode = 'from idea' | 'from hook' | 'from experience'
type VoiceStyle = 'Conversational' | 'Professional' | 'Bold' | 'Educational'

interface VoiceSettings {
  style: VoiceStyle
  examples: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; Icon: React.ElementType }[] = [
  { id: 'twitter', label: 'Twitter / X', Icon: Hash },
  { id: 'linkedin', label: 'LinkedIn', Icon: Briefcase },
  { id: 'instagram', label: 'Instagram', Icon: Camera },
  { id: 'facebook', label: 'Facebook', Icon: Users },
]

const WRITE_MODES: { id: WriteMode; label: string; description: string }[] = [
  { id: 'from idea', label: 'From Idea', description: 'Turn your idea into a full post' },
  { id: 'from hook', label: 'From Hook', description: 'You have the first line, I\'ll write the rest' },
  { id: 'from experience', label: 'From Experience', description: 'Describe what happened, I\'ll find the angle' },
]

const VOICE_STYLES: VoiceStyle[] = ['Conversational', 'Professional', 'Bold', 'Educational']

const PLATFORM_BADGE_LABEL: Record<Platform, string> = {
  twitter: 'Twitter / X Thread',
  linkedin: 'LinkedIn Post',
  instagram: 'Instagram Caption',
  facebook: 'Facebook Post',
}

const DEFAULT_VOICE: VoiceSettings = { style: 'Conversational', examples: '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function GeneratingSkeleton() {
  const widths = ['w-full', 'w-5/6', 'w-full', 'w-4/5', 'w-full', 'w-3/4', 'w-full', 'w-2/3']
  return (
    <div className="p-6 space-y-3">
      {widths.map((w, i) => (
        <div key={i} className={clsx('h-4 rounded bg-border animate-pulse', w)} style={{ animationDelay: `${i * 80}ms` }} />
      ))}
      <p className="text-sm text-text-secondary text-center pt-4">Writing in your voice…</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WritePage() {
  // Idea input
  const [idea, setIdea] = useState('')
  const [fromIdeaBank, setFromIdeaBank] = useState(false)

  // Controls
  const [platform, setPlatform] = useState<Platform>('twitter')
  const [writeMode, setWriteMode] = useState<WriteMode>('from idea')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voice, setVoice] = useState<VoiceSettings>(DEFAULT_VOICE)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Post-generation actions
  const [copied, setCopied] = useState(false)
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── On mount: read localStorage ──────────────────────────────────────────

  useEffect(() => {
    const ideaId = localStorage.getItem('selected_idea')
    const savedVoice = localStorage.getItem('pb_voice_settings')

    if (savedVoice) {
      try { setVoice(JSON.parse(savedVoice)) } catch {}
    }

    if (ideaId) {
      setFromIdeaBank(true)
      localStorage.removeItem('selected_idea')
      // Fetch the idea content
      fetch('/api/ideas')
        .then(r => r.json())
        .then((ideas: { id: string; content: string }[]) => {
          const match = ideas.find(i => i.id === ideaId)
          if (match) setIdea(match.content)
        })
        .catch(() => {})
    }
  }, [])

  // ── Persist voice settings ────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('pb_voice_settings', JSON.stringify(voice))
  }, [voice])

  // ── Auto-resize textarea ──────────────────────────────────────────────────

  const handleIdeaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdea(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  // ── Show toast ────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!idea.trim() || generating) return
    setGenerating(true)
    setGenerated(null)
    setError(null)
    setSavedToLibrary(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, platform, voice, writingMode: writeMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGenerated(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }, [idea, platform, voice, writeMode, generating])

  // ── Copy ─────────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    showToast('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Save to library ───────────────────────────────────────────────────────

  const handleSaveToLibrary = async () => {
    if (!generated || savedToLibrary) return
    try {
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, platform, voice, writingMode: writeMode }),
      })
      setSavedToLibrary(true)
      showToast('Saved to library')
    } catch {
      showToast('Failed to save')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] gap-0 -m-4 md:-m-8 animate-fade-in">

      {/* ── Left panel: Controls ── */}
      <div className="w-full md:w-[480px] shrink-0 border-b md:border-b-0 md:border-r border-border bg-surface overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">

          <div>
            <h1 className="page-title">Write</h1>
            <p className="text-text-secondary mt-1 text-sm">Turn your ideas into posts</p>
          </div>

          {/* Step 1: Idea */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label">Your idea</label>
              {fromIdeaBank && (
                <button
                  onClick={() => { setFromIdeaBank(false); setIdea('') }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                >
                  From Idea Bank <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={idea}
              onChange={handleIdeaChange}
              placeholder="Paste your idea, a topic, or describe an experience..."
              rows={3}
              className="input-base resize-none overflow-hidden"
              style={{ minHeight: '80px', maxHeight: '200px' }}
            />
          </section>

          {/* Step 2: Platform */}
          <section className="space-y-2">
            <label className="label">Platform</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLATFORMS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setPlatform(id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-button border text-xs font-medium transition-all duration-150',
                    platform === id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-text-secondary border-border hover:border-accent/40 hover:text-text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Write Mode */}
          <section className="space-y-2">
            <label className="label">Write Mode</label>
            <div className="space-y-2">
              {WRITE_MODES.map(({ id, label, description }) => (
                <button
                  key={id}
                  onClick={() => setWriteMode(id)}
                  className={clsx(
                    'w-full text-left px-4 py-3 rounded-button border transition-all duration-150',
                    writeMode === id
                      ? 'border-accent bg-accent-light'
                      : 'border-border bg-surface hover:border-accent/40'
                  )}
                >
                  <p className={clsx('text-sm font-medium', writeMode === id ? 'text-accent' : 'text-text-primary')}>
                    {label}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Step 4: Voice Settings (collapsible) */}
          <section className="space-y-2">
            <button
              onClick={() => setVoiceOpen(v => !v)}
              className="flex items-center gap-1.5 label hover:text-text-primary transition-colors"
            >
              Voice Settings
              {voiceOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {voiceOpen && (
              <div className="space-y-3 pt-1 animate-slide-up">
                <div className="space-y-1.5">
                  <label className="label">Style</label>
                  <select
                    value={voice.style}
                    onChange={e => setVoice(v => ({ ...v, style: e.target.value as VoiceStyle }))}
                    className="input-base"
                  >
                    {VOICE_STYLES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <Textarea
                  label="Example Posts"
                  value={voice.examples}
                  onChange={e => setVoice(v => ({ ...v, examples: e.target.value }))}
                  placeholder="Paste 1-2 of your best posts so I can match your style..."
                  rows={4}
                />
              </div>
            )}
          </section>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!idea.trim()}
            className="w-full h-12 text-base"
            size="lg"
          >
            {generating ? 'Writing…' : 'Generate Post'}
          </Button>
        </div>
      </div>

      {/* ── Right panel: Output ── */}
      <div className="flex-1 overflow-y-auto bg-background relative">
        <div className="p-8 h-full flex flex-col">

          {/* Empty state */}
          {!generating && !generated && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
                <PenLine className="h-8 w-8 text-text-secondary" />
              </div>
              <h3 className="font-serif text-xl text-text-primary mb-2">Your post will appear here</h3>
              <p className="text-text-secondary text-sm">Fill in the details and hit Generate</p>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="bg-surface border border-border rounded-card overflow-hidden">
              <GeneratingSkeleton />
            </div>
          )}

          {/* Error */}
          {error && !generating && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-card p-4">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={handleGenerate} className="text-xs text-destructive underline mt-1">
                Try again
              </button>
            </div>
          )}

          {/* Generated output */}
          {generated && !generating && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Platform badge */}
              <div className="flex items-center gap-2">
                <Badge variant="accent">{PLATFORM_BADGE_LABEL[platform]}</Badge>
                <span className="text-xs text-text-secondary">
                  {wordCount(generated)} words · {generated.length} chars
                </span>
              </div>

              {/* Content */}
              <div className="bg-surface border border-border rounded-card p-6">
                <p className="font-sans text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {generated}
                </p>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" onClick={handleCopy} size="sm">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </Button>
                <Button variant="secondary" onClick={handleGenerate} size="sm">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <Button
                  variant={savedToLibrary ? 'ghost' : 'secondary'}
                  onClick={handleSaveToLibrary}
                  disabled={savedToLibrary}
                  size="sm"
                >
                  <BookMarked className="h-3.5 w-3.5" />
                  {savedToLibrary ? 'Saved' : 'Save to Library'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-text-primary text-white text-sm px-4 py-2.5 rounded-button shadow-card-elevated animate-slide-up z-50">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
