import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-4 py-6 text-sm text-slate-400">Loading…</div>
      }
    >
      <AppShell user={{ name: session.user.name, email: session.user.email, role: session.user.role }}>
        {children}
      </AppShell>
    </Suspense>
  );
}
