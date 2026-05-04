'use client'
import { useState, useEffect, useCallback } from 'react'

export type CalendarEntry = {
  id: string
  user_id: string
  scheduled_date: string
  platform: string
  topic: string | null
  post_id: string | null
  status: 'planned' | 'written' | 'published' | 'skipped'
  created_at: string
}

export function useCalendar() {
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data)
    } catch {
      setError('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const createEntry = useCallback(async (scheduled_date: string, platform: string, topic: string, status: string = 'planned') => {
    const tempId = `temp-${Date.now()}`
    const tempEntry: CalendarEntry = {
      id: tempId,
      user_id: '',
      scheduled_date,
      platform,
      topic,
      post_id: null,
      status: status as CalendarEntry['status'],
      created_at: new Date().toISOString(),
    }
    setEntries(prev => [...prev, tempEntry])

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_date, platform, topic, status }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      setEntries(prev => prev.map(e => e.id === tempId ? data : e))
      return data
    } catch (e) {
      setEntries(prev => prev.filter(e => e.id !== tempId))
      throw e
    }
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' })
    } catch {
      fetchEntries()
    }
  }, [fetchEntries])

  const updateEntryStatus = useCallback(async (id: string, status: CalendarEntry['status']) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }, [])

  return { entries, loading, error, createEntry, deleteEntry, updateEntryStatus, refetch: fetchEntries }
}