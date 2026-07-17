"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { SwimlaneProcessMap } from "@/components/command-center/swimlane-process-map";
import { LinkedKanban } from "@/components/command-center/linked-kanban";
import { GanttCalendar } from "@/components/command-center/gantt-calendar";
import { OverviewPanel } from "@/components/command-center/overview-panel";
import { cn } from "@/lib/utils";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import type { OverviewIntel } from "@/lib/overview-intel";

export const commandCenterTabs = [
  { id: "main", label: "Overview" },
  { id: "kanban", label: "Kanban" },
  { id: "process", label: "Process Workflow Map" },
  { id: "gantt", label: "Gantt Chart-Calendar" },
] as const;

export type CommandCenterTabId = (typeof commandCenterTabs)[number]["id"];

export type CommandCenterOverview = {
  projects: { id: string; name: string; taskCount: number }[];
  intel: OverviewIntel;
};

export function CommandCenter({
  initialNodes,
  canEdit,
  initialTab = "main",
  overview,
}: {
  initialNodes: LinkedTaskNode[];
  canEdit: boolean;
  initialTab?: CommandCenterTabId;
  overview: CommandCenterOverview;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<CommandCenterTabId>(initialTab);
  const [nodes, setNodes] = useState(initialNodes);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const projectNames = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.projectName))),
    [nodes]
  );

  function selectTab(next: CommandCenterTabId) {
    setTab(next);
    const url = next === "main" ? "/dashboard" : `/dashboard?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  function handleStatusChange(taskId: string, status: TaskStatusValue) {
    const previous = nodes;
    setNodes((curr) => curr.map((n) => (n.id === taskId ? { ...n, status } : n)));
    setMessage("Linked views updated.");

    startTransition(async () => {
      const res = await setTaskStatus(taskId, status);
      if (!res.ok) {
        setNodes(previous);
        setMessage("Could not save status. Reverted.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {commandCenterTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  tab === t.id
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">
            {projectNames.length} projects · {nodes.length} nodes
            {pending ? " · saving…" : ""}
          </span>
          <Link
            href="/projects"
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-400/40"
          >
            Manage projects
          </Link>
        </div>
      </div>

      {message ? <p className="mb-2 text-xs text-cyan-300/90">{message}</p> : null}

      <div className="min-h-0 flex-1">
        {tab === "main" ? (
          <OverviewPanel intel={overview.intel} projects={overview.projects} />
        ) : null}

        {tab === "process" ? (
          <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">
            <SwimlaneProcessMap nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
          </div>
        ) : null}

        {tab === "kanban" ? (
          <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">
            <LinkedKanban nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
          </div>
        ) : null}

        {tab === "gantt" ? (
          <div className="h-full min-h-[calc(100vh-8rem)] overflow-auto">
            <GanttCalendar nodes={nodes} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
