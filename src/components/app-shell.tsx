"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
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
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#020617_55%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/40 hover:text-cyan-200"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Project Intelligence</div>
                <div className="text-[11px] text-slate-500">Cohort PM Platform</div>
              </div>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-white">{user.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-cyan-300/90">{roleLabel(user.role)}</div>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(86vw,320px)] flex-col border-r border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-1">
              <div className="text-sm font-semibold text-white">Menu</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
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
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-cyan-500/15 text-cyan-200"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
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
              <div className="mt-2 text-[11px] uppercase tracking-wide text-cyan-300/90">
                {roleLabel(user.role)}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="w-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
