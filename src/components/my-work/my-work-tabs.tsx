"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Personal Overview", href: "/my-work" },
  { id: "assignments", label: "Assignments", href: "/my-work?tab=assignments" },
] as const;

export function MyWorkTabBar() {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") === "assignments" ? "assignments" : "overview";

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            active === t.id
              ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
