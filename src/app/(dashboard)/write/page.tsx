'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Hash, Briefcase, Camera, ChevronDown, ChevronUp,
  Copy, Check, RefreshCw, BookMarked, PenLine, X, Users,
  Bookmark, Zap, Shuffle, List,
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
  const [generationProvider, setGenerationProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Post-generation actions
  const [copied, setCopied] = useState(false)
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Swipe file
  const [swipeDrawerOpen, setSwipeDrawerOpen] = useState(false)
  const [swipePosts, setSwipePosts] = useState<{
    id: string
    content: string
    platform: string
    hook_type: string | null
    structure_notes: string | null
    emotional_trigger: string | null
  }[]>([])
  const [swipeInspiration, setSwipeInspiration] = useState<{
    hook_type: string
    structure_notes: string
    content: string
    emotional_trigger: string
  } | null>(null)
  const [swipeSearch, setSwipeSearch] = useState('')
  const [swipePlatformFilter, setSwipePlatformFilter] = useState('All')

  // Hook generator
  const [showHooks, setShowHooks] = useState(false)
  const [hooks, setHooks] = useState<string[]>([])
  const [generatingHooks, setGeneratingHooks] = useState(false)

  // Tone variations
  const [showVariations, setShowVariations] = useState(false)
  const [variations, setVariations] = useState<{ bold?: string; personal?: string; concise?: string } | null>(null)
  const [generatingVariations, setGeneratingVariations] = useState(false)
  const [activeVariation, setActiveVariation] = useState<'bold' | 'personal' | 'concise'>('bold')

  // Repurpose
  const [showRepurpose, setShowRepurpose] = useState(false)
  const [repurposing, setRepurposing] = useState(false)
  const [repurposedContent, setRepurposedContent] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

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

    // Fetch swipe file posts
    fetch('/api/swipe')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSwipePosts(data)
      })
      .catch(() => {})
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
        body: JSON.stringify({ idea, platform, voice, writingMode: writeMode, swipeInspiration: swipeInspiration || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGenerated(data.content)
      setGenerationProvider(data.provider || 'groq')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }, [idea, platform, voice, writeMode, generating, swipeInspiration])

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
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] gap-0 -m-4 md:-m-8 lg:-m-10 animate-fade-in px-4 py-4 md:px-10 md:py-8">

      {/* ── Left panel: Controls ── */}
      <div className="w-full md:w-[480px] shrink-0 border-b md:border-b-0 md:border-r border-border bg-[#FAFAF9] overflow-y-auto">
        <div className="p-4 space-y-5 bg-white rounded-xl border border-[#E8E5E0] m-4">

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
            {idea.trim() && !showHooks && (
              <button
                onClick={async () => {
                  setGeneratingHooks(true)
                  try {
                    const res = await fetch('/api/generate-hooks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ idea, platform }),
                    })
                    const data = await res.json()
                    if (data.hooks) setHooks(data.hooks)
                  } catch (e) { console.error(e) }
                  setGeneratingHooks(false)
                  setShowHooks(true)
                }}
                disabled={generatingHooks}
                className="text-xs text-[#4F46E5] font-medium flex items-center gap-1 mt-2"
              >
                <Zap className="h-3 w-3" />
                {generatingHooks ? 'Generating hooks...' : 'Generate hooks'}
              </button>
            )}

            {/* Hooks panel */}
            {showHooks && (
              <div className="bg-[#F8F9FF] rounded-xl p-4 mt-2 border border-[#E8E5E0]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#6B6560]">Pick a hook</span>
                  <button
                    onClick={() => setShowHooks(false)}
                    className="text-xs text-[#4F46E5]"
                  >
                    Close
                  </button>
                </div>
                {generatingHooks ? (
                  <p className="text-sm text-[#6B6560]">Generating hooks...</p>
                ) : (
                  <div className="space-y-2">
                    {hooks.map((hook, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIdea(hook)
                          setShowHooks(false)
                        }}
                        className="bg-white rounded-lg px-3 py-2.5 text-sm text-[#1A1714] border border-[#E8E5E0] cursor-pointer w-full text-left hover:border-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                    'flex flex-col items-center justify-center gap-1.5 h-12 px-2 rounded-button border text-xs font-medium transition-all duration-150',
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
                    'w-full text-left px-4 py-3 rounded-button border transition-all duration-150 flex items-start justify-between gap-2',
                    writeMode === id
                      ? 'border-accent bg-accent-light'
                      : 'border-border bg-surface hover:border-accent/40'
                  )}
                >
                  <div>
                    <p className={clsx('text-sm font-medium', writeMode === id ? 'text-accent' : 'text-text-primary')}>
                      {label}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{description}</p>
                  </div>
                  {writeMode === id && <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </section>

          {/* INSPIRATION section */}
          <section className="space-y-2">
            <label className="label">Inspiration</label>
            
            {swipeInspiration ? (
              <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-[#4F46E5]">
                  ✦ Using: {swipeInspiration.hook_type} structure
                </span>
                <button
                  onClick={() => setSwipeInspiration(null)}
                  className="text-[#4F46E5] hover:text-[#4338CA]"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSwipeDrawerOpen(true)}
                className="bg-white rounded-lg px-4 py-2.5 text-sm text-[#6B6560] w-full flex items-center gap-2 hover:bg-[#F5F3F0] transition-colors"
              >
                <Bookmark className="h-4 w-4" />
                Browse Swipe File
              </button>
            )}
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
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Generated Post</span>
                <span className={clsx(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  generationProvider === 'gemini'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-orange-50 text-orange-600'
                )}>
                  {generationProvider === 'gemini' ? 'Gemini' : 'Groq'}
                </span>
              </div>

              {/* Platform + counts */}
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
                {platform === 'twitter' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      localStorage.setItem('thread_content', generated)
                      router.push('/thread')
                    }}
                  >
                    <List className="h-3.5 w-3.5" /> Thread Builder
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (showVariations) { setShowVariations(false); return }
                    setGeneratingVariations(true)
                    try {
                      const res = await fetch('/api/generate-variations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: generated, platform }),
                      })
                      const data = await res.json()
                      if (data.bold || data.personal || data.concise) {
                        setVariations(data)
                      }
                    } catch (e) { console.error(e) }
                    setGeneratingVariations(false)
                    setShowVariations(true)
                  }}
                >
                  <Shuffle className="h-3.5 w-3.5" /> {showVariations ? 'Hide' : 'Variations'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRepurpose(!showRepurpose)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Repurpose
                </Button>
              </div>

              {/* Tone Variations Panel */}
              {showVariations && (
                <div className="bg-[#F8F9FF] rounded-xl p-4 border border-[#E8E5E0] mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {(['bold', 'personal', 'concise'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setActiveVariation(v)}
                        className={clsx(
                          'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                          activeVariation === v
                            ? 'bg-[#4F46E5] text-white'
                            : 'text-[#6B6560] hover:bg-[#EEF2FF]'
                        )}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white border border-[#E8E5E0] rounded-lg p-4 mb-3">
                    <p className="text-sm text-[#1A1714] whitespace-pre-wrap">
                      {generatingVariations ? 'Generating variations...' : variations?.[activeVariation] || 'No variation available'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const text = variations?.[activeVariation]
                        if (text) {
                          await navigator.clipboard.writeText(text)
                          showToast('Copied to clipboard')
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const text = variations?.[activeVariation]
                        if (text) {
                          setGenerated(text)
                          setShowVariations(false)
                        }
                      }}
                    >
                      Use this version
                    </Button>
                  </div>
                </div>
              )}

              {/* Repurpose Panel */}
              {showRepurpose && (
                <div className="bg-[#F8F9FF] rounded-xl p-4 border border-[#E8E5E0] mt-4">
                  <div className="text-xs font-medium text-[#6B6560] mb-3">Convert to:</div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {PLATFORMS.filter(p => p.id !== platform).map(p => (
                      <button
                        key={p.id}
                        onClick={async () => {
                          setRepurposing(true)
                          try {
                            const res = await fetch('/api/repurpose', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                content: generated,
                                fromPlatform: platform,
                                toPlatform: p.id,
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
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {repurposing && <p className="text-sm text-[#6B6560]">Repurposing...</p>}
                  {repurposedContent && (
                    <div className="bg-white border border-[#E8E5E0] rounded-lg p-4 mb-3">
                      <p className="text-sm text-[#1A1714] whitespace-pre-wrap">{repurposedContent}</p>
                    </div>
                  )}
                  {repurposedContent && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(repurposedContent)
                          showToast('Copied to clipboard')
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setGenerated(repurposedContent)
                          setShowRepurpose(false)
                          setRepurposedContent(null)
                        }}
                      >
                        Use this version
                      </Button>
                    </div>
                  )}
                </div>
              )}
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

      {/* Swipe File Drawer */}
      {swipeDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSwipeDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed md:right-0 md:top-0 md:bottom-0 md:w-96 bg-white border-l border-[#E8E5E0] p-6 overflow-y-auto z-50
            bottom-0 left-0 right-0 rounded-t-2xl border-t border-[#E8E5E0] md:rounded-none max-h-[70vh] md:max-h-none">
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-8 h-1 bg-[#E8E5E0] rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-medium text-[#1A1714]">Choose a structure</h2>
                <p className="text-xs text-[#6B6560] mt-1">Pick a post to use its structure as inspiration</p>
              </div>
              <button 
                onClick={() => setSwipeDrawerOpen(false)}
                className="p-1 hover:bg-[#F5F3F0] rounded-lg"
              >
                <X className="h-5 w-5 text-[#5C5A55]" />
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by content or hook type..."
              value={swipeSearch}
              onChange={e => setSwipeSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E8E5E0] rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />

            {/* Platform filter */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {(['All', 'Twitter', 'LinkedIn', 'Instagram', 'Facebook'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSwipePlatformFilter(p)}
                  className={clsx(
                    'px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                    swipePlatformFilter === p
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-white border border-[#E8E5E0] text-[#6B6560]'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Swipe posts list */}
            {swipePosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#6B6560] mb-2">Your swipe file is empty.</p>
                <a href="/swipe" className="text-sm text-[#4F46E5] hover:underline">Add posts at Swipe File →</a>
              </div>
            ) : (
              <div>
                {swipePosts
                  .filter(post => {
                    const matchesPlatform = swipePlatformFilter === 'All' || post.platform === swipePlatformFilter
                    const matchesSearch = !swipeSearch || 
                      post.content.toLowerCase().includes(swipeSearch.toLowerCase()) ||
                      (post.hook_type && post.hook_type.toLowerCase().includes(swipeSearch.toLowerCase()))
                    return matchesPlatform && matchesSearch
                  })
                  .map(post => (
                    <div
                      key={post.id}
                      onClick={() => setSwipeInspiration({
                        hook_type: post.hook_type || 'Question',
                        structure_notes: post.structure_notes || '',
                        content: post.content,
                        emotional_trigger: post.emotional_trigger || 'curiosity',
                      })}
                      className={clsx(
                        'bg-white border border-[#E8E5E0] rounded-xl p-4 mb-3 cursor-pointer transition-all',
                        swipeInspiration?.content === post.content 
                          ? 'border-2 border-[#4F46E5] bg-[#EEF2FF]'
                          : 'hover:border-[#4F46E5] hover:bg-[#F8F9FF]'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          post.platform === 'Twitter' ? 'bg-gray-900 text-white' :
                          post.platform === 'LinkedIn' ? 'bg-[#0077B5] text-white' :
                          post.platform === 'Instagram' ? 'bg-pink-500 text-white' :
                          'bg-[#1877F2] text-white'
                        )}>
                          {post.platform}
                        </span>
                        {post.hook_type && (
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            post.hook_type === 'Question' ? 'bg-blue-50 text-blue-700' :
                            post.hook_type === 'Bold statement' ? 'bg-red-50 text-red-700' :
                            post.hook_type === 'Story' ? 'bg-purple-50 text-purple-700' :
                            post.hook_type === 'Statistic' ? 'bg-green-50 text-green-700' :
                            post.hook_type === 'Controversial' ? 'bg-orange-50 text-orange-700' :
                            post.hook_type === 'How-to' ? 'bg-teal-50 text-teal-700' :
                            post.hook_type === 'List' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-pink-50 text-pink-700'
                          )}>
                            {post.hook_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#1A1714] line-clamp-3 mb-2">{post.content}</p>
                      {post.structure_notes && (
                        <p className="text-xs text-[#6B6560] truncate">
                          Why it works: {post.structure_notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Use this structure button */}
            {swipeInspiration && (
              <button
                onClick={() => {
                  setSwipeDrawerOpen(false)
                }}
                className="bg-[#4F46E5] text-white text-sm px-4 py-2 rounded-lg w-full mt-3"
              >
                Use this structure
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
