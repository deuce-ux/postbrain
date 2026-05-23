'use client'
import { useState, useEffect } from 'react'
import { Flame, Target, TrendingUp } from 'lucide-react'

export function StreakWidget() {
  const [stats, setStats] = useState({
    streak: 0,
    thisWeekPosts: 0,
    weeklyGoal: 5,
    totalPosts: 0,
    loading: true
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('5')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setStats(s => ({ ...s, loading: false }))
          return
        }
        setStats({
          streak: data.streak ?? 0,
          thisWeekPosts: data.thisWeekPosts ?? 0,
          weeklyGoal: data.weeklyGoal ?? 5,
          totalPosts: data.totalPosts ?? 0,
          loading: false,
        })
        setGoalInput(String(data.weeklyGoal ?? 5))
      })
      .catch(() => setStats(s => ({ ...s, loading: false })))
  }, [])

  const saveGoal = async () => {
    const goal = parseInt(goalInput)
    if (!goal || goal < 1) return
    await fetch('/api/stats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly_goal: goal })
    })
    setStats(s => ({ ...s, weeklyGoal: goal }))
    setEditingGoal(false)
  }

  const progress = stats.weeklyGoal > 0
    ? Math.min((stats.thisWeekPosts / stats.weeklyGoal) * 100, 100)
    : 0

  const remaining = Math.max(stats.weeklyGoal - stats.thisWeekPosts, 0)

  return (
    <div className="bg-white border border-[#E8E5E0] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#1A1714]">Your Progress</h3>
        <button
          onClick={() => setEditingGoal(!editingGoal)}
          className="text-xs text-[#4F46E5]"
        >
          {editingGoal ? 'Cancel' : 'Set goal'}
        </button>
      </div>

      {editingGoal && (
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            className="w-20 border border-[#E8E5E0] rounded-lg px-3 py-1.5 text-sm"
            placeholder="5"
            min="1"
            max="30"
          />
          <span className="text-sm text-[#6B6560] self-center">posts/week</span>
          <button
            onClick={saveGoal}
            className="bg-[#4F46E5] text-white text-xs px-3 py-1.5 rounded-lg"
          >
            Save
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Day streak */}
        <div className="text-center">
          <Flame size={18} className="text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-semibold text-[#1A1714]">
            {stats.loading ? '—' : stats.streak}
          </p>
          <p className="text-xs text-[#6B6560]">day streak</p>
        </div>

        {/* This week */}
        <div className="text-center">
          <Target size={18} className="text-[#4F46E5] mx-auto mb-1" />
          <p className="text-2xl font-semibold text-[#1A1714]">
            {stats.loading ? '—' : `${stats.thisWeekPosts}/${stats.weeklyGoal}`}
          </p>
          <p className="text-xs text-[#6B6560]">this week</p>
        </div>

        {/* Total posts */}
        <div className="text-center">
          <TrendingUp size={18} className="text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-semibold text-[#1A1714]">
            {stats.loading ? '—' : stats.totalPosts}
          </p>
          <p className="text-xs text-[#6B6560]">total posts</p>
        </div>
      </div>

      <div className="w-full bg-[#F0F0F0] rounded-full h-2">
        <div
          className="bg-[#4F46E5] h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[#6B6560] mt-1.5 text-right">
        {stats.loading
          ? ''
          : stats.thisWeekPosts >= stats.weeklyGoal
          ? '🎉 Goal reached!'
          : `${remaining} more to reach your goal`}
      </p>
    </div>
  )
}
