'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setLoading(true)
    setWidth(30)
    
    const timer1 = setTimeout(() => setWidth(70), 100)
    const timer2 = setTimeout(() => setWidth(100), 300)
    const timer3 = setTimeout(() => {
      setLoading(false)
      setWidth(0)
    }, 500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div 
      className="fixed top-0 left-0 z-[100] h-0.5 bg-[#4F46E5] transition-all duration-300 pointer-events-none"
      style={{ width: `${width}%` }}
    />
  )
}
