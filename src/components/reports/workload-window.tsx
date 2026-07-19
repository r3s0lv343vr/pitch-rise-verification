import type { ReactNode } from "react";
import { Card, Badge } from "@/components/ui/card";
import type { WorkloadPerson, WorkloadWindow } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock3, Gauge, Hourglass, ListChecks, Percent } from "lucide-react";

function MetricTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "danger" | "ok";
  icon: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-500/40 bg-rose-500/10"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10"
        : tone === "ok"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-slate-800 bg-slate-950/40";

  return (
    <div className={cn("rounded-xl border p-3", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function levelStyles(level: WorkloadPerson["level"]) {
  if (level === "Overloaded") {
    return {
      badge: "bg-rose-500/20 text-rose-100",
      bar: "bg-gradient-to-r from-rose-500 to-orange-400",
      cell: "border-rose-500/40 bg-rose-500/10",
      text: "text-rose-200",
    };
  }
  if (level === "Watch") {
    return {
      badge: "bg-amber-500/20 text-amber-100",
      bar: "bg-gradient-to-r from-amber-400 to-yellow-300",
      cell: "border-amber-500/40 bg-amber-500/10",
      text: "text-amber-200",
    };
  }
  return {
    badge: "bg-emerald-500/20 text-emerald-100",
    bar: "bg-gradient-to-r from-emerald-400 to-cyan-300",
    cell: "border-emerald-500/30 bg-emerald-500/5",
    text: "text-emerald-200",
  };
}

function TeamLoadRibbon({
  teamLoad,
  capacityHoursPerPerson,
}: {
  teamLoad: WorkloadPerson[];
  capacityHoursPerPerson: number;
}) {
  if (teamLoad.length === 0) {
    return (
      <p className="mt-4 text-xs text-slate-500">
        No assigned open work yet — team load ribbon will appear once tasks have owners.
      </p>
    );
  }

  const overloaded = teamLoad.filter((p) => p.level === "Overloaded").length;
  const watch = teamLoad.filter((p) => p.level === "Watch").length;
  const available = teamLoad.filter((p) => p.level === "Available").length;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Gauge className="h-4 w-4 text-cyan-300" />
            Team Load Ribbon
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Open estimate hours vs {capacityHoursPerPerson}h capacity per person. Red = overloaded,
            amber = near capacity, green = room available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <Badge className="bg-rose-500/20 text-rose-100">{overloaded} overloaded</Badge>
          <Badge className="bg-amber-500/20 text-amber-100">{watch} watch</Badge>
          <Badge className="bg-emerald-500/20 text-emerald-100">{available} available</Badge>
        </div>
      </div>

      {/* Compact color ribbon strip */}
      <div className="flex h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
        {teamLoad.map((p) => {
          const styles = levelStyles(p.level);
          const width = Math.max(8, 100 / teamLoad.length);
          return (
            <div
              key={`ribbon-${p.name}`}
              title={`${p.name}: ${p.openHours}h / ${p.capacityHours}h (${p.level})`}
              className={cn("h-full border-r border-slate-950/40 last:border-r-0", styles.bar)}
              style={{ width: `${width}%`, opacity: Math.min(1, 0.45 + p.utilizationPct / 200) }}
            />
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {teamLoad.map((p) => {
          const styles = levelStyles(p.level);
          const fill = Math.min(100, p.utilizationPct);
          return (
            <div key={p.name} className={cn("rounded-xl border p-3", styles.cell)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {p.openTasks} open task{p.openTasks === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge className={styles.badge}>{p.level}</Badge>
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="font-display text-xl font-semibold text-white">
                  {p.openHours}
                  <span className="text-sm text-slate-500">/{p.capacityHours}h</span>
                </div>
                <div className={cn("text-xs font-semibold", styles.text)}>{p.utilizationPct}%</div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
                <div className={cn("h-full rounded-full", styles.bar)} style={{ width: `${fill}%` }} />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-400">{p.reason}</p>
            </div>
          );
        })}
      </div>

      {overloaded > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Reassign or split work for{" "}
            <span className="font-semibold">
              {teamLoad
                .filter((p) => p.level === "Overloaded")
                .map((p) => p.name)
                .join(", ")}
            </span>{" "}
            before adding new tasks.
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function WorkloadWindowPanel({ workload }: { workload: WorkloadWindow }) {
  const pressureTone =
    workload.pressureLabel === "Overloaded"
      ? "bg-rose-500/15 text-rose-200"
      : workload.pressureLabel === "Watch"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-emerald-500/15 text-emerald-200";

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-white">Workload Window</h3>
          <p className="mt-1 text-xs text-slate-400">
            Spot completion, delay, blocked work, and logged hours so overloads surface quickly.
          </p>
        </div>
        <Badge className={pressureTone}>Pressure: {workload.pressureLabel}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Completion %"
          value={`${workload.completionPct}%`}
          hint="Share of tasks marked done"
          tone={workload.completionPct >= 70 ? "ok" : workload.completionPct < 25 ? "warn" : "default"}
          icon={<Percent className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Average Delay"
          value={workload.averageDelayDays <= 0 ? "0d" : `${workload.averageDelayDays}d`}
          hint={
            workload.delayedTaskCount
              ? `${workload.delayedTaskCount} overdue task${workload.delayedTaskCount === 1 ? "" : "s"}`
              : "No overdue tasks"
          }
          tone={
            workload.averageDelayDays >= 5
              ? "danger"
              : workload.averageDelayDays >= 2
                ? "warn"
                : "ok"
          }
          icon={<Hourglass className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Blocked Tasks"
          value={String(workload.blockedTasks)}
          hint={`${workload.openEstimateHours}h still open on estimates`}
          tone={workload.blockedTasks >= 3 ? "danger" : workload.blockedTasks >= 1 ? "warn" : "ok"}
          icon={<ListChecks className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Hours Logged"
          value={`${workload.hoursLogged}h`}
          hint="Clocked WORK time on this project"
          tone="default"
          icon={<Clock3 className="h-3.5 w-3.5" />}
        />
      </div>

      <TeamLoadRibbon
        teamLoad={workload.teamLoad}
        capacityHoursPerPerson={workload.capacityHoursPerPerson}
      />
    </Card>
  );
}
