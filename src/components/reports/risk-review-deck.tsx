import { Card, Badge } from "@/components/ui/card";
import type { CriticalRiskReview } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { Lightbulb, ShieldAlert } from "lucide-react";

export function RiskReviewDeck({ risks }: { risks: CriticalRiskReview[] }) {
  if (risks.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-display text-base font-semibold text-white">Critical Risk Review</h3>
        <p className="mt-2 text-sm text-slate-400">No high/critical open risks on this project.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-300" />
          <h3 className="font-display text-base font-semibold text-white">Critical Risk Areas</h3>
        </div>
        <div className="space-y-3">
          {risks.map((r) => (
            <div key={r.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{r.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Process stage: <span className="text-cyan-200">{r.stage}</span>
                  </div>
                </div>
                <Badge
                  className={cn(
                    r.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-100"
                      : "bg-amber-500/20 text-amber-100"
                  )}
                >
                  {r.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-300">{r.description}</p>
              <p className="mt-2 text-xs text-slate-500">Current mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-300" />
          <h3 className="font-display text-base font-semibold text-white">
            Solutions Deck — Critical Risk Areas
          </h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {risks.flatMap((r) =>
            r.solutions.map((solution, idx) => (
              <div
                key={`${r.id}-${idx}`}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {r.stage} · {r.severity}
                </div>
                <div className="mt-1 text-sm font-medium text-cyan-100">{r.title}</div>
                <p className="mt-2 text-sm text-slate-300">{solution}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
