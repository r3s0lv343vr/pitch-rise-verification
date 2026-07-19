import { Card } from "@/components/ui/card";
import { CheckCircle2, Unlock, UserRound, Clock3, AlertTriangle, Wallet } from "lucide-react";
import type { PriorityTask } from "@/lib/time-tracking";

export function DailyBriefBar({
  priority,
  workloadHours,
  budgetOk,
  scheduleRisks,
}: {
  priority: PriorityTask | null;
  workloadHours: number;
  budgetOk: boolean;
  scheduleRisks: number;
}) {
  return (
    <Card className="overflow-hidden border-cyan-500/20 bg-gradient-to-r from-slate-950 via-slate-900/80 to-cyan-950/30 p-0">
      <div className="border-b border-slate-800/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
        Daily Brief
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
          <div className="text-xs uppercase tracking-wide text-slate-500">Today&apos;s priority</div>
          {priority ? (
            <>
              <div className="mt-2 flex items-start gap-2 text-base font-medium text-white">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Finish {priority.title}</span>
              </div>
              {priority.dependentTitles.length ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Unlock className="h-3 w-3" /> This unlocks
                  </div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {priority.dependentTitles.slice(0, 3).map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No immediate unlocks listed.</p>
              )}
              {priority.waitingOnNames[0] ? (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-amber-200">
                  <UserRound className="h-3.5 w-3.5" />
                  One task is waiting on {priority.waitingOnNames[0].split(" ")[0]}.
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No open priority right now — clear board.</p>
          )}
        </div>

        <div className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
            <Clock3 className="h-3.5 w-3.5" /> Estimated workload
          </div>
          <div className="font-display text-3xl font-semibold text-white">
            {workloadHours.toFixed(1)} hours
          </div>
          <p className="mt-2 text-xs text-slate-500">Sum of open estimates on your plate today.</p>
        </div>

        <div className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-200">
              <Wallet className="h-4 w-4" />
              {budgetOk ? "No budget issues." : "Budget variance needs review."}
            </div>
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              {scheduleRisks === 0
                ? "No schedule risks on your assignments."
                : `${scheduleRisks} schedule risk${scheduleRisks === 1 ? "" : "s"}.`}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
