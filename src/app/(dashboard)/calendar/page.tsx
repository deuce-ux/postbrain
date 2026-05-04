'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'
import { useCalendar, type CalendarEntry } from '@/hooks/useCalendar'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

type ViewMode = 'month' | 'list'
type Platform = 'Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook'
type Status = 'planned' | 'written' | 'published' | 'skipped'

const PLATFORMS: Platform[] = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook']
const STATUS_OPTIONS: Status[] = ['planned', 'written', 'published', 'skipped']

const PLATFORM_COLORS: Record<Platform, string> = {
  Twitter: 'bg-gray-900 text-white',
  LinkedIn: 'bg-[#0077B5] text-white',
  Instagram: 'bg-pink-500 text-white',
  Facebook: 'bg-[#1877F2] text-white',
}

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  planned: { bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]' },
  written: { bg: 'bg-amber-50', text: 'text-amber-700' },
  published: { bg: 'bg-green-50', text: 'text-green-700' },
  skipped: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getMonthData(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const totalDays = lastDay.getDate()
  
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = []
  
  for (let i = 0; i < startDay; i++) {
    week.push(null)
  }
  
  for (let day = 1; day <= totalDays; day++) {
    week.push(new Date(year, month, day))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null)
    }
    weeks.push(week)
  }
  
  return weeks
}



interface AddPostPanelProps {
  selectedDate: Date | null
  onClose: () => void
  onAdd: (platform: Platform, topic: string, status: Status) => void
  saving: boolean
}

function AddPostPanel({ selectedDate, onClose, onAdd, saving }: AddPostPanelProps) {
  const [platform, setPlatform] = useState<Platform>('Twitter')
  const [topic, setTopic] = useState('')

  const handleSubmit = () => {
    if (!selectedDate || !topic.trim()) return
    onAdd(platform, topic.trim(), 'planned')
  }

  if (!selectedDate) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E8E5E0]">
          <h2 className="font-serif text-lg text-[#1A1714]">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F3F0] rounded-lg transition-colors">
            <X className="h-5 w-5 text-[#5C5A55]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={clsx(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    platform === p
                      ? PLATFORM_COLORS[p]
                      : 'bg-[#F5F3F0] text-[#5C5A55] hover:bg-[#E8E5E0]'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5A55] mb-2">
              What will you write about?
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Your topic idea..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E5E0] bg-white text-[#1A1714] placeholder-[#9A958F] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
            />
          </div>

          <Button onClick={handleSubmit} loading={saving} className="w-full" disabled={!topic.trim()}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  )
}

interface WeekGroup {
  weekStart: Date
  weekEnd: Date
  entries: CalendarEntry[]
}

