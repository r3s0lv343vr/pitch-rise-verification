import { Card, Badge } from "@/components/ui/card";
import type { DependencyBottlenecks, DependencyImpactCard } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, GitBranch, ShieldAlert, Waves } from "lucide-react";

function impactBadge(level: string) {
  if (level === "Critical") return "bg-rose-500/20 text-rose-100";
  if (level === "High") return "bg-orange-500/20 text-orange-100";
  if (level === "Medium") return "bg-amber-500/20 text-amber-100";
  if (level === "Clear") return "bg-emerald-500/20 text-emerald-100";
  return "bg-slate-800 text-slate-300";
}

function ImpactCard({ card }: { card: DependencyImpactCard }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        card.projectImpact === "Critical"
          ? "border-rose-500/40 bg-rose-500/5"
          : card.projectImpact === "High"
            ? "border-orange-500/40 bg-orange-500/5"
            : "border-slate-800 bg-slate-950/50"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">{card.label}</div>
          <div className="mt-0.5 text-xs text-slate-500">{card.title}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={impactBadge(card.projectImpact)}>{card.projectImpact} impact</Badge>
          <Badge className="bg-slate-800 text-slate-300">{card.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Downstream</div>
          <div className="mt-0.5 text-sm font-semibold text-rose-200">{card.waitingCount}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Hours at risk</div>
          <div className="mt-0.5 text-sm font-semibold text-amber-200">{card.hoursAtRisk}h</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Stages hit</div>
          <div className="mt-0.5 text-sm font-semibold text-cyan-200">
            {card.stagesImpacted.length || 0}
          </div>
        </div>
      </div>

      {card.downstreamLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">Ripple:</span>
          {card.downstreamLabels.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-1">
              {i > 0 ? <ArrowRight className="h-3 w-3 text-slate-600" /> : null}
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-cyan-100">
                {label}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-slate-300">{card.ifUnresolved}</p>
      <p className="mt-2 text-xs text-slate-500">
        <span className="font-medium text-slate-400">What to do: </span>
        {card.recommendation}
      </p>
    </div>
  );
}

export function DependencyBottlenecksPanel({
  bottlenecks,
}: {
  bottlenecks: DependencyBottlenecks;
}) {
  const impact = bottlenecks.projectImpact;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-cyan-300" />
            <h3 className="font-display text-base font-semibold text-white">
              Dependency Impact Assessment
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            How unresolved gates cascade into downstream stages — and what that means for project
            delivery.
          </p>
        </div>
        <Badge className={impactBadge(impact.level)}>Project impact: {impact.level}</Badge>
      </div>

      {/* Project-level impact strip */}
      <div
        className={cn(
          "mb-4 rounded-xl border p-3",
          impact.level === "Critical" || impact.level === "High"
            ? "border-rose-500/40 bg-rose-500/5"
            : impact.level === "Clear"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          <ShieldAlert
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              impact.level === "Critical" || impact.level === "High"
                ? "text-rose-300"
                : "text-amber-300"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">Project impact if left unresolved</div>
            <p className="mt-1 text-sm text-slate-300">{impact.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge className="bg-slate-900/80 text-rose-200">
                {impact.tasksAtRisk} tasks at risk
              </Badge>
              <Badge className="bg-slate-900/80 text-amber-200">{impact.hoursAtRisk}h at risk</Badge>
              {impact.stagesImpacted.map((stage) => (
                <Badge key={stage} className="bg-slate-900/80 text-cyan-200">
                  {stage}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        {/* Cascade chain */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Waves className="h-3.5 w-3.5" />
            Downstream cascade
          </div>
          <p className="mb-3 text-[11px] text-slate-500">
            Read top → bottom: unresolved area first, then what it stalls next.
          </p>
          {bottlenecks.chain.length === 0 ? (
            <p className="text-sm text-slate-400">No open dependency cascade on this project.</p>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {bottlenecks.chain.map((node, idx) => (
                <div
                  key={`${node.kind}-${node.label}-${idx}`}
                  className="flex w-full max-w-md flex-col items-center"
                >
                  {idx > 0 ? (
                    <ArrowDown className="my-1 h-4 w-4 text-slate-500" aria-hidden />
                  ) : null}
                  {node.kind === "queue" ? (
                    <div className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center">
                      <div className="text-sm font-semibold text-amber-100">{node.label}</div>
                      <div className="mt-1 text-[11px] text-amber-200/80">{node.impactLine}</div>
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
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {idx === 0 ? "Unresolved gate" : "Downstream area"}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">{node.label}</div>
                      <div className="mt-1 truncate text-xs text-slate-400" title={node.detail}>
                        {node.detail}
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-cyan-200">
                        {node.impactLine}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Impact cards */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Critical areas → project impact
          </div>
          {bottlenecks.ranked.length === 0 ? (
            <p className="text-sm text-slate-400">No ranked dependency impacts.</p>
          ) : (
            bottlenecks.ranked.slice(0, 3).map((card) => (
              <ImpactCard key={`${card.title}-${card.label}`} card={card} />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
