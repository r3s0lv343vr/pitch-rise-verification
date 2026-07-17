"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockInAction, clockOutAction } from "@/app/actions";
import { formatHours } from "@/lib/time-tracking";
import { Badge, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Coffee, Play, Square } from "lucide-react";

export function TimeClock({
  isClockedIn,
  activeStartedAt,
  activeTaskId,
  workMinutes,
  breakMinutes,
  projectBreakdown,
  tasks,
}: {
  isClockedIn: boolean;
  /** ISO start of open WORK or open BREAK session */
  activeStartedAt: string | null;
  activeTaskId: string | null;
  workMinutes: number;
  breakMinutes: number;
  projectBreakdown: { projectId: string; name: string; workMinutes: number; breakMinutes: number }[];
  tasks: { id: string; title: string; projectId: string; projectName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [taskId, setTaskId] = useState(activeTaskId ?? tasks[0]?.id ?? "");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isClockedIn || !activeStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isClockedIn, activeStartedAt]);

  const liveExtra = useMemo(() => {
    if (!isClockedIn || !activeStartedAt) return 0;
    void tick;
    return Math.max(0, (Date.now() - new Date(activeStartedAt).getTime()) / 60000);
  }, [isClockedIn, activeStartedAt, tick]);

  const shownWork = workMinutes + (isClockedIn ? liveExtra : 0);
  const shownBreak = breakMinutes + (!isClockedIn && activeStartedAt ? liveExtra : 0);

  function run(action: typeof clockInAction | typeof clockOutAction, withTask: boolean) {
    const fd = new FormData();
    if (withTask && taskId) {
      fd.set("taskId", taskId);
      const t = tasks.find((x) => x.id === taskId);
      if (t) fd.set("projectId", t.projectId);
    }
    startTransition(async () => {
      await action(fd);
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time tracking</div>
          <h2 className="mt-1 font-display text-lg font-semibold text-white">Clock In / Clock Out</h2>
          <p className="mt-1 text-xs text-slate-400">
            Work time feeds project completion burn. Clock-out starts downtime until your next clock-in.
          </p>
        </div>
        <Badge
          className={cn(
            isClockedIn ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
          )}
        >
          {isClockedIn ? "On the clock" : "On break / downtime"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Hours worked" value={formatHours(shownWork)} />
        <Stat label="Break / downtime" value={formatHours(shownBreak)} icon />
        <Stat
          label="Active session"
          value={
            activeStartedAt
              ? formatHours(liveExtra || entryFallback(activeStartedAt))
              : "—"
          }
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 text-xs text-slate-400">
          Focus task for this session
          <select
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={isClockedIn || pending}
          >
            {tasks.length === 0 ? <option value="">No open tasks</option> : null}
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} · {t.projectName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isClockedIn || pending || !taskId}
            onClick={() => run(clockInAction, true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 ring-1 ring-emerald-400/40 disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> Clock In
          </button>
          <button
            type="button"
            disabled={!isClockedIn || pending}
            onClick={() => run(clockOutAction, false)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 ring-1 ring-rose-400/40 disabled:opacity-40"
          >
            <Square className="h-4 w-4" /> Clock Out
          </button>
        </div>
      </div>

      {projectBreakdown.length ? (
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cumulative by project
          </div>
          {projectBreakdown.map((p) => (
            <div
              key={p.projectId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
            >
              <span className="text-slate-200">{p.name}</span>
              <span className="text-xs text-slate-400">
                Work {formatHours(p.workMinutes)} · Downtime {formatHours(p.breakMinutes)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon ? <Coffee className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function entryFallback(startedAt: string) {
  return Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 60000);
}
