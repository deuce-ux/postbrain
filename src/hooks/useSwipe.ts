'use client'
import { useState, useEffect, useCallback } from 'react'

export type ViralPost = {
  id: string
  user_id: string
  content: string
  platform: string
  hook_type: string | null
  structure_notes: string | null
  emotional_trigger: string | null
  created_at: string
}

export function useSwipe() {
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/swipe')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPosts(data)
    } catch {
      setError('Failed to load swipe file')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const createPost = useCallback(async (
    content: string,
    platform: string,
    hook_type: string,
    structure_notes: string,
    emotional_trigger: string
  ) => {
    const tempId = `temp-${Date.now()}`
    const tempPost: ViralPost = {
      id: tempId,
      user_id: '',
      content,
      platform,
      hook_type,
      structure_notes,
      emotional_trigger,
      created_at: new Date().toISOString(),
    }
    setPosts(prev => [tempPost, ...prev])

    try {
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform, hook_type, structure_notes, emotional_trigger }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setPosts(prev => prev.map(p => p.id === tempId ? data : p))
      return data
    } catch (e) {
      setPosts(prev => prev.filter(p => p.id !== tempId))
      throw e
    }
  }, [])

  const deletePost = useCallback(async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
    try {
      await fetch(`/api/swipe?id=${id}`, { method: 'DELETE' })
    } catch {
      fetchPosts()
    }
  }, [fetchPosts])

  return { posts, loading, error, createPost, deletePost, refetch: fetchPosts }
}