function ListView({ 
  entries, 
  onDelete, 
  onStatusChange 
}: { 
  entries: CalendarEntry[]
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const grouped = useMemo(() => {
    const groups: WeekGroup[] = []
    const sorted = [...entries].sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    )
    
    sorted.forEach(entry => {
      const date = new Date(entry.scheduled_date)
      const dayOfWeek = date.getDay()
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const existingGroup = groups.find(g => 
        g.weekStart.getTime() === weekStart.getTime()
      )
      
      if (existingGroup) {
        existingGroup.entries.push(entry)
      } else {
        groups.push({ weekStart, weekEnd, entries: [entry] })
      }
    })
    
    return groups
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#F5F3F0] flex items-center justify-center mb-4">
          <ChevronRight className="h-8 w-8 text-[#9A958F]" />
        </div>
        <h3 className="font-serif text-lg text-[#1A1714] mb-2">No posts scheduled</h3>
        <p className="text-[#5C5A55] text-sm">Click any day to add one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map((group, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-[#E8E5E0] overflow-hidden shadow-[0_1px_3px_0_rgba(26,23,20,0.06)]">
          <div className="px-4 py-2 bg-[#F5F3F0] border-b border-[#E8E5E0]">
            <span className="text-sm font-medium text-[#5C5A55]">
              {group.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {group.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="divide-y divide-[#E8E5E0]">
            {group.entries
              .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
              .map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-4 hover:bg-[#FAF9F7] transition-colors">
                  <span className={clsx('px-2 py-1 rounded text-xs font-medium', PLATFORM_COLORS[entry.platform as Platform])}>
                    {entry.platform}
                  </span>
                  <span className="text-sm text-[#1A1714] min-w-[100px]">
                    {new Date(entry.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex-1 text-sm text-[#1A1714] truncate">
                    {entry.topic}
                  </span>
                  <button
                    onClick={() => {
                      const currentIdx = STATUS_OPTIONS.indexOf(entry.status)
                      const nextStatus = STATUS_OPTIONS[(currentIdx + 1) % STATUS_OPTIONS.length]
                      onStatusChange(entry.id, nextStatus)
                    }}
                    className={clsx(
                      'px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity',
                      STATUS_COLORS[entry.status].bg,
                      STATUS_COLORS[entry.status].text
                    )}
                  >
                    {entry.status}
                  </button>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="p-1.5 text-[#9A958F] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CalendarPage() {
  const { entries, loading, createEntry, deleteEntry, updateEntryStatus } = useCalendar()
  
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  const today = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  
  const monthData = useMemo(() => getMonthData(currentYear, currentMonth), [currentYear, currentMonth])
  
  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {}
    entries.forEach(entry => {
      const dateKey = entry.scheduled_date.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(entry)
    })
    return map
  }, [entries])

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleAddPost = async (platform: Platform, topic: string, status: Status) => {
    if (!selectedDate) return
    setSaving(true)
    try {
      await createEntry(formatDate(selectedDate), platform, topic, status)
      setSelectedDate(null)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = (id: string, status: Status) => {
    updateEntryStatus(id, status)
  }

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear()
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-6 animate-fade-in px-4 py-4 md:px-10 md:py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="text-[#5C5A55] mt-1">Plan your content weeks ahead</p>
        </div>
        <div className="flex gap-1 bg-[#F5F3F0] p-1 rounded-lg">
          <button
            onClick={() => setView('month')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'month' 
                ? 'bg-white text-[#1A1714] shadow-sm' 
                : 'text-[#5C5A55] hover:text-[#1A1714]'
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === 'list' 
                ? 'bg-white text-[#1A1714] shadow-sm' 
                : 'text-[#5C5A55] hover:text-[#1A1714]'
            )}
          >
            List
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-[#F5F3F0] rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-[#5C5A55]" />
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors">
            Today
          </button>
          <button onClick={goToNextMonth} className="p-2 hover:bg-[#F5F3F0] rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5 text-[#5C5A55]" />
          </button>
        </div>
        <h2 className="font-serif text-xl text-[#1A1714]">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#E8E5E0] p-8">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-8 bg-[#F5F3F0] rounded" />
              ))}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, j) => (
                  <div key={j} className="h-24 bg-[#F5F3F0] rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : view === 'month' ? (
        <div className="bg-white rounded-xl border border-[#E8E5E0] overflow-hidden shadow-[0_1px_3px_0_rgba(26,23,20,0.06)]">
          <div className="grid grid-cols-7 border-b border-[#E8E5E0]">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-[#5C5A55]">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthData.map((week, wi) => (
              week.map((day, di) => {
                const dateKey = day ? formatDate(day) : ''
                const dayEntries = day ? entriesByDate[dateKey] || [] : []
                const todayClass = day && isToday(day)
                
                return (
                  <div
                    key={`${wi}-${di}`}
                    onClick={() => day && setSelectedDate(day)}
                    className={clsx(
                      'min-h-[100px] border-b border-r border-[#E8E5E0] p-2 transition-colors',
                      day ? 'hover:bg-[#FAF9F7] cursor-pointer' : 'bg-[#FDFCFB]',
                      di === 6 && 'border-r-0',
                      todayClass && 'bg-[#EEF2FF] border border-[#4F46E5]'
                    )}
                  >
                    {day && (
                      <>
                        <span className={clsx(
                          'text-sm font-medium',
                          todayClass ? 'text-[#4F46E5]' : 'text-[#1A1714]'
                        )}>
                          {day.getDate()}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayEntries.slice(0, 3).map(entry => (
                            <div
                              key={entry.id}
                              className={clsx(
                                'px-1.5 py-0.5 rounded text-xs font-medium truncate',
                                PLATFORM_COLORS[entry.platform as Platform]
                              )}
                              title={entry.topic || entry.platform}
                            >
                              {entry.topic || entry.platform}
                            </div>
                          ))}
                          {dayEntries.length > 3 && (
                            <div className="text-xs text-[#9A958F]">
                              +{dayEntries.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            ))}
          </div>
        </div>
      ) : (
        <ListView 
          entries={entries} 
          onDelete={deleteEntry} 
          onStatusChange={handleStatusChange}
        />
      )}

      {selectedDate && (
        <AddPostPanel
          selectedDate={selectedDate}
          onClose={() => setSelectedDate(null)}
          onAdd={handleAddPost}
          saving={saving}
        />
      )}
    </div>
  )
}