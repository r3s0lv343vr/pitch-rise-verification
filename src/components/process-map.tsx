"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn, formatCurrency, formatDate, taskStatusLabel } from "@/lib/utils";
import { Card, Badge } from "@/components/ui/card";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Flag,
  GitBranch,
  Milestone,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

export type ProcessMapNode = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
  owner: string;
  team: string;
  deadline: string | null;
  blockers: string[];
  budgetConsumed: number;
  budgetAllocated: number;
  downstreamImpact: string[];
  linkedDocuments: string[];
  linkedRisks: { id: string; title: string; severity: string }[];
  linkedMilestones: { id: string; name: string }[];
  projectId: string;
  projectName: string;
};

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as const;

const statusLaneLabel: Record<(typeof STATUS_ORDER)[number], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

/** Color bars beneath nodes */
const statusBarClass: Record<(typeof STATUS_ORDER)[number], string> = {
  TODO: "bg-orange-400",
  IN_PROGRESS: "bg-yellow-400",
  IN_REVIEW: "bg-blue-400",
  DONE: "bg-emerald-400",
  BLOCKED: "bg-red-500",
};

const statusRingClass: Record<(typeof STATUS_ORDER)[number], string> = {
  TODO: "border-orange-400/40 hover:border-orange-300",
  IN_PROGRESS: "border-yellow-400/40 hover:border-yellow-300",
  IN_REVIEW: "border-blue-400/40 hover:border-blue-300",
  DONE: "border-emerald-400/40 hover:border-emerald-300",
  BLOCKED: "border-red-500/50 hover:border-red-400",
};

export function ProcessMap({ nodes }: { nodes: ProcessMapNode[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as ProcessMapNode[]])) as Record<
      (typeof STATUS_ORDER)[number],
      ProcessMapNode[]
    >;
    for (const node of nodes) {
      map[node.status]?.push(node);
    }
    return map;
  }, [nodes]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-white">Process Map</h2>
              <p className="mt-1 text-sm text-slate-400">
                Navigate the project by work nodes — status, owner, and team at a glance. Click a node for
                full context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
              {STATUS_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2 py-1">
                  <span className={cn("h-2 w-2 rounded-full", statusBarClass[s])} />
                  {statusLaneLabel[s]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <div className="grid min-w-[980px] grid-cols-5 gap-3">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {statusLaneLabel[status]}
                  </div>
                  <Badge className="bg-slate-800 text-slate-300">{byStatus[status].length}</Badge>
                </div>
                <div className={cn("mb-3 h-1 rounded-full", statusBarClass[status])} />
                <div className="space-y-2">
                  {byStatus[status].map((node) => {
                    const active = selectedId === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedId(node.id)}
                        className={cn(
                          "w-full rounded-xl border bg-slate-900/80 p-3 text-left transition",
                          statusRingClass[node.status],
                          active && "ring-2 ring-cyan-400/60"
                        )}
                      >
                        <div className="text-sm font-medium text-white">{node.title}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{node.projectName}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-200">
                            {node.team}
                          </span>
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                            {node.owner}
                          </span>
                        </div>
                        <div className={cn("mt-3 h-1.5 w-full rounded-full", statusBarClass[node.status])} />
                      </button>
                    );
                  })}
                  {byStatus[status].length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-slate-600">No nodes</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="h-fit xl:sticky xl:top-4">
        {!selected ? (
          <p className="text-sm text-slate-400">Select a process node to inspect ownership, risks, and impact.</p>
        ) : (
          <div>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Selected node</div>
                <h3 className="mt-1 text-lg font-medium text-white">{selected.title}</h3>
                <p className="text-sm text-slate-400">{selected.projectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="bg-slate-800 text-slate-200">{taskStatusLabel[selected.status]}</Badge>
              <Badge className="bg-cyan-500/15 text-cyan-200">{selected.team}</Badge>
            </div>
            <div className={cn("mb-4 h-2 rounded-full", statusBarClass[selected.status])} />

            <dl className="space-y-3 text-sm">
              <DetailRow icon={UserRound} label="Owner" value={`${selected.owner} · ${selected.team}`} />
              <DetailRow icon={CalendarClock} label="Deadline" value={formatDate(selected.deadline)} />
              <DetailRow
                icon={AlertTriangle}
                label="Blockers"
                value={
                  selected.blockers.length
                    ? selected.blockers.join("; ")
                    : "None recorded"
                }
              />
              <DetailRow
                icon={Wallet}
                label="Budget consumed"
                value={`${formatCurrency(selected.budgetConsumed)} of ${formatCurrency(selected.budgetAllocated)} allocated`}
              />
              <DetailRow
                icon={GitBranch}
                label="Downstream impact"
                value={
                  selected.downstreamImpact.length
                    ? selected.downstreamImpact.join("; ")
                    : "No dependent work"
                }
              />
              <DetailRow
                icon={FileText}
                label="Linked documents"
                value={
                  selected.linkedDocuments.length
                    ? selected.linkedDocuments.join("; ")
                    : "No documents linked"
                }
              />
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Flag className="h-3.5 w-3.5" /> Linked risks
                </div>
                {selected.linkedRisks.length ? (
                  <ul className="space-y-1">
                    {selected.linkedRisks.map((r) => (
                      <li key={r.id} className="rounded-lg border border-slate-800 px-2 py-1.5 text-slate-300">
                        {r.title}{" "}
                        <span className="text-xs text-amber-300">({r.severity})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No linked risks</p>
                )}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Milestone className="h-3.5 w-3.5" /> Linked milestones
                </div>
                {selected.linkedMilestones.length ? (
                  <ul className="space-y-1">
                    {selected.linkedMilestones.map((m) => (
                      <li key={m.id} className="rounded-lg border border-slate-800 px-2 py-1.5 text-slate-300">
                        {m.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No linked milestones</p>
                )}
              </div>
            </dl>

            <Link
              href={`/projects/${selected.projectId}`}
              className="mt-5 inline-flex text-sm text-cyan-300 hover:underline"
            >
              Open supporting project workspace →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-slate-200">{value}</p>
    </div>
  );
}
