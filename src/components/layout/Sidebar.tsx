'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PenLine,
  Lightbulb,
  BookOpen,
  CalendarDays,
  BarChart2,
  Settings,
  Brain,
  Bookmark,
  List,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Avatar } from '../ui/Avatar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/write', label: 'Write', icon: PenLine },
  { href: '/thread', label: 'Thread', icon: List },
  { href: '/ideas', label: 'Idea Bank', icon: Lightbulb },
  { href: '/voice', label: 'Voice DNA', icon: Brain },
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/swipe', label: 'Swipe File', icon: Bookmark },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/insights', label: 'Insights', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user?: {
    name?: string
    email?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.display_name) setDisplayName(data.display_name)
      })
      .catch(() => {})
  }, [])

  const resolvedName = displayName || user?.name || 'User'

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E8E5E0] flex flex-col z-50">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center font-bold text-sm">
            PB
          </span>
          <span className="font-serif text-xl text-[#1A1714]">PostBrain</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#EEF2FF] text-[#4F46E5]'
                      : 'text-[#6B6560] hover:bg-[#FAFAF9] hover:text-[#1A1714]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#E8E5E0] pt-3">
        <div className="flex items-center gap-3">
          <Avatar name={resolvedName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1714] truncate">{resolvedName}</p>
            <p className="text-xs text-[#6B6560] truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}