'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, FileJson, ChevronDown, ChevronUp } from 'lucide-react'
import { parseFacebookPosts } from '@/lib/parseFacebookData'

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

interface FacebookImportProps {
  onSuccess: (analysis: VoiceAnalysis, postsCount: number) => void
}

export function FacebookImport({ onSuccess }: FacebookImportProps) {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'done'>('upload')
  const [error, setError] = useState<string | null>(null)
  const [postsFound, setPostsFound] = useState(0)
  const [showInstructions, setShowInstructions] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [analyzingMessage, setAnalyzingMessage] = useState('Analyzing...')

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setStep('analyzing')
    setAnalyzingMessage('Reading file...')

    try {
      const text = await file.text()
      setAnalyzingMessage('Extracting posts...')

      const json = JSON.parse(text)
      const posts = parseFacebookPosts(json)

      if (posts.length === 0) {
        setError('No posts found in this file. Make sure you selected the correct JSON file from your Facebook data download.')
        setStep('upload')
        return
      }

      setPostsFound(posts.length)
      setAnalyzingMessage(`Analyzing ${posts.length} posts...`)

      const response = await fetch('/api/import-facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      })

      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()
      setStep('done')
      onSuccess(data.analysis, posts.length)
    } catch {
      setError('Failed to process file. Make sure it is a valid Facebook JSON export.')
      setStep('upload')
    }
  }, [onSuccess])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="bg-white border border-[#E8E5E0] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#E7F3FF] rounded-xl flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-base font-medium text-[#1A1714]">Import from Facebook</h3>
          <p className="text-xs text-[#6B6560]">Analyze up to 50 of your posts for better voice matching</p>
        </div>
      </div>

      {/* Instructions toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowInstructions(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[#4F46E5] mb-2"
        >
          How to download your Facebook data
          {showInstructions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showInstructions && (
          <div className="bg-[#F8F9FF] border border-[#E8E5E0] rounded-xl p-4 text-sm text-[#6B6560] space-y-2">
            <p className="font-medium text-[#1A1714] mb-3">Steps to export your posts:</p>
            {[
              <>Open Facebook → click your profile picture (top right) → <strong>Settings &amp; Privacy</strong> → <strong>Settings</strong></>,
              <>In the left sidebar click <strong>Your Facebook Information</strong> → <strong>Download Your Information</strong></>,
              <>Set format to <strong>JSON</strong>, date range <strong>All time</strong>, then deselect everything except <strong>Posts</strong></>,
              <>Click <strong>Request a download</strong>. Facebook will email you when it&apos;s ready (usually a few minutes)</>,
              <>Download the ZIP, extract it, find <strong>your_posts/your_posts_1.json</strong> and upload it below</>,
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-5 h-5 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* States */}
      {step === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? 'border-[#4F46E5] bg-[#EEF2FF]'
                : 'border-[#E8E5E0] hover:border-[#4F46E5] hover:bg-[#F8F9FF]'
            }`}
          >
            <FileJson size={32} className="text-[#6B6560] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#1A1714] mb-1">Drop your JSON file here</p>
            <p className="text-xs text-[#6B6560] mb-4">or click to browse</p>
            <label className="bg-[#4F46E5] text-white text-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-[#4338CA] transition-colors">
              Choose file
              <input type="file" accept=".json" className="hidden" onChange={handleFileInput} />
            </label>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'analyzing' && (
        <div className="text-center py-8">
          <div className="w-10 h-10 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-[#1A1714] mb-1">{analyzingMessage}</p>
          <p className="text-xs text-[#6B6560]">Reading through your posts to understand your voice</p>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-base font-medium text-[#1A1714] mb-1">Voice DNA updated!</p>
          <p className="text-sm text-[#6B6560]">Analyzed {postsFound} posts from your Facebook history</p>
        </div>
      )}
    </div>
  )
}
