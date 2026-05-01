'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface DeferredPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as DeferredPrompt)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 
                    bg-white border border-[#E8E5E0] rounded-xl shadow-lg 
                    px-4 py-3 flex items-center gap-3 max-w-sm w-full mx-4">
      <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center 
                      justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">PB</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1714]">Install PostBrain</p>
        <p className="text-xs text-[#6B6560]">Add to home screen</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-[#4F46E5] text-white text-xs px-3 py-1.5 
                   rounded-lg font-medium flex-shrink-0"
      >
        Install
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="text-[#6B6560] hover:text-[#1A1714] flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}