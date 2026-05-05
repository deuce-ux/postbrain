'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { clsx } from 'clsx'

const TONE_OPTIONS = [
  'Honest/Vulnerable',
  'Educational',
  'Inspirational',
  'Contrarian',
  'Funny/Light',
] as const

type Tone = typeof TONE_OPTIONS[number]

interface ClarificationData {
  idea: string
  mainPoint: string
  tone: Tone
  story: string
  platform: string
  writeMode: string
}

export default function ClarifyPage() {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [mainPoint, setMainPoint] = useState('')
  const [tone, setTone] = useState<Tone>('Honest/Vulnerable')
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<'write' | 'thread'>('write')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const storedIdea = localStorage.getItem('clarification_idea')
    const storedTarget = localStorage.getItem('clarification_target')
    if (storedIdea) {
      setIdea(storedIdea)
      localStorage.removeItem('clarification_idea')
    }
    if (storedTarget === 'thread') {
      setTarget('thread')
      localStorage.removeItem('clarification_target')
    }
    setLoading(false)
  }, [])

  const handleContinue = async () => {
    if (!mainPoint.trim()) return

    if (target === 'thread') {
      setGenerating(true)
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idea,
            platform: 'twitter',
            voice: { style: 'Conversational', examples: '' },
            writingMode: 'from idea',
            swipeInspiration: null,
            clarification: {
              mainPoint: mainPoint.trim(),
              tone,
              story: story.trim(),
            },
          }),
        })
        const data = await res.json()
        if (data.content) {
          localStorage.setItem('thread_content', data.content)
          router.push('/thread')
        }
      } catch (e) {
        console.error('Generation failed:', e)
        setGenerating(false)
      }
      return
    }

    const clarification: ClarificationData = {
      idea,
      mainPoint: mainPoint.trim(),
      tone,
      story: story.trim(),
      platform: 'twitter',
      writeMode: 'from idea',
    }

    localStorage.setItem('clarification', JSON.stringify(clarification))
    router.push('/write?generate=true')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-[#6B6560]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in">
      <button
        onClick={() => router.push('/write')}
        className="flex items-center gap-2 text-sm text-[#6B6560] hover:text-[#1A1714] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Write
      </button>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-[#4F46E5] tracking-widest mb-2">
            CLARIFY YOUR IDEA
          </p>
          <h1 className="font-serif text-2xl text-[#1A1714]">I Have An Idea</h1>
          <p className="text-sm text-[#6B6560] mt-1">Clarify your idea</p>
        </div>

        <div className="bg-[#FDF8F5] border border-[#E8E5E0] rounded-xl p-4">
          <p className="text-xs font-medium text-[#6B6560] mb-2">Your Idea:</p>
          <p className="text-sm text-[#1A1714] whitespace-pre-wrap">{idea}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="label">What&apos;s your main point in one sentence?</label>
            <Input
              value={mainPoint}
              onChange={(e) => setMainPoint(e.target.value)}
              placeholder="Sum up what you want to say..."
            />
          </div>

          <div className="space-y-2">
            <label className="label">What tone?</label>
            <div className="space-y-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-full border text-sm cursor-pointer w-full text-left transition-all',
                    tone === t
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'bg-white border-[#E8E5E0] text-[#6B6560] hover:border-[#4F46E5]/40'
                  )}
                >
                  <span
                    className={clsx(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      tone === t ? 'border-white' : 'border-[#E8E5E0]'
                    )}
                  >
                    {tone === t && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Any specific example or story? (Optional)</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Got a personal story or concrete example? Add it here..."
              rows={4}
              className="input-base min-h-[7rem]"
            />
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!mainPoint.trim() || generating}
          loading={generating}
          className="w-full"
          size="lg"
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}