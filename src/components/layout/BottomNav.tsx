'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, PenLine, Lightbulb, 
  BookOpen, Settings 
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/write', icon: PenLine, label: 'Write' },
  { href: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t 
                    border-[#E8E5E0] px-2 py-2 flex items-center 
                    justify-around z-50 md:hidden">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 
                       rounded-lg transition-colors ${
                         active 
                           ? 'text-[#4F46E5]' 
                           : 'text-[#6B6560] hover:text-[#1A1714]'
                       }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}