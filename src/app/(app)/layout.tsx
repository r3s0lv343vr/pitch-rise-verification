import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WalkthroughProvider } from "@/components/walkthrough/walkthrough-context";
import { requireSession } from "@/lib/session";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-4 py-6 text-sm text-slate-400">Loading…</div>
      }
    >
      <WalkthroughProvider>
        <AppShell user={{ name: session.user.name, email: session.user.email, role: session.user.role }}>
          {children}
        </AppShell>
      </WalkthroughProvider>
    </Suspense>
  );
}
