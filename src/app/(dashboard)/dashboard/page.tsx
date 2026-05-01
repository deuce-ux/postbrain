import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lightbulb, FileText, Send } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const stats = [
  { label: "Posts Written", value: 12, icon: FileText },
  { label: "Ideas Saved", value: 48, icon: Lightbulb },
  { label: "Posts Published", value: 8, icon: Send },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="page-title">Good {getGreeting()}, Alex</h1>
        <p className="text-text-secondary">{formatDate()}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-button bg-accent-light">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">{stat.value}</p>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 max-w-md">
          <Input placeholder="Quick capture an idea..." label="Quick Capture" />
        </div>
        <Link href="/write">
          <Button>Start Writing</Button>
        </Link>
      </div>

      <Card>
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-border mb-4 flex items-center justify-center">
            <FileText className="h-8 w-8 text-text-secondary" />
          </div>
          <h3 className="font-serif text-lg text-text-primary mb-2">No posts yet</h3>
          <p className="text-text-secondary text-sm mb-4">
            Start writing your first post to see it here
          </p>
          <Link href="/write">
            <Button variant="secondary">Create your first post</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}