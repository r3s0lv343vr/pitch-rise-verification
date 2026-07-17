import { Card, Badge } from "@/components/ui/card";
import type { DependencyBottlenecks } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { ArrowDown, GitBranch, Link2 } from "lucide-react";

export function DependencyBottlenecksPanel({
  bottlenecks,
}: {
  bottlenecks: DependencyBottlenecks;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-cyan-300" />
            <h3 className="font-display text-base font-semibold text-white">Dependency Bottlenecks</h3>
          </div>
          <p className="text-xs text-slate-400">
            Top choke points in the process chain — where unfinished gates stall downstream work.
          </p>
        </div>
        {bottlenecks.waitingOnTop > 0 ? (
          <Badge className="bg-rose-500/15 text-rose-200">
            {bottlenecks.waitingOnTop} waiting on {bottlenecks.topLabel}
          </Badge>
        ) : (
          <Badge className="bg-emerald-500/15 text-emerald-200">Flow clear</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top Bottlenecks
          </div>
          {bottlenecks.chain.length === 0 ? (
            <p className="text-sm text-slate-400">No open dependency bottlenecks on this project.</p>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {bottlenecks.chain.map((node, idx) => (
                <div key={`${node.kind}-${node.label}-${idx}`} className="flex w-full max-w-md flex-col items-center">
                  {idx > 0 ? (
                    <ArrowDown className="my-1 h-4 w-4 text-slate-500" aria-hidden />
                  ) : null}
                  {node.kind === "queue" ? (
                    <div className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center">
                      <div className="text-sm font-semibold text-amber-100">{node.label}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-amber-200/70">
                        Queue pressure
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-center",
                        node.status === "BLOCKED"
                          ? "border-rose-500/40 bg-rose-500/10"
                          : node.status === "IN_REVIEW"
                            ? "border-violet-500/40 bg-violet-500/10"
                            : "border-cyan-500/30 bg-cyan-500/10"
                      )}
                    >
                      <div className="text-sm font-semibold text-white">{node.label}</div>
                      <div className="mt-1 truncate text-xs text-slate-400" title={node.detail}>
                        {node.detail}
                      </div>
                      {node.waitingCount > 0 ? (
                        <div className="mt-2 text-[11px] font-medium text-cyan-200">
                          {node.waitingCount} downstream waiting
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Link2 className="h-3.5 w-3.5" />
            Ranked choke points
          </div>
          {bottlenecks.ranked.length === 0 ? (
            <p className="text-sm text-slate-400">No ranked bottlenecks.</p>
          ) : (
            <ol className="space-y-2">
              {bottlenecks.ranked.map((row, i) => (
                <li
                  key={`${row.title}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {i + 1}. {row.label}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{row.title}</div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-slate-800 text-slate-300">{row.status.replaceAll("_", " ")}</Badge>
                    <div className="mt-1 text-[11px] text-rose-200">
                      {row.waitingCount} waiting
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Card>
  );
}
