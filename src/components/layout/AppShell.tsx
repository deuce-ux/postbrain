"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  user?: {
    name?: string;
    email?: string;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <aside className="hidden md:flex w-60 flex-shrink-0 fixed left-0 top-0 h-screen">
        <Sidebar user={user} />
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 md:ml-60 page-enter">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}