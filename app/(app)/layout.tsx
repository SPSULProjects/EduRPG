"use client";

import RequireAuth from "@/src/components/auth/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
