"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  Lightbulb,
  BookOpen,
  CalendarDays,
  BarChart2,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "../ui/Avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/write", label: "Write", icon: PenLine },
  { href: "/ideas", label: "Idea Bank", icon: Lightbulb },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user?: {
    name?: string;
    email?: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center font-serif text-lg">
            PB
          </span>
          <span className="font-serif text-xl text-text-primary">PostBrain</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-button text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent-light text-accent"
                      : "text-text-secondary hover:bg-background hover:text-text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name || "User"} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}