import { ReactNode } from "react";
import { AppShell } from "../../components/layout/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell
      user={{
        name: "Alex",
        email: "alex@example.com",
      }}
    >
      {children}
    </AppShell>
  );
}