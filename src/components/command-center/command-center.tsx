"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { SwimlaneProcessMap } from "@/components/command-center/swimlane-process-map";
import { LinkedKanban } from "@/components/command-center/linked-kanban";
import { GanttCalendar } from "@/components/command-center/gantt-calendar";
import { OverviewPanel } from "@/components/command-center/overview-panel";
import { DigitalTwinPanel } from "@/components/digital-twin/digital-twin-panel";
import { cn } from "@/lib/utils";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import {
  buildOverviewIntelFromNodes,
  type OverviewActivityItem,
  type OverviewSeed,
} from "@/lib/overview-intel";
import { applyStatusToLinkedNodes, makeLiveActivityEvent } from "@/lib/linked-status";
import type { DowntimeHotspot } from "@/lib/time-tracking";

export const commandCenterTabs = [
  { id: "main", label: "Overview" },
  { id: "kanban", label: "Kanban" },
  { id: "process", label: "Process Workflow Map" },
  { id: "twin", label: "Digital Twin" },
  { id: "gantt", label: "Gantt Chart-Calendar" },
] as const;

export type CommandCenterTabId = (typeof commandCenterTabs)[number]["id"];

export type CommandCenterOverview = {
  projects: { id: string; name: string; taskCount: number }[];
  seed: OverviewSeed;
  downtime: {
    workMinutes: number;
    breakMinutes: number;
    hotspots: DowntimeHotspot[];
  };
};

export function CommandCenter({
  initialNodes,
  canEdit,
  initialTab = "main",
  overview,
  selectedProjectId = null,
  selectedProjectName = null,
  overallBudget = 0,
}: {
  initialNodes: LinkedTaskNode[];
  canEdit: boolean;
  initialTab?: CommandCenterTabId;
  overview: CommandCenterOverview;
  selectedProjectId?: string | null;
  selectedProjectName?: string | null;
  overallBudget?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CommandCenterTabId>(initialTab);
  const [nodes, setNodes] = useState(initialNodes);
  const [liveActivity, setLiveActivity] = useState<OverviewActivityItem[]>([]);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const activeProjectId = selectedProjectId || searchParams.get("project");

  // Hard client-side guard: never mix projects in linked views.
  const viewNodes = useMemo(() => {
    if (!activeProjectId) return nodes;
    return nodes.filter((n) => n.projectId === activeProjectId);
  }, [nodes, activeProjectId]);

  const liveIntel = useMemo(
    () => buildOverviewIntelFromNodes(viewNodes, overview.seed, liveActivity),
    [viewNodes, overview.seed, liveActivity]
  );

  function selectTab(
    next: CommandCenterTabId,
    opts?: { projectId?: string | null; taskId?: string | null }
  ) {
    setTab(next);
    if (opts?.taskId) setFocusTaskId(opts.taskId);
    else if (next !== "kanban" && next !== "gantt" && next !== "process") setFocusTaskId(null);

    const params = new URLSearchParams(searchParams.toString());
    if (next === "main") params.delete("tab");
    else params.set("tab", next);

    if (opts && "projectId" in opts) {
      if (opts.projectId) params.set("project", opts.projectId);
      else params.delete("project");
    } else if (
      (next === "process" || next === "kanban" || next === "gantt" || next === "twin") &&
      !params.get("project") &&
      overview.projects[0]
    ) {
      params.set("project", overview.projects[0].id);
    }

    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  function handleStatusChange(taskId: string, status: TaskStatusValue) {
    const previous = nodes;
    const current = nodes.find((n) => n.id === taskId);
    const nextNodes = applyStatusToLinkedNodes(nodes, taskId, status);
    setNodes(nextNodes);
    if (current) {
      setLiveActivity((prev) => [makeLiveActivityEvent(current, status), ...prev].slice(0, 8));
    }
    setMessage("Linked sync: Overview, Kanban, Process Workflow Map, and Gantt updated together.");

    startTransition(async () => {
      const res = await setTaskStatus(taskId, status);
      if (!res.ok) {
        setNodes(previous);
        setMessage("Could not save status. Linked views reverted.");
        return;
      }
      router.refresh();
    });
  }

  const linkedView = tab === "process" || tab === "kanban" || tab === "gantt" || tab === "twin";

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
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Project</span>
            <select
              className="max-w-[220px] bg-transparent text-sm font-medium text-cyan-100 outline-none"
              value={activeProjectId || ""}
              onChange={(e) => {
                const projectId = e.target.value || null;
                selectTab(tab === "main" ? "process" : tab, { projectId });
              }}
            >
              {overview.projects.length === 0 ? (
                <option value="">No projects yet</option>
              ) : (
                overview.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.taskCount})
                  </option>
                ))
              )}
            </select>
          </label>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
            One project · linked views
          </span>
          <span className="text-[11px] text-slate-500">
            {selectedProjectName || "Select a project"} · {viewNodes.length} tasks
            {pending ? " · saving…" : ""}
          </span>
          {activeProjectId ? (
            <Link
              href={`/projects/${activeProjectId}/map`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-400/40"
            >
              Open Project Map
            </Link>
          ) : (
            <Link
              href="/projects"
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-400/40"
            >
              Manage projects
            </Link>
          )}
        </div>
      </div>

      {linkedView ? (
        <p className="mb-2 text-xs text-slate-400">
          Showing <span className="text-cyan-200">{selectedProjectName || "one project"}</span> only —
          built from that project’s tasks and dependency links (same source as Project Map).
        </p>
      ) : null}

      {message ? <p className="mb-2 text-xs text-cyan-300/90">{message}</p> : null}

      <div className="min-h-0 flex-1">
        {tab === "main" ? (
          <OverviewPanel
            intel={liveIntel}
            projects={overview.projects}
            downtime={overview.downtime}
            onOpenTab={selectTab}
          />
        ) : null}

        {tab === "process" ? (
          <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">
            {viewNodes.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-300">
                No tasks for this project yet. Open{" "}
                <Link className="text-cyan-300 underline" href="/projects">
                  Projects
                </Link>{" "}
                to create work, or open the Project Map after seeding a process.
              </div>
            ) : (
              <SwimlaneProcessMap
                nodes={viewNodes}
                canEdit={canEdit}
                onStatusChange={handleStatusChange}
                focusTaskId={focusTaskId}
              />
            )}
          </div>
        ) : null}

        {tab === "twin" ? (
          <div className="h-full min-h-[calc(100vh-8rem)] overflow-auto pb-6">
            {activeProjectId ? (
              <DigitalTwinPanel
                projectId={activeProjectId}
                projectName={selectedProjectName || "Selected project"}
                liveNodes={viewNodes}
                overallBudget={overallBudget}
              />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-300">
                Select a project to open its Digital Twin sandbox.
              </div>
            )}
          </div>
        ) : null}

        {tab === "kanban" ? (
          <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col">
            <LinkedKanban
              nodes={viewNodes}
              canEdit={canEdit}
              onStatusChange={handleStatusChange}
              focusTaskId={focusTaskId}
            />
          </div>
        ) : null}

        {tab === "gantt" ? (
          <div className="h-full min-h-[calc(100vh-8rem)] overflow-auto">
            <GanttCalendar
              nodes={viewNodes}
              canEdit={canEdit}
              onStatusChange={handleStatusChange}
              focusTaskId={focusTaskId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
