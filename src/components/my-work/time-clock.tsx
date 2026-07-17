"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockInAction, clockOutAction } from "@/app/actions";
import { formatClock, formatHours } from "@/lib/time-tracking";
import { Badge, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Coffee, Play, Square } from "lucide-react";

type ProjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string; projectId: string; projectName: string };
type BreakdownRow = {
  projectId: string;
  name: string;
  workMinutes: number;
  breakMinutes: number;
};

export function TimeClock({
  isClockedIn,
  activeStartedAt,
  activeTaskId,
  activeProjectId,
  closedWorkMinutes,
  closedBreakMinutes,
  todayWorkMinutes,
  todayByProject,
  cumulativeByProject,
  projects,
  tasks,
}: {
  isClockedIn: boolean;
  activeStartedAt: string | null;
  activeTaskId: string | null;
  activeProjectId: string | null;
  closedWorkMinutes: number;
  closedBreakMinutes: number;
  todayWorkMinutes: number;
  todayByProject: BreakdownRow[];
  cumulativeByProject: BreakdownRow[];
  projects: ProjectOption[];
  tasks: TaskOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(
    activeProjectId ?? tasks[0]?.projectId ?? projects[0]?.id ?? ""
  );
  const [taskId, setTaskId] = useState(activeTaskId ?? "");
  const [tick, setTick] = useState(0);
  const [localIn, setLocalIn] = useState(isClockedIn);
  const [localStartedAt, setLocalStartedAt] = useState(activeStartedAt);

  useEffect(() => {
    setLocalIn(isClockedIn);
    setLocalStartedAt(activeStartedAt);
  }, [isClockedIn, activeStartedAt]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const liveMinutes = useMemo(() => {
    if (!localStartedAt) return 0;
    void tick;
    return Math.max(0, (Date.now() - new Date(localStartedAt).getTime()) / 60000);
  }, [localStartedAt, tick]);

  const sessionClock = formatClock(liveMinutes);
  const wallClock = useMemo(() => {
    void tick;
    return new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [tick]);

  const totalWork = closedWorkMinutes + (localIn ? liveMinutes : 0);
  const totalBreak = closedBreakMinutes + (!localIn && localStartedAt ? liveMinutes : 0);
  const todayWork = todayWorkMinutes + (localIn ? liveMinutes : 0);

  const tasksForProject = useMemo(
    () => tasks.filter((t) => !projectId || t.projectId === projectId),
    [tasks, projectId]
  );

  useEffect(() => {
    if (taskId && tasksForProject.some((t) => t.id === taskId)) return;
    setTaskId(tasksForProject[0]?.id ?? "");
  }, [projectId, taskId, tasksForProject]);

  function onClockIn() {
    setMessage(null);
    startTransition(async () => {
      const res = await clockInAction({
        taskId: taskId || null,
        projectId: projectId || null,
      });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setLocalIn(true);
      setLocalStartedAt(res.startedAt);
      setMessage("Clocked in — session timer running.");
      router.refresh();
    });
  }

  function onClockOut() {
    setMessage(null);
    startTransition(async () => {
      const res = await clockOutAction();
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setLocalIn(false);
      setLocalStartedAt(res.endedAt);
      setMessage("Clocked out — downtime tracking until next clock-in.");
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time tracking</div>
          <h2 className="mt-1 font-display text-lg font-semibold text-white">Work Clock</h2>
          <p className="mt-1 text-xs text-slate-400">
            Clock in/out against a project. Totals update for today and across all projects.
          </p>
        </div>
        <Badge
          className={cn(
            localIn ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
          )}
        >
          {localIn ? "On the clock" : "Off the clock / break"}
        </Badge>
      </div>

      {/* Clock face + aligned action buttons */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Local time</div>
          <div className="font-display mt-1 text-3xl font-semibold tabular-nums text-slate-200 sm:text-4xl">
            {wallClock}
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">
            {localIn ? "Session worked" : localStartedAt ? "Break / downtime" : "Session"}
          </div>
          <div
            className={cn(
              "font-display mt-1 text-4xl font-semibold tabular-nums sm:text-5xl",
              localIn ? "text-emerald-300" : "text-amber-200"
            )}
          >
            {localStartedAt ? sessionClock : "00:00:00"}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={localIn || pending || (!projectId && projects.length === 0)}
              onClick={onClockIn}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4" /> Clock In
            </button>
            <button
              type="button"
              disabled={!localIn || pending}
              onClick={onClockOut}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" /> Clock Out
            </button>
          </div>
          {message ? (
            <p
              className={cn(
                "mt-3 text-xs",
                message.toLowerCase().includes("could not") ||
                  message.toLowerCase().includes("already") ||
                  message.toLowerCase().includes("not clocked") ||
                  message.toLowerCase().includes("join")
                  ? "text-rose-300"
                  : "text-cyan-300"
              )}
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-slate-400">
            Project
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={localIn || pending}
            >
              {projects.length === 0 ? <option value="">No projects available</option> : null}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Focus task (optional)
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={localIn || pending}
            >
              <option value="">Project-level time only</option>
              {tasksForProject.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Your total worked" value={formatHours(totalWork)} />
            <Stat label="Your total breaks" value={formatHours(totalBreak)} icon />
            <Stat label="Worked today" value={formatHours(todayWork)} />
            <Stat label="Projects tracked" value={String(cumulativeByProject.length)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Breakdown
          title="Today · time per project"
          empty="No work logged today yet. Clock in to start."
          rows={todayByProject}
          emphasizeWork
        />
        <Breakdown
          title="Cumulative · time per project"
          empty="No project time logged yet."
          rows={cumulativeByProject}
          emphasizeWork
        />
      </div>
    </Card>
  );
}

function Breakdown({
  title,
  empty,
  rows,
  emphasizeWork,
}: {
  title: string;
  empty: string;
  rows: BreakdownRow[];
  emphasizeWork?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {rows.length === 0 ? <p className="text-xs text-slate-600">{empty}</p> : null}
      <div className="space-y-1.5">
        {rows.map((p) => (
          <div
            key={p.projectId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 px-2.5 py-2 text-sm"
          >
            <span className="text-slate-200">{p.name}</span>
            <span className="text-xs text-slate-400">
              <span className={cn(emphasizeWork && "font-semibold text-emerald-200")}>
                Worked {formatHours(p.workMinutes)}
              </span>
              {" · "}
              Breaks {formatHours(p.breakMinutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon ? <Coffee className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}
