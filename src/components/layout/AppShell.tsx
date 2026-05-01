"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  user?: {
    name?: string;
    email?: string;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="pl-60 overflow-y-auto" style={{ minHeight: "100vh" }}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}