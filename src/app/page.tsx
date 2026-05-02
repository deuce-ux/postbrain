import Link from "next/link";
import { Lightbulb, Mic, PenLine } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-[#E8E5E0]">
        <div className="flex items-center justify-between px-6 md:px-10 py-5" style={{ maxWidth: '90rem' }}>
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center font-bold text-sm">
              PB
            </span>
            <span className="font-serif text-xl text-[#1A1714]">PostBrain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-[#6B6560] hover:text-[#1A1714] transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth"
              className="hidden sm:inline-flex bg-[#4F46E5] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4338CA] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main 
        className="px-6 md:px-10 pt-16 pb-10 md:pt-20 md:pb-10 text-center"
        style={{ background: 'linear-gradient(180deg, #EEF2FF 0%, #FAFAF9 60%)' }}
      >
        {/* Tag pill */}
        <div className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
          <span className="text-xs text-[#4F46E5] font-medium">AI-powered content creation</span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1A1714] leading-tight mb-4 max-w-2xl mx-auto">
          Write posts that sound <span className="text-[#4F46E5]">exactly like you</span>
        </h1>

        {/* Subheading */}
        <p className="text-base md:text-lg text-[#6B6560] max-w-md mx-auto mb-8">
          Stop sounding like every other creator. PostBrain learns your voice and generates content that&apos;s unmistakably yours.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/auth"
            className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-[#4338CA] transition-colors"
          >
            Start for free →
          </Link>
          <Link
            href="/auth"
            className="w-full sm:w-auto bg-white text-[#1A1714] border border-[#E8E5E0] px-8 py-3 rounded-xl text-sm font-medium hover:bg-[#FAFAF9] transition-colors"
          >
            See how it works
          </Link>
        </div>

        <p className="text-xs text-[#6B6560] mt-4">Free to start · No credit card required</p>
      </main>

      {/* Features Section */}
      <section className="bg-[#FAFAF9] px-6 md:px-10 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-medium text-[#4F46E5] tracking-widest text-center mb-3">FEATURES</p>
          <h2 className="font-serif text-2xl md:text-3xl text-[#1A1714] text-center mb-3">Everything you need to write better</h2>
          <p className="text-sm text-[#6B6560] text-center mb-10">From capturing ideas to publishing — all in one place</p>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 - Idea Bank */}
            <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6 hover:-translate-y-1 hover:shadow-[0_4px_12px_0_rgba(26,23,20,0.10)] transition-all duration-200">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Idea Bank</h3>
              <p className="text-sm text-[#6B6560] leading-relaxed">
                Capture raw thoughts before they disappear. Tag, organize, and turn ideas into posts when you&apos;re ready.
              </p>
            </div>

            {/* Card 2 - Voice DNA */}
            <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6 hover:-translate-y-1 hover:shadow-[0_4px_12px_0_rgba(26,23,20,0.10)] transition-all duration-200">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Voice DNA</h3>
              <p className="text-sm text-[#6B6560] leading-relaxed">
                Train the AI on your writing style. Every post sounds like you wrote it — because it did.
              </p>
            </div>

            {/* Card 3 - Write Modes */}
            <div className="bg-white rounded-2xl border border-[#E8E5E0] p-6 hover:-translate-y-1 hover:shadow-[0_4px_12px_0_rgba(26,23,20,0.10)] transition-all duration-200">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center mb-4">
                <PenLine className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Write Modes</h3>
              <p className="text-sm text-[#6B6560] leading-relaxed">
                From idea, hook, or experience — multiple ways to start so you never face a blank page again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-white border-t border-[#E8E5E0] px-6 md:px-10 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium text-[#4F46E5] tracking-widest text-center mb-3">HOW IT WORKS</p>
          <h2 className="font-serif text-2xl md:text-3xl text-[#1A1714] text-center mb-3">From idea to published in minutes</h2>
          <p className="text-sm text-[#6B6560] text-center mb-10">Three simple steps</p>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* Step 1 */}
            <div className="text-center">
              <p className="text-2xl font-serif text-[#4F46E5] mb-3">01</p>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Capture your idea</h3>
              <p className="text-sm text-[#6B6560]">
                Drop a raw thought into your Idea Bank — a topic, observation, or half-formed thought.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <p className="text-2xl font-serif text-[#4F46E5] mb-3">02</p>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Generate in your voice</h3>
              <p className="text-sm text-[#6B6560]">
                Pick your platform and write mode. PostBrain writes in your exact style using Voice DNA.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <p className="text-2xl font-serif text-[#4F46E5] mb-3">03</p>
              <h3 className="text-base font-medium text-[#1A1714] mb-2">Copy and publish</h3>
              <p className="text-sm text-[#6B6560]">
                Copy the post, paste it where you publish. Save to your library for later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#4F46E5] px-6 md:px-10 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight">
          Start writing like yourself,
          <br />not like everyone else
        </h2>
        <p className="text-sm text-white/70 mb-8">Free to start. No credit card required.</p>
        <Link
          href="/auth"
          className="inline-block bg-white text-[#4F46E5] px-8 py-3 rounded-xl text-sm font-medium hover:bg-[#EEF2FF] transition-colors"
        >
          Get started for free →
        </Link>
      </section>
    </div>
  );
}