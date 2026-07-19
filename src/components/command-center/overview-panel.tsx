"use client";

import { Badge, Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { OverviewIntel } from "@/lib/overview-intel";
import type { DowntimeHotspot } from "@/lib/time-tracking";
import { DowntimeCorrelationPanel } from "@/components/command-center/downtime-panel";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Users,
  Flag,
} from "lucide-react";

function healthEmoji(score: number) {
  if (score >= 85) return "🟢";
  if (score >= 70) return "🟡";
  return "🔴";
}

function toneClass(tone: "good" | "warn" | "bad" | "neutral") {
  if (tone === "good") return "text-emerald-300";
  if (tone === "warn") return "text-amber-300";
  if (tone === "bad") return "text-rose-300";
  return "text-slate-300";
}

function moneyShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${Math.round(n / 1000)}k`;
  return formatCurrency(n);
}

export function OverviewPanel({
  intel,
  projects,
  downtime,
  onOpenTab,
}: {
  intel: OverviewIntel;
  projects: { id: string; name: string; taskCount: number }[];
  downtime: {
    workMinutes: number;
    breakMinutes: number;
    hotspots: DowntimeHotspot[];
  };
  onOpenTab: (
    tab: "main" | "kanban" | "process" | "gantt",
    opts?: { projectId?: string | null; taskId?: string | null }
  ) => void;
}) {
  const endOfWeek = intel.deadlines.filter((d) => d.bucket === "end_of_week");
  const later = intel.deadlines.filter((d) => d.bucket === "later");
  const today = intel.activity.filter((a) => a.group === "today");
  const yesterday = intel.activity.filter((a) => a.group === "yesterday" || a.group === "earlier");

  const stageRows = intel.milestones.filter((m) =>
    ["Planning", "Development", "Testing", "Deployment", "Milestones completed", "Overdue"].includes(m.label)
  );

  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <div className="xl:col-span-12">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onOpenTab("kanban")}
            className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-100"
          >
            Open Kanban
          </button>
          <button
            type="button"
            onClick={() => onOpenTab("process")}
            className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-100"
          >
            Open Process Workflow Map
          </button>
          <button
            type="button"
            onClick={() => onOpenTab("gantt")}
            className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-100"
          >
            Open Gantt Chart-Calendar
          </button>
          <span className="self-center text-slate-500">
            Status changes in any linked view refresh health, budget, deadlines, and colors here.
          </span>
        </div>
      </div>

      {/* Overall Health */}
      <Card className="p-4 xl:col-span-4">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-cyan-300" />
          <h2 className="font-display text-base font-semibold text-white">Overall Health</h2>
        </div>
        <div className="mb-4 flex items-end gap-3">
          <div className="text-4xl leading-none">{healthEmoji(intel.health.overall)}</div>
          <div>
            <div className="font-display text-3xl font-semibold text-white">
              {intel.health.overall}
              <span className="text-lg text-slate-500">/100</span>
            </div>
            <p className="text-xs text-slate-500">Portfolio pulse across delivery dimensions</p>
          </div>
        </div>
        <div className="space-y-2">
          {(
            [
              ["Schedule", intel.health.schedule],
              ["Budget", intel.health.budget],
              ["Resources", intel.health.resources],
              ["Risk", intel.health.risk],
              ["Quality", intel.health.quality],
            ] as const
          ).map(([label, score]) => (
            <div key={label} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
              <span className="text-slate-400">{label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    score >= 85 ? "bg-emerald-400" : score >= 70 ? "bg-amber-400" : "bg-rose-400"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-slate-200">{score}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Budget widget */}
      <Card className="p-4 xl:col-span-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-cyan-300" />
            <h2 className="font-display text-base font-semibold text-white">Budget Control</h2>
          </div>
          <Badge
            className={cn(
              intel.budget.variancePct <= 0
                ? "bg-emerald-500/15 text-emerald-200"
                : "bg-rose-500/15 text-rose-200"
            )}
          >
            {intel.budget.variancePct > 0 ? "+" : ""}
            {intel.budget.variancePct}% variance
          </Badge>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <BudgetCell label="Allocated" value={moneyShort(intel.budget.allocated)} />
          <BudgetCell label="Spent" value={moneyShort(intel.budget.spent)} />
          <BudgetCell label="Remaining" value={moneyShort(intel.budget.remaining)} />
          <BudgetCell label="Forecast at completion" value={moneyShort(intel.budget.forecast)} />
        </div>
        <p className="text-xs leading-relaxed text-slate-400">{intel.budget.narrative}</p>
      </Card>

      {/* Resource utilization */}
      <Card className="p-4 xl:col-span-4">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-300" />
          <h2 className="font-display text-base font-semibold text-white">Resource Utilization</h2>
        </div>
        <div className="space-y-3">
          {intel.resources.map((r) => (
            <div key={r.role}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.role}</span>
                <span className="tabular-nums text-white">{r.utilizationPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    r.utilizationPct >= 90
                      ? "bg-rose-400"
                      : r.utilizationPct >= 70
                        ? "bg-cyan-400"
                        : "bg-slate-500"
                  )}
                  style={{ width: `${Math.min(r.utilizationPct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Milestone / delivery progress */}
      <Card className="p-4 xl:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-cyan-300" />
            <h2 className="font-display text-base font-semibold text-white">Delivery Progress</h2>
          </div>
          <Badge
            className={cn(
              intel.timelineStatus.toLowerCase().includes("overshoot") ||
                intel.timelineStatus.toLowerCase().includes("risk")
                ? "bg-rose-500/15 text-rose-200"
                : "bg-emerald-500/15 text-emerald-200"
            )}
          >
            Timeline · {intel.timelineStatus}
          </Badge>
        </div>
        <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800">
          {stageRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 px-3 py-2.5 sm:grid-cols-[10rem_1fr] sm:items-center"
            >
              <div className="text-sm font-medium text-slate-300">{row.label}</div>
              <div className={cn("text-sm", toneClass(row.tone))}>{row.detail}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {projects.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenTab("process", { projectId: p.id })}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/30 hover:text-cyan-100"
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onOpenTab("gantt")}
            className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100 hover:border-cyan-400/40"
          >
            Timeline view →
          </button>
        </div>
      </Card>

      {/* Upcoming deadlines */}
      <Card className="p-4 xl:col-span-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-cyan-300" />
          <h2 className="font-display text-base font-semibold text-white">Upcoming Deadlines</h2>
        </div>
        <DeadlineGroup
          title="End of week"
          items={endOfWeek}
          onOpen={(id) => onOpenTab("kanban", { taskId: id })}
        />
        <div className="mt-3">
          <DeadlineGroup
            title="Scheduled later"
            items={later}
            onOpen={(id) => onOpenTab("gantt", { taskId: id })}
          />
        </div>
        {intel.deadlines.length === 0 ? (
          <p className="text-sm text-slate-500">No open deadlines on the board.</p>
        ) : null}
      </Card>

      <DowntimeCorrelationPanel
        workMinutes={downtime.workMinutes}
        breakMinutes={downtime.breakMinutes}
        hotspots={downtime.hotspots}
        onOpenProcess={() =>
          onOpenTab("process", {
            taskId: downtime.hotspots[0]?.taskId ?? null,
          })
        }
      />

      {/* Activity feed */}
      <Card className="p-4 xl:col-span-12">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <h2 className="font-display text-base font-semibold text-white">Activity Feed</h2>
          </div>
          <span className="text-[11px] text-slate-500">Live portfolio signal · expandable later</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityGroup title="Today" items={today} />
          <ActivityGroup title="Yesterday & earlier" items={yesterday} />
        </div>
      </Card>
    </div>
  );
}

function BudgetCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}

function DeadlineGroup({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: OverviewIntel["deadlines"];
  onOpen: (taskId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
        <p className="text-xs text-slate-600">None queued</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="space-y-1.5">
        {items.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onOpen(d.id)}
            className="flex w-full items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2 text-left hover:border-cyan-500/30"
          >
            <div className="min-w-0">
              <div className="truncate text-sm text-white">{d.title}</div>
              <div className="truncate text-[11px] text-slate-500">{d.projectName}</div>
            </div>
            <div
              className={cn(
                "shrink-0 text-right text-[11px]",
                d.overdue ? "text-rose-300" : "text-cyan-200"
              )}
            >
              {d.overdue ? <AlertTriangle className="mb-0.5 ml-auto h-3 w-3" /> : null}
              {d.dueLabel}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityGroup({
  title,
  items,
}: {
  title: string;
  items: OverviewIntel["activity"];
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600">No events</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[4.5rem_1fr] gap-2 rounded-lg border border-slate-800/70 bg-slate-950/30 px-2.5 py-2 text-sm"
            >
              <span className="tabular-nums text-slate-500">{a.when}</span>
              <span className="text-slate-200">{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
