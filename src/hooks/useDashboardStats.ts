'use client'
import { useState, useEffect } from 'react'

export function useDashboardStats() {
  const [stats, setStats] = useState({
    postsWritten: 0,
    ideasSaved: 0,
    postsPublished: 0,
    loading: true
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [postsRes, ideasRes] = await Promise.all([
          fetch('/api/posts'),
          fetch('/api/ideas')
        ])
        const posts = await postsRes.json()
        const ideas = await ideasRes.json()

        setStats({
          postsWritten: Array.isArray(posts) ? posts.length : 0,
          ideasSaved: Array.isArray(ideas) ? ideas.length : 0,
          postsPublished: Array.isArray(posts) 
            ? posts.filter((p: any) => p.status === 'published').length 
            : 0,
          loading: false
        })
      } catch {
        setStats(s => ({ ...s, loading: false }))
      }
    }
    fetchStats()
  }, [])

  return stats
}