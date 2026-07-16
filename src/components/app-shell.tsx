"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  BarChart3,
  Settings,
  Plug,
  Users,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const nav = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/my-work", label: "My Work", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/onboarding", label: "Onboarding", icon: Settings },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#020617_55%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/40 p-4 md:flex md:flex-col">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Project Intelligence</div>
              <div className="text-[11px] text-slate-500">Cohort PM Platform</div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-cyan-300/90">{roleLabel(user.role)}</div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
