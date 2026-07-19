import { Card, Badge } from "@/components/ui/card";
import type { ResourceReallocation } from "@/lib/report-analytics";
import { cn } from "@/lib/utils";
import { ArrowRight, UsersRound, Shuffle } from "lucide-react";

function stageStatusBadge(status: string) {
  if (status === "Struggling") return "bg-rose-500/20 text-rose-100";
  if (status === "Clear") return "bg-emerald-500/20 text-emerald-100";
  return "bg-slate-800 text-slate-300";
}

function memberStatusBadge(status: string) {
  if (status === "Ready to reallocate") return "bg-emerald-500/20 text-emerald-100";
  if (status === "Partially free") return "bg-amber-500/20 text-amber-100";
  return "bg-slate-800 text-slate-300";
}

export function ResourceReallocationPanel({
  reallocation,
}: {
  reallocation: ResourceReallocation;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-cyan-300" />
            <h3 className="font-display text-base font-semibold text-white">
              Team Resource Allocation
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            See who finished their process area and can be moved into stages that are struggling.
          </p>
        </div>
        <Badge className="bg-cyan-500/15 text-cyan-200">
          {reallocation.suggestions.length} move option
          {reallocation.suggestions.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <p className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
        {reallocation.summary}
      </p>

      {/* Stage health by process area */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {reallocation.stages.map((stage) => (
          <div
            key={stage.stage}
            className={cn(
              "rounded-xl border p-3",
              stage.status === "Struggling"
                ? "border-rose-500/40 bg-rose-500/5"
                : stage.status === "Clear"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-950/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-white">{stage.stage}</div>
              <Badge className={stageStatusBadge(stage.status)}>{stage.status}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span>{stage.completionPct}% done</span>
              <span>·</span>
              <span>{stage.openTasks} open</span>
              <span>·</span>
              <span>{stage.blockedTasks} blocked</span>
              <span>·</span>
              <span>{stage.openHours}h</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{stage.needLabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Members by home stage / availability */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Members by process area
          </div>
          {reallocation.available.length === 0 ? (
            <p className="text-sm text-slate-400">No assigned members with task history yet.</p>
          ) : (
            <ul className="space-y-2">
              {reallocation.available.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    m.status === "Ready to reallocate"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : m.status === "Partially free"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-slate-800 bg-slate-950/50"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-white">{m.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Home: <span className="text-cyan-200">{m.homeStage}</span>
                        {" · "}
                        {m.doneTasks} done / {m.openTasks} open
                        {m.freeHours > 0 ? ` · ~${m.freeHours}h free` : ""}
                      </div>
                    </div>
                    <Badge className={memberStatusBadge(m.status)}>{m.status}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">{m.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suggested moves */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Shuffle className="h-3.5 w-3.5" />
            Suggested reallocations
          </div>
          {reallocation.suggestions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No moves recommended right now — either no stage is struggling, or free capacity is
              not available yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reallocation.suggestions.map((s, i) => (
                <li
                  key={`${s.memberName}-${s.toStage}-${i}`}
                  className={cn(
                    "rounded-xl border p-3",
                    s.priority === "High"
                      ? "border-rose-500/40 bg-rose-500/5"
                      : "border-cyan-500/30 bg-cyan-500/5"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                      <span>{s.memberName}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-cyan-200">{s.toStage}</span>
                    </div>
                    <Badge
                      className={
                        s.priority === "High"
                          ? "bg-rose-500/20 text-rose-100"
                          : "bg-cyan-500/20 text-cyan-100"
                      }
                    >
                      {s.priority} priority
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="rounded-full border border-slate-700 px-2 py-0.5">
                      From {s.fromStage}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    <span className="rounded-full border border-slate-700 px-2 py-0.5">
                      To {s.toStage}
                    </span>
                    <span className="rounded-full border border-slate-700 px-2 py-0.5">
                      ~{s.freeHours}h available
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{s.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
