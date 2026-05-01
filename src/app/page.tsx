import Link from "next/link";
import { Lightbulb, Mic, PenLine } from "lucide-react";

const features = [
  {
    icon: Lightbulb,
    title: "Idea Bank",
    description: "Capture raw thoughts before they disappear. Tag, organize, and turn ideas into posts.",
  },
  {
    icon: Mic,
    title: "Voice DNA",
    description: "Train the AI on your writing style. Every post sounds like you wrote it — because it did.",
  },
  {
    icon: PenLine,
    title: "Write Modes",
    description: "From idea, hook, or experience — multiple ways to start writing so you never face a blank page.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans">
      {/* Navigation bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-[#E8E5E0]">
        <div className="mx-auto px-8 py-4 flex items-center justify-between" style={{ maxWidth: '90rem' }}>
          <Link href="/" className="font-serif text-xl text-[#1A1714]">
            PostBrain
          </Link>
          <Link href="/auth" className="text-[#6B6560] hover:text-[#1A1714] transition-colors">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <main className="pt-24 pb-16 px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-5xl text-[#1A1714] leading-tight mb-6">
            Write posts that sound exactly like you
          </h1>
          <p className="text-lg text-[#6B6560] max-w-xl mx-auto mb-10 text-center">
            AI-powered content creation built for creators who care about their voice
          </p>
          <Link
            href="/auth"
            className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#4338CA] transition-colors"
          >
            Start for free
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mx-auto max-w-4xl grid grid-cols-3 gap-6 mt-24 px-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-[#E8E5E0] shadow-[0_1px_3px_0_rgba(26,23,20,0.06)]"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <h3 className="font-medium text-[#1A1714] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#6B6560]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}