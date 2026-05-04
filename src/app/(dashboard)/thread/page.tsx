'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Trash2, Copy, Check, 
  BookMarked
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

interface Tweet {
  id: string
  content: string
}

function getCharacterColor(count: number): string {
  if (count <= 240) return 'text-green-600'
  if (count <= 270) return 'text-amber-600'
  return 'text-red-600'
}

export default function ThreadPage() {
  const router = useRouter()
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({})

  useEffect(() => {
    const threadContent = localStorage.getItem('thread_content')
    if (threadContent) {
      const lines = threadContent.split('\n')
      const parsed: Tweet[] = []
      let currentTweet = ''
      
      for (const line of lines) {
        if (/^\d+\/\s/.test(line)) {
          if (currentTweet.trim()) {
            parsed.push({ id: crypto.randomUUID(), content: currentTweet.trim() })
          }
          currentTweet = line.replace(/^\d+\/\s*/, '').trim()
        } else {
          currentTweet += '\n' + line
        }
      }
      if (currentTweet.trim()) {
        parsed.push({ id: crypto.randomUUID(), content: currentTweet.trim() })
      }
      
      if (parsed.length > 0) {
        setTweets(parsed)
      } else {
        setTweets([{ id: crypto.randomUUID(), content: '' }])
      }
    } else {
      setTweets([{ id: crypto.randomUUID(), content: '' }])
    }
  }, [])

  const addTweet = (afterId?: string) => {
    const newTweet = { id: crypto.randomUUID(), content: '' }
    if (afterId) {
      const idx = tweets.findIndex(t => t.id === afterId)
      setTweets([...tweets.slice(0, idx + 1), newTweet, ...tweets.slice(idx + 1)])
    } else {
      setTweets([...tweets, newTweet])
    }
    setTimeout(() => {
      textareaRefs.current[newTweet.id]?.focus()
    }, 50)
  }

  const updateTweet = (id: string, content: string) => {
    setTweets(tweets.map(t => t.id === id ? { ...t, content } : t))
  }

  const deleteTweet = (id: string) => {
    if (tweets.length === 1) return
    setTweets(tweets.filter(t => t.id !== id))
  }

  const handleCopyAll = async () => {
    const formatted = tweets
      .map((t, i) => `${i + 1}/ ${t.content}`)
      .join('\n\n')
    await navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToLibrary = async () => {
    const fullContent = tweets.map((t, i) => `${i + 1}/ ${t.content}`).join('\n\n')
    setSaving(true)
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_text: fullContent,
          platform: 'twitter',
          original_idea: tweets[0]?.content.slice(0, 100) || 'Thread',
        }),
      })
      localStorage.removeItem('thread_content')
      router.push('/library')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] gap-0 -m-6 md:-m-10 lg:-m-12 animate-fade-in">
      {/* Left Panel - Editor */}
      <div className="w-full md:w-1/2 p-4 overflow-y-auto">
        <div className="bg-white border border-[#E8E5E0] rounded-xl p-4 mb-4">
          <div className="mb-4">
            <h1 className="page-title">Thread Builder</h1>
            <p className="text-sm text-[#6B6560]">Build and edit your Twitter thread</p>
          </div>

          {showImport && (
            <div className="mb-4 p-3 bg-[#EEF2FF] rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4F46E5]">Import from Write page?</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    const content = localStorage.getItem('thread_content')
                    if (content) {
                      const lines = content.split('\n')
                      const parsed: Tweet[] = []
                      let currentTweet = ''
                      for (const line of lines) {
                        if (/^\d+\/\s/.test(line)) {
                          if (currentTweet.trim()) {
                            parsed.push({ id: crypto.randomUUID(), content: currentTweet.trim() })
                          }
                          currentTweet = line.replace(/^\d+\/\s*/, '').trim()
                        } else {
                          currentTweet += '\n' + line
                        }
                      }
                      if (currentTweet.trim()) {
                        parsed.push({ id: crypto.randomUUID(), content: currentTweet.trim() })
                      }
                      if (parsed.length > 0) setTweets(parsed)
                    }
                    setShowImport(false)
                  }}>
                    Import
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowImport(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tweets.map((tweet, idx) => (
              <div key={tweet.id} className="relative group">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center pt-2">
                    <span className="bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium px-2 py-0.5 rounded">
                      {idx + 1}
                    </span>
                    <button 
                      onClick={() => deleteTweet(tweet.id)}
                      className="mt-2 p-1 text-[#9A958F] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={tweets.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <textarea
                      ref={el => { if (el) textareaRefs.current[tweet.id] = el }}
                      value={tweet.content}
                      onChange={e => updateTweet(tweet.id, e.target.value)}
                      placeholder={`Tweet ${idx + 1}...`}
                      className="w-full border border-[#E8E5E0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                      rows={3}
                      style={{ minHeight: '80px' }}
                    />
                    <div className={clsx(
                      'text-xs mt-1',
                      getCharacterColor(tweet.content.length)
                    )}>
                      {tweet.content.length}/280
                    </div>
                  </div>
                </div>
                {idx < tweets.length - 1 && (
                  <div className="flex justify-center my-2">
                    <button
                      onClick={() => addTweet(tweet.id)}
                      className="p-1 bg-[#F5F3F0] rounded-full text-[#6B6560] hover:bg-[#E8E5E0] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => addTweet()} className="flex-1">
              <Plus className="h-4 w-4 mr-1" /> Add tweet
            </Button>
            <Button variant="secondary" onClick={handleCopyAll}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{copied ? 'Copied!' : 'Copy all'}</span>
            </Button>
          </div>

          <Button 
            variant="secondary" 
            className="w-full mt-2" 
            onClick={handleSaveToLibrary}
            loading={saving}
          >
            <BookMarked className="h-4 w-4 mr-1" /> Save to Library
          </Button>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="hidden md:block w-1/2 p-4 border-l border-[#E8E5E0] overflow-y-auto bg-[#F5F3F0]">
        <div className="bg-white border border-[#E8E5E0] rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#6B6560] mb-4">Preview</h3>
          <div className="space-y-0">
            {tweets.map((tweet, idx) => (
              <div key={tweet.id} className="relative">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    U
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#1A1714]">You</span>
                      <span className="text-[#6B6560] text-sm">@username</span>
                    </div>
                    <p className="text-sm text-[#1A1714] whitespace-pre-wrap">{tweet.content || '(empty)'}</p>
                    <div className={clsx(
                      'text-xs mt-1',
                      getCharacterColor(tweet.content.length)
                    )}>
                      {tweet.content.length}/280
                    </div>
                  </div>
                </div>
                {idx < tweets.length - 1 && (
                  <div className="absolute left-[28px] top-12 bottom-0 w-0.5 bg-[#E8E5E0]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}