"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { SwimlaneProcessMap } from "@/components/command-center/swimlane-process-map";
import { LinkedKanban } from "@/components/command-center/linked-kanban";
import { GanttCalendar } from "@/components/command-center/gantt-calendar";
import { Badge, Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import { AlertTriangle, ArrowRight, Flame } from "lucide-react";

const tabs = [
  { id: "main", label: "Main" },
  { id: "process", label: "Process Map" },
  { id: "kanban", label: "Kanban" },
  { id: "gantt", label: "Gantt Chart" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export type CommandCenterOverview = {
  activeProjects: number;
  portfolioBudget: number;
  openRisks: number;
  processNodes: number;
  accounts: number;
  progressPct: number;
  nextActionTitle?: string | null;
  nextActionProject?: string | null;
  nextActionProjectId?: string | null;
  projects: { id: string; name: string; taskCount: number }[];
};

export function CommandCenter({
  initialNodes,
  canEdit,
  initialTab = "main",
  overview,
}: {
  initialNodes: LinkedTaskNode[];
  canEdit: boolean;
  initialTab?: TabId;
  overview: CommandCenterOverview;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [nodes, setNodes] = useState(initialNodes);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const projectNames = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.projectName))),
    [nodes]
  );

  function handleStatusChange(taskId: string, status: TaskStatusValue) {
    const previous = nodes;
    setNodes((curr) => curr.map((n) => (n.id === taskId ? { ...n, status } : n)));
    setMessage("Linked views updated — Process Map colors & Gantt health refreshed.");

    startTransition(async () => {
      const res = await setTaskStatus(taskId, status);
      if (!res.ok) {
        setNodes(previous);
        setMessage("Could not save status (permission or network). Reverted.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2 sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition",
                  tab === t.id
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            {projectNames.length} project{projectNames.length === 1 ? "" : "s"} · {nodes.length} process
            nodes
            {pending ? " · saving…" : ""}
          </div>
        </div>
        {message ? <p className="mt-2 px-1 text-xs text-cyan-300/90">{message}</p> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 lg:p-5">
        {tab === "main" ? (
          <div className="flex h-full flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-white">Main</h2>
              <p className="mt-1 text-sm text-slate-400">
                Portfolio snapshot and shortcuts. Use the other tabs for Process Map, Kanban, and Gantt.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Active projects</div>
                <div className="mt-2 text-3xl font-semibold text-white">{overview.activeProjects}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Portfolio budget</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {formatCurrency(overview.portfolioBudget)}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Open risks</div>
                <div className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white">
                  <AlertTriangle className="h-6 w-6 text-amber-300" /> {overview.openRisks}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Process nodes</div>
                <div className="mt-2 text-3xl font-semibold text-white">{overview.processNodes}</div>
                <p className="mt-1 text-xs text-slate-500">{overview.accounts} accounts</p>
              </Card>
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Motivation pulse</h3>
                  <Badge className="bg-cyan-500/15 text-cyan-200">{overview.progressPct}% complete</Badge>
                </div>
                <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    style={{ width: `${overview.progressPct}%` }}
                  />
                </div>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                    <Flame className="h-4 w-4" /> Your next action
                  </div>
                  {overview.nextActionTitle ? (
                    <div className="mt-2">
                      <div className="text-white">{overview.nextActionTitle}</div>
                      <div className="mt-1 text-sm text-slate-400">{overview.nextActionProject}</div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTab("process")}
                          className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
                        >
                          Open Process Map <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        {overview.nextActionProjectId ? (
                          <Link
                            href={`/projects/${overview.nextActionProjectId}`}
                            className="text-sm text-slate-400 hover:text-slate-200"
                          >
                            Project workspace
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">No open assigned work right now.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Projects</h3>
                  <Badge className="bg-slate-800 text-slate-300">process-shaped</Badge>
                </div>
                <div className="space-y-2">
                  {overview.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard?project=${p.id}&tab=process`}
                      className="block rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm hover:border-cyan-500/30"
                    >
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.taskCount} process nodes</div>
                    </Link>
                  ))}
                </div>
                <Link href="/projects" className="mt-4 inline-flex text-sm text-cyan-300 hover:underline">
                  New / manage projects →
                </Link>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "process" ? (
          <div className="flex h-full min-h-[70vh] flex-col">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-white">Process Map</h2>
              <p className="mt-1 text-sm text-slate-400">
                Full-width swimlane flowchart. Click a node for owner, deadline, blockers, budget, impact,
                documents, risks, and milestones.
              </p>
            </div>
            <div className="min-h-0 flex-1">
              <SwimlaneProcessMap nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
            </div>
          </div>
        ) : null}

        {tab === "kanban" ? (
          <div className="flex h-full min-h-[70vh] flex-col">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-white">Kanban</h2>
              <p className="mt-1 text-sm text-slate-400">
                Move cards to update Process Map colors and Gantt health in sync.
              </p>
            </div>
            <div className="min-h-0 flex-1">
              <LinkedKanban nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
            </div>
          </div>
        ) : null}

        {tab === "gantt" ? (
          <div className="flex h-full min-h-[70vh] flex-col">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-white">Gantt Chart</h2>
              <p className="mt-1 text-sm text-slate-400">
                Calendar with Gantt superimposed. Overshot timelines extend in red.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <GanttCalendar nodes={nodes} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
