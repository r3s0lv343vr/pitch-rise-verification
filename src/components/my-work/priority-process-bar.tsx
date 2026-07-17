import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { PriorityTask } from "@/lib/time-tracking";
import { cn } from "@/lib/utils";

export function PersonalProcessListingBar({ tasks }: { tasks: PriorityTask[] }) {
  const ranked = [...tasks].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10);
  const max = ranked[0]?.impactScore || 1;

  return (
    <Card className="p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Personal Process Listing
      </div>
      <h2 className="font-display text-lg font-semibold text-white">Priority queue</h2>
      <p className="mt-1 text-xs text-slate-400">
        Greatest → least priority for your next completions. Critical impact items light up.
      </p>

      <div className="mt-4 space-y-2">
        {ranked.map((t, idx) => (
          <Link
            key={t.id}
            href={`/projects/${t.projectId}`}
            className={cn(
              "block rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 hover:border-cyan-500/30",
              t.critical && "impact-critical"
            )}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="mr-2 text-slate-500">#{idx + 1}</span>
                <span className="font-medium text-white">{t.title}</span>
              </div>
              <span className="shrink-0 text-[11px] text-slate-500">impact {t.impactScore}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  t.critical
                    ? "bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-300"
                    : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                )}
                style={{ width: `${Math.max(8, (t.impactScore / max) * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {t.projectName}
              {t.dependentTitles.length ? ` · unlocks ${t.dependentTitles.length}` : ""}
              {t.waitingOnNames.length ? ` · waiting on ${t.waitingOnNames[0].split(" ")[0]}` : ""}
            </div>
          </Link>
        ))}
        {ranked.length === 0 ? <p className="text-sm text-slate-500">No open process items.</p> : null}
      </div>
    </Card>
  );
}
