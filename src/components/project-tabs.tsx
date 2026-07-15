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
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {tabs.map((tab) => {
        const href = tab.slug ? `/projects/${projectId}/${tab.slug}` : `/projects/${projectId}`;
        const active = current === tab.slug;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              active ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
