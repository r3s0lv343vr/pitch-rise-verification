"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

export const commandCenterTabs = [
  { id: "main", label: "Overview" },
  { id: "kanban", label: "Kanban" },
  { id: "process", label: "Process Workflow Map" },
  { id: "gantt", label: "Gantt Chart-Calendar" },
] as const;

export type CommandCenterTabId = (typeof commandCenterTabs)[number]["id"];

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
          <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-2">
            {/* Compact strip — keep Main lean for upcoming features */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <CompactStat label="Active" value={String(overview.activeProjects)} />
              <CompactStat label="Budget" value={formatCurrency(overview.portfolioBudget)} />
              <CompactStat
                label="Open risks"
                value={String(overview.openRisks)}
                icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-300" />}
              />
              <CompactStat
                label="Process nodes"
                value={`${overview.processNodes}`}
                hint={`${overview.accounts} accounts`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-1.5 text-cyan-200">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">Next</span>
              </div>
              {overview.nextActionTitle ? (
                <>
                  <span className="min-w-0 truncate text-white">{overview.nextActionTitle}</span>
                  <span className="text-slate-500">· {overview.nextActionProject}</span>
                  <Badge className="bg-cyan-500/15 text-cyan-200">{overview.progressPct}%</Badge>
                  <button
                    type="button"
                    onClick={() => selectTab("process")}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
                  >
                    Process Map <ArrowRight className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <span className="text-slate-400">No open assigned work.</span>
              )}
            </div>

            <Card className="flex min-h-0 flex-1 flex-col border-dashed border-slate-700/80 bg-slate-950/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium text-white">Main workspace</h2>
                  <p className="text-xs text-slate-500">
                    Reserved for high-signal Command Center features — kept open on purpose.
                  </p>
                </div>
                <Badge className="bg-slate-800 text-slate-300">under Command Center</Badge>
              </div>
              <div className="grid min-h-[40vh] flex-1 gap-2 lg:grid-cols-[1fr_220px]">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-3 text-xs text-slate-500">
                  Feature canvas (intel, alerts, twin hooks, etc.) will land here without competing with
                  Process Map / Kanban / Gantt tabs.
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Jump to project
                  </div>
                  {overview.projects.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard?project=${p.id}&tab=process`}
                      className="block truncate rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-500/30"
                    >
                      {p.name}
                      <span className="ml-1 text-slate-500">({p.taskCount})</span>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
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

function CompactStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-white">
        {icon}
        {value}
      </div>
      {hint ? <div className="text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  );
}
