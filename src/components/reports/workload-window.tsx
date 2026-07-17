import type { ReactNode } from "react";
import { Card, Badge } from "@/components/ui/card";
import type { WorkloadWindow } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock3, Hourglass, ListChecks, Percent } from "lucide-react";

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
          value={
            workload.averageDelayDays <= 0
              ? "0d"
              : `${workload.averageDelayDays}d`
          }
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

      {workload.overloadPeople.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Overload signals
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {workload.overloadPeople.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-100">{p.name}</span>
                <span className="text-xs text-slate-400">
                  {p.openTasks} open · {p.openHours}h
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          No individual overload flags — open workload is distributed within thresholds.
        </p>
      )}
    </Card>
  );
}
