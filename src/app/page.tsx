import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Lightbulb, Mic, PenTool } from "lucide-react";

const features = [
  {
    icon: Lightbulb,
    title: "Idea Bank",
    description: "Capture and organize your best ideas before they disappear. Never lose a great thought again.",
  },
  {
    icon: Mic,
    title: "Voice DNA",
    description: "Train AI on your existing content to write exactly like you do.",
  },
  {
    icon: PenTool,
    title: "Write Modes",
    description: "Choose from different tones and styles to match your mood and audience.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center font-serif text-lg">
              PB
            </span>
            <span className="font-serif text-xl text-text-primary">PostBrain</span>
          </Link>
          <Link href="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="font-serif text-5xl text-text-primary mb-6 animate-fade-in">
            Write posts that sound exactly like you
          </h1>
          <p className="text-xl text-text-secondary mb-8 animate-slide-up">
            AI-powered content creation built for creators who care about their voice
          </p>
          <Link href="/auth">
            <Button size="lg" className="animate-slide-up">
              Start for free
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                variant="hover"
                className="animate-slide-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="p-3 rounded-button bg-accent-light w-fit mb-4">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-serif text-lg text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}