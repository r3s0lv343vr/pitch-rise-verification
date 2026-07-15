import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <AppShell user={{ name: session.user.name, email: session.user.email, role: session.user.role }}>
      {children}
    </AppShell>
  );
}
