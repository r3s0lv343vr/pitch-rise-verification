"use client";

import { Card, Badge } from "@/components/ui/card";
import { formatHours, type DowntimeHotspot } from "@/lib/time-tracking";
import { cn } from "@/lib/utils";
import { TimerReset } from "lucide-react";

export function DowntimeCorrelationPanel({
  workMinutes,
  breakMinutes,
  hotspots,
  onOpenProcess,
}: {
  workMinutes: number;
  breakMinutes: number;
  hotspots: DowntimeHotspot[];
  onOpenProcess?: () => void;
}) {
  const ratio = workMinutes + breakMinutes > 0 ? breakMinutes / (workMinutes + breakMinutes) : 0;
  const tone =
    ratio >= 0.35 ? "High downtime drag" : ratio >= 0.2 ? "Moderate downtime" : "Healthy tempo";

  return (
    <Card className="p-4 xl:col-span-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TimerReset className="h-4 w-4 text-amber-300" />
          <h2 className="font-display text-base font-semibold text-white">
            Downtime Correlation
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              ratio >= 0.35
                ? "bg-rose-500/15 text-rose-200"
                : ratio >= 0.2
                  ? "bg-amber-500/15 text-amber-200"
                  : "bg-emerald-500/15 text-emerald-200"
            )}
          >
            {tone}
          </Badge>
          {onOpenProcess ? (
            <button
              type="button"
              onClick={onOpenProcess}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-cyan-200 hover:border-cyan-400/40"
            >
              View on Process Workflow Map →
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Mini label="Portfolio work logged" value={formatHours(workMinutes)} />
        <Mini label="Portfolio downtime" value={formatHours(breakMinutes)} />
        <Mini label="Downtime share" value={`${Math.round(ratio * 100)}%`} />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {hotspots.slice(0, 6).map((h, idx) => (
          <div
            key={h.taskId}
            className={cn(
              "rounded-xl border px-3 py-2",
              idx === 0
                ? "border-rose-400/50 bg-rose-500/10"
                : "border-slate-800 bg-slate-950/40"
            )}
          >
            <div className="text-sm font-medium text-white">{h.title}</div>
            <div className="text-[11px] text-slate-500">
              {h.projectName} · {h.stageHint} · {h.status}
            </div>
            <div className="mt-1 text-xs text-amber-200">
              Downtime {formatHours(h.breakMinutes)}
              {idx === 0 ? " · primary waste hotspot" : ""}
            </div>
          </div>
        ))}
        {hotspots.length === 0 ? (
          <p className="text-sm text-slate-500">No attributed downtime yet — clock sessions will populate this.</p>
        ) : null}
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
