'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FacebookImport } from '@/components/FacebookImport'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceStyle = 'conversational' | 'professional' | 'bold' | 'educational'

interface VoiceAnalysis {
  style_summary: string
  sentence_patterns: string
  tone: string
  signature_phrases: string[]
  topics: string[]
  avoid: string
  opening_style?: string
  closing_style?: string
  unique_traits?: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_TOPICS = [
  'Design', 'Tech', 'Business', 'Startups',
  'Productivity', 'Creativity', 'Culture', 'Personal Growth',
]

const STYLE_CARDS: { id: VoiceStyle; label: string; description: string }[] = [
  { id: 'conversational', label: 'Conversational', description: 'Like texting a smart friend. Casual, direct, no fluff.' },
  { id: 'professional', label: 'Professional', description: 'Polished but personal. Credible without being corporate.' },
  { id: 'bold', label: 'Bold', description: 'Strong opinions. Hot takes. You don\'t hedge.' },
  { id: 'educational', label: 'Educational', description: 'You teach. Break things down. Make complex things simple.' },
]

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'rounded-full transition-all duration-300',
            i === current ? 'w-3 h-3 bg-[#4F46E5]' : 'w-2 h-2 bg-[#E8E5E0]'
          )}
        />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VoicePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1 state
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [customTopic, setCustomTopic] = useState('')

  // Step 2 state
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('conversational')

  // Step 3 state
  const [examples, setExamples] = useState(['', '', ''])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')

  // Facebook import state
  const [facebookDone, setFacebookDone] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [isUpdate, setIsUpdate] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(profile => {
        if (profile.display_name) setDisplayName(profile.display_name)
        if (profile.role) setRole(profile.role)
        if (profile.project_description) setProjectDescription(profile.project_description)
        if (profile.content_topics && Array.isArray(profile.content_topics)) {
          setSelectedTopics(profile.content_topics)
        }
        if (profile.voice_style) setVoiceStyle(profile.voice_style as VoiceStyle)
        if (profile.voice_examples && Array.isArray(profile.voice_examples)) {
          const ex = [...profile.voice_examples]
          while (ex.length < 3) ex.push('')
          setExamples(ex)
        }
        if (profile.voice_dna) setAnalysis(profile.voice_dna)
        if (profile.voice_setup_complete) setIsUpdate(true)
      })
      .catch(() => {})
  }, [])

  // ── Topic helpers ─────────────────────────────────────────────────────────

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const addCustomTopic = () => {
    const t = customTopic.trim()
    if (t && !selectedTopics.includes(t)) {
      setSelectedTopics(prev => [...prev, t])
    }
    setCustomTopic('')
  }

  // ── Examples helpers ──────────────────────────────────────────────────────

  const updateExample = (i: number, val: string) => {
    setExamples(prev => prev.map((e, idx) => idx === i ? val : e))
  }

  const addExample = () => {
    if (examples.length < 5) setExamples(prev => [...prev, ''])
  }

  const removeExample = (i: number) => {
    if (examples.length > 3) setExamples(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Analyze voice ─────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    const filled = examples.filter(e => e.trim().length > 50)
    if (filled.length < 1) {
      setAnalyzeError('Add at least one post (50+ characters) to analyze.')
      return
    }
    setAnalyzing(true)
    setAnalysis(null)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examples: filled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setAnalysis(data)
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }, [examples])

  // ── Save & complete ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          role: role.trim() || null,
          project_description: projectDescription.trim() || null,
          content_topics: selectedTopics,
          voice_style: voiceStyle,
          voice_examples: examples.filter(e => e.trim()),
          voice_dna: analysis || null,
          voice_setup_complete: true,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setToast('Voice DNA saved. PostBrain now writes like you.')
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch {
      setToast('Failed to save. Please try again.')
      setSaving(false)
    }
  }, [displayName, role, projectDescription, selectedTopics, voiceStyle, examples, analysis, router])

  // ── Facebook import success ───────────────────────────────────────────────

  const handleFacebookSuccess = useCallback((fbAnalysis: VoiceAnalysis) => {
    setAnalysis(fbAnalysis)
    setFacebookDone(true)
    setToast('Voice DNA updated from Facebook. Redirecting…')
    setTimeout(() => router.push('/dashboard'), 2000)
  }, [router])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-2 animate-fade-in md:px-4 md:py-2">

      {/* Header */}
      <div className="mb-8 space-y-3">
        {isUpdate && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-medium text-emerald-800">Voice DNA is set up</p>
          </div>
        )}
        <StepDots current={step} total={3} />
        <h1 className="page-title">Voice DNA</h1>
        <p className="text-text-secondary">Help PostBrain write exactly like you</p>
      </div>

      {/* ── Step 1: About You ── */}
      {step === 0 && (
        <div className="space-y-5 animate-slide-up">
          <h2 className="font-serif text-xl text-text-primary">About you</h2>

          <div className="space-y-1.5">
            <label className="label">What should we call you?</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name or handle"
              className="input-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">What do you do?</label>
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Founder, Designer, Writer"
              className="input-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">What&apos;s your main project?</label>
            <input
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder="e.g. Building a SaaS for content creators"
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label className="label">What do you mostly write about?</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TOPICS.map(topic => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150',
                    selectedTopics.includes(topic)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-text-secondary border-border hover:border-accent/40 hover:text-text-primary'
                  )}
                >
                  {topic}
                </button>
              ))}
              {selectedTopics.filter(t => !PRESET_TOPICS.includes(t)).map(topic => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-accent text-white border border-accent"
                >
                  {topic}
                  <button onClick={() => toggleTopic(topic)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTopic() } }}
                placeholder="Add custom topic..."
                className="input-base flex-1"
              />
              <Button variant="secondary" size="sm" onClick={addCustomTopic} disabled={!customTopic.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={() => setStep(1)} className="w-full">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Writing Style ── */}
      {step === 1 && (
        <div className="space-y-5 animate-slide-up">
          <h2 className="font-serif text-xl text-text-primary">How do you write?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STYLE_CARDS.map(({ id, label, description }) => (
              <button
                key={id}
                onClick={() => setVoiceStyle(id)}
                className={clsx(
                  'text-left p-4 rounded-card border-2 transition-all duration-150',
                  voiceStyle === id
                    ? 'border-accent bg-accent-light'
                    : 'border-border bg-surface hover:border-accent/40'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx('font-medium text-sm mb-1', voiceStyle === id ? 'text-accent' : 'text-text-primary')}>
                    {label}
                  </p>
                  {voiceStyle === id && <Check className="h-4 w-4 text-accent shrink-0" />}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(2)} className="flex-1">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Examples ── */}
      {step === 2 && (
        <div className="space-y-5 animate-slide-up">
          <div>
            <h2 className="font-serif text-xl text-text-primary">Show me how you write</h2>
            <p className="text-text-secondary text-sm mt-1">
              Paste 3–5 of your best posts. The more you give, the better I match your voice.
            </p>
          </div>

          {/* Option A: Facebook import */}
          {!facebookDone && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Option A — Import automatically</p>
              <FacebookImport onSuccess={handleFacebookSuccess} />
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-secondary">or add manually below</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {examples.map((ex, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label">Post {i + 1}</label>
                  {i >= 3 && (
                    <button
                      onClick={() => removeExample(i)}
                      className="text-xs text-text-secondary hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={ex}
                  onChange={e => updateExample(i, e.target.value)}
                  placeholder={`Paste post ${i + 1} here...`}
                  rows={4}
                  className="input-base resize-none"
                />
              </div>
            ))}

            {examples.length < 5 && (
              <button
                onClick={addExample}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Add another post
              </button>
            )}
          </div>

          {/* Analyze button */}
          {!analysis && (
            <Button
              onClick={handleAnalyze}
              loading={analyzing}
              variant="secondary"
              className="w-full"
              disabled={examples.every(e => e.trim().length < 50)}
            >
              {analyzing ? 'Reading your writing patterns…' : 'Analyze my voice'}
            </Button>
          )}

          {analyzeError && (
            <p className="text-sm text-destructive">{analyzeError}</p>
          )}

          {/* Analysis result card */}
          {analysis && (
            <div className="bg-[#EEF2FF] border border-[#4F46E5]/20 rounded-xl p-4 space-y-3 animate-slide-up">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm font-medium text-accent">Your voice in a nutshell</p>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">{analysis.style_summary}</p>
              {analysis.topics?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.topics.map(t => (
                    <span key={t} className="badge bg-accent/10 text-accent text-xs capitalize">{t}</span>
                  ))}
                </div>
              )}
              <button
                onClick={handleAnalyze}
                className="text-xs text-text-secondary underline hover:text-text-primary transition-colors"
              >
                Re-analyze
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {saving ? (isUpdate ? 'Updating…' : 'Saving…') : (isUpdate ? 'Update Voice DNA' : 'Save Voice DNA')}
            </Button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-text-primary text-white text-sm px-4 py-2.5 rounded-button shadow-card-elevated animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
