import { Card, Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportProgressBanner({
  progressPct,
  daysRemaining,
  doneTasks,
  totalTasks,
}: {
  progressPct: number;
  daysRemaining: number | null;
  doneTasks: number;
  totalTasks: number;
}) {
  const daysLabel =
    daysRemaining == null
      ? "No completion date set"
      : daysRemaining < 0
        ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`
        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</div>
          <div className="mt-1 font-display text-3xl font-semibold text-white">
            {progressPct}
            <span className="text-lg text-slate-500">%</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {doneTasks}/{totalTasks} tasks complete
          </p>
        </div>
        <Badge
          className={cn(
            daysRemaining != null && daysRemaining < 0
              ? "bg-rose-500/15 text-rose-200"
              : daysRemaining != null && daysRemaining <= 7
                ? "bg-amber-500/15 text-amber-200"
                : "bg-cyan-500/15 text-cyan-200"
          )}
        >
          {daysLabel}
        </Badge>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all"
          style={{ width: `${Math.max(2, Math.min(100, progressPct))}%` }}
        />
      </div>
    </Card>
  );
}
