import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          PostBrain
        </h1>
        <p className="text-xl text-gray-400 mb-10">
          AI-powered content creation that writes in your voice.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}
