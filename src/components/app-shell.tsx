"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  ChevronDown,
  Map,
  Columns3,
  CalendarRange,
  Home,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { useWalkthrough } from "@/components/walkthrough/walkthrough-context";
import { BeginnerWalkthrough } from "@/components/walkthrough/beginner-walkthrough";
import { TopNav } from "@/components/top-nav";
import { ProjectSubnav } from "@/components/project-subnav";

const commandCenterViews = [
  { tab: "main", label: "Overview", icon: Home },
  { tab: "kanban", label: "Kanban", icon: Columns3 },
  { tab: "process", label: "Process Workflow Map", icon: Map },
  { tab: "gantt", label: "Gantt Chart-Calendar", icon: CalendarRange },
];

const secondaryNav = [
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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(true);
  const { active, state, restart } = useWalkthrough();

  const activeTab = searchParams.get("tab") ?? "main";
  const projectFilter = searchParams.get("project");
  const onCommandCenter = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const highlightProjectsNav = active && state.step === "projects-nav";

  function ccHref(tab: string) {
    const params = new URLSearchParams();
    if (tab !== "main") params.set("tab", tab);
    if (projectFilter) params.set("project", projectFilter);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (onCommandCenter) setCcOpen(true);
  }, [onCommandCenter]);

  // Clear any leftover scroll lock from older builds.
  useEffect(() => {
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#020617_55%)] text-slate-100">
      <header className="sticky top-0 z-[80] border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              data-tour="menu-button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/40 hover:text-cyan-200"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Project Intelligence</div>
                <div className="text-[10px] text-slate-500">
                  {onCommandCenter ? "Command Center" : "Cohort PM Platform"}
                </div>
              </div>
            </Link>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-white">{user.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-cyan-300/90">{roleLabel(user.role)}</div>
          </div>
        </div>
        <TopNav />
        <ProjectSubnav />
      </header>

      {open ? (
        <div className="fixed inset-0 z-[90] flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(86vw,320px)] flex-col border-r border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between px-1">
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

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setCcOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                    onCommandCenter
                      ? "bg-cyan-500/15 text-cyan-100"
                      : "text-slate-300 hover:bg-slate-800/70"
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <LayoutDashboard className="h-4 w-4" />
                    Command Center
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition", ccOpen ? "rotate-180" : "")} />
                </button>
                {ccOpen ? (
                  <div className="space-y-0.5 px-2 pb-2">
                    {commandCenterViews.map((item) => {
                      const activeItem =
                        onCommandCenter &&
                        (item.tab === "main"
                          ? activeTab === "main" || !searchParams.get("tab")
                          : activeTab === item.tab);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.tab}
                          href={ccHref(item.tab)}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                            activeItem
                              ? "bg-cyan-500/20 text-cyan-100"
                              : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Workspace
              </div>
              {secondaryNav.map((item) => {
                const navActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const isProjects = item.href === "/projects";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={isProjects ? "projects-nav" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                      navActive
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
                      isProjects &&
                        highlightProjectsNav &&
                        "tour-target-active tour-vibrate bg-cyan-500/20 text-cyan-50"
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
                type="button"
                onClick={() => {
                  restart();
                  setOpen(false);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20"
              >
                <Compass className="h-3.5 w-3.5" />
                Start beginner tour
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="w-full px-3 py-3 sm:px-4 sm:py-3 lg:px-5">{children}</main>
      <BeginnerWalkthrough />
    </div>
  );
}
