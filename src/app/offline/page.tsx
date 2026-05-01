'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 bg-[#EEF2FF] rounded-full flex items-center 
                        justify-center mx-auto mb-6">
          <span className="text-2xl">📡</span>
        </div>
        <h1 className="font-serif text-2xl text-[#1A1714] mb-3">
          You&apos;re offline
        </h1>
        <p className="text-sm text-[#6B6560] mb-6">
          No internet connection. Ideas you capture will sync when you&apos;re back online.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#4F46E5] text-white px-6 py-2.5 rounded-lg text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}