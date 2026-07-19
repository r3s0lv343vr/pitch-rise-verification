"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "kanban", label: "Kanban" },
  { slug: "gantt", label: "Gantt" },
  { slug: "map", label: "Project map" },
  { slug: "budget", label: "Budget" },
  { slug: "risks", label: "Risks & changes" },
];

export function ProjectTabs({ projectId, current }: { projectId: string; current: string }) {
  return (
    <div className="mb-6 sticky top-[6.5rem] z-30 -mx-1 rounded-xl border border-slate-800 bg-slate-950/95 p-2 shadow-lg backdrop-blur sm:top-[7rem]">
      <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Project views
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href = tab.slug ? `/projects/${projectId}/${tab.slug}` : `/projects/${projectId}`;
          const active = current === tab.slug;
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
