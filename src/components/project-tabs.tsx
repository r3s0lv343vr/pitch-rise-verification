import { cn } from "@/lib/utils";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "kanban", label: "Kanban" },
  { slug: "gantt", label: "Gantt" },
  { slug: "map", label: "Project map" },
  { slug: "budget", label: "Budget" },
  { slug: "risks", label: "Risks & changes" },
] as const;

/** Plain anchors (not next/link) so tabs keep working even if client hydration fails. */
export function ProjectTabs({ projectId, current }: { projectId: string; current: string }) {
  return (
    <div
      data-project-tabs
      className="relative z-20 mb-6 rounded-xl border border-cyan-400/30 bg-slate-950 p-3 shadow-lg"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
        Project views — click to open
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const href = tab.slug ? `/projects/${projectId}/${tab.slug}` : `/projects/${projectId}`;
          const active = current === tab.slug;
          return (
            <a
              key={tab.label}
              href={href}
              className={cn(
                "inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition",
                active
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "border border-slate-600 bg-slate-900 text-slate-100 hover:border-cyan-300 hover:bg-slate-800 hover:text-cyan-100"
              )}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
