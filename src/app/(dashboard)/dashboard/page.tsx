'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Lightbulb, FileText, Send, Check } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const [ideaCount, setIdeaCount] = useState<number | null>(null)
  const [quickCapture, setQuickCapture] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/ideas')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setIdeaCount(data.length))
      .catch(() => {})
  }, [saved])

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = quickCapture.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      setQuickCapture('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const stats = [
    { label: 'Posts Written', value: 12, icon: FileText },
    { label: 'Ideas Saved', value: ideaCount ?? '—', icon: Lightbulb },
    { label: 'Posts Published', value: 8, icon: Send },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="page-title">Good {getGreeting()}, Alex</h1>
        <p className="text-text-secondary">{formatDate()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-button bg-accent-light">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">{stat.value}</p>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <form onSubmit={handleQuickCapture} className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full md:max-w-md space-y-1.5">
          <label className="label">Quick Capture</label>
          <input
            value={quickCapture}
            onChange={e => setQuickCapture(e.target.value)}
            placeholder="Quick capture an idea..."
            className="input-base"
          />
        </div>
        <Button type="submit" loading={saving} disabled={!quickCapture.trim()}>
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            '+ Add Idea'
          )}
        </Button>
        <Link href="/write">
          <Button variant="secondary">Start Writing</Button>
        </Link>
      </form>

      <Card>
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-border mb-4 flex items-center justify-center">
            <FileText className="h-8 w-8 text-text-secondary" />
          </div>
          <h3 className="font-serif text-lg text-text-primary mb-2">No posts yet</h3>
          <p className="text-text-secondary text-sm mb-4">
            Start writing your first post to see it here
          </p>
          <Link href="/write">
            <Button variant="secondary">Create your first post</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
