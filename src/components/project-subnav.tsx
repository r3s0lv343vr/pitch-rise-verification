"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "kanban", label: "Kanban" },
  { slug: "gantt", label: "Gantt" },
  { slug: "map", label: "Map" },
  { slug: "twin", label: "Twin" },
  { slug: "budget", label: "Budget" },
  { slug: "risks", label: "Risks" },
] as const;

/** Compact project view switcher in the global header when inside a project. */
export function ProjectSubnav() {
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;

  const projectId = match[1];
  const current = match[2] || "";

  return (
    <div className="flex w-full gap-1 overflow-x-auto border-t border-slate-800/80 bg-slate-950/90 px-3 py-2 sm:px-4">
      <span className="mr-1 shrink-0 self-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Views
      </span>
      {tabs.map((tab) => {
        const href = tab.slug ? `/projects/${projectId}/${tab.slug}` : `/projects/${projectId}`;
        const active = current === tab.slug;
        return (
          <a
            key={tab.slug || "overview"}
            href={href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition sm:text-sm",
              active
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-900 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800 hover:text-cyan-100"
            )}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}
