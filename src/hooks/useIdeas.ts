'use client'
import { useState, useEffect, useCallback } from 'react'

export type Idea = {
  id: string
  content: string
  source: string
  tags: string[]
  status: 'raw' | 'ready' | 'used'
  created_at: string
  used_at: string | null
}

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/ideas')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setIdeas(data)
    } catch {
      setError('Failed to load ideas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  const createIdea = useCallback(async (content: string, tags: string[] = []) => {
    const tempId = `temp-${Date.now()}`
    const tempIdea: Idea = {
      id: tempId, content, tags, source: 'manual',
      status: 'raw', created_at: new Date().toISOString(), used_at: null,
    }
    setIdeas(prev => [tempIdea, ...prev])

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setIdeas(prev => prev.map(i => i.id === tempId ? data : i))
      return data
    } catch (e) {
      setIdeas(prev => prev.filter(i => i.id !== tempId))
      throw e
    }
  }, [])

  const deleteIdea = useCallback(async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id))
    try {
      await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
    } catch {
      fetchIdeas()
    }
  }, [fetchIdeas])

  const updateIdea = useCallback(async (id: string, updates: Partial<Idea>) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    try {
      await fetch(`/api/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      fetchIdeas()
    }
  }, [fetchIdeas])

  return { ideas, loading, error, createIdea, deleteIdea, updateIdea, refetch: fetchIdeas }
}
