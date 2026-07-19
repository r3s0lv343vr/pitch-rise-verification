"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  differenceInCalendarDays,
  min as minDate,
  max as maxDate,
} from "date-fns";
import {
  STATUS_BAR,
  STATUS_COLUMNS,
  STATUS_LABEL,
  type LinkedTaskNode,
  type TaskStatusValue,
} from "@/lib/command-center-types";
import { cn, formatDate } from "@/lib/utils";

function taskRange(node: LinkedTaskNode) {
  const start = node.startDate ? parseISO(node.startDate) : node.deadline ? parseISO(node.deadline) : new Date();
  const end = node.deadline ? parseISO(node.deadline) : start;
  return { start, end: end < start ? start : end };
}

export function GanttCalendar({
  nodes,
  canEdit,
  onStatusChange,
  focusTaskId,
}: {
  nodes: LinkedTaskNode[];
  canEdit?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatusValue) => void;
  focusTaskId?: string | null;
}) {
  const today = useMemo(() => new Date(), []);
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusTaskId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusTaskId]);

  const { monthStart, monthEnd, days, rangeStart, spanDays } = useMemo(() => {
    const starts = nodes.map((n) => taskRange(n).start);
    const ends = nodes.map((n) => taskRange(n).end);
    const anchor = starts.length ? minDate(starts) : today;
    const mStart = startOfMonth(anchor);
    const mEnd = endOfMonth(ends.length ? maxDate([...ends, today]) : today);
    const gridStart = startOfWeek(mStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const rStart = starts.length ? minDate(starts) : mStart;
    const rEnd = ends.length ? maxDate([...ends, today]) : mEnd;
    return {
      monthStart: mStart,
      monthEnd: mEnd,
      days: allDays,
      rangeStart: rStart,
      spanDays: Math.max(1, differenceInCalendarDays(rEnd, rStart) + 1),
    };
  }, [nodes, today]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Calendar with Gantt bars superimposed. Overshot (past deadline & not done) extends in{" "}
        <span className="font-semibold text-red-400">red</span>. Status changes sync Overview, Kanban,
        and Process Workflow Map.
      </p>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 text-sm font-medium text-white">
          {format(monthStart, "MMMM yyyy")}
          {format(monthStart, "yyyy-MM") !== format(monthEnd, "yyyy-MM")
            ? ` – ${format(monthEnd, "MMMM yyyy")}`
            : ""}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayNodes = nodes.filter((n) => {
              const { start, end } = taskRange(n);
              return day >= start && day <= end;
            });
            const overshot = dayNodes.some(
              (n) => n.status !== "DONE" && n.deadline && parseISO(n.deadline) < today && isSameDay(day, today)
            );
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[72px] rounded-lg border p-1 text-left",
                  isSameMonth(day, monthStart) ? "border-slate-800 bg-slate-900/40" : "border-slate-900 bg-slate-950/20 opacity-50",
                  isSameDay(day, today) && "ring-1 ring-cyan-400/60",
                  overshot && "border-red-500/40"
                )}
              >
                <div className="text-[10px] text-slate-400">{format(day, "d")}</div>
                <div className="mt-1 space-y-0.5">
                  {dayNodes.slice(0, 2).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "truncate rounded px-1 text-[9px] text-slate-950",
                        n.status !== "DONE" && n.deadline && parseISO(n.deadline) < today
                          ? "bg-red-400"
                          : STATUS_BAR[n.status],
                        focusTaskId === n.id && "ring-1 ring-white"
                      )}
                      title={n.title}
                    >
                      {n.title}
                    </div>
                  ))}
                  {dayNodes.length > 2 ? (
                    <div className="text-[9px] text-slate-500">+{dayNodes.length - 2}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 text-sm font-medium text-white">Gantt timeline</div>
        <div className="min-w-[720px] space-y-3">
          {nodes.map((node) => {
            const { start, end } = taskRange(node);
            const overshot = node.status !== "DONE" && !!node.deadline && parseISO(node.deadline) < today;
            const displayEnd = overshot ? maxDate([end, today]) : end;
            const left = (differenceInCalendarDays(start, rangeStart) / spanDays) * 100;
            const width = Math.max(
              3,
              ((differenceInCalendarDays(displayEnd, start) + 1) / spanDays) * 100
            );
            const plannedWidth = Math.max(
              2,
              ((differenceInCalendarDays(end, start) + 1) / spanDays) * 100
            );
            const focused = focusTaskId === node.id;
            return (
              <div
                key={node.id}
                ref={focused ? focusRef : undefined}
                className={cn("rounded-xl p-2", focused && "bg-cyan-500/10 ring-1 ring-cyan-400/40")}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-slate-100">{node.title}</span>
                  <span className="text-slate-500">
                    {node.team} · {node.owner} · {STATUS_LABEL[node.status]}
                  </span>
                  <span className="text-slate-500">
                    {formatDate(start)} → {formatDate(end)}
                    {overshot ? <span className="ml-1 text-red-400">· overshot to {formatDate(today)}</span> : null}
                  </span>
                  {canEdit && onStatusChange ? (
                    <select
                      className="ml-auto rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                      value={node.status}
                      onChange={(e) => onStatusChange(node.id, e.target.value as TaskStatusValue)}
                    >
                      {STATUS_COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <div className="relative h-8 rounded-lg bg-slate-900">
                  <div
                    className={cn("absolute top-1 h-6 rounded-md opacity-90", STATUS_BAR[node.status])}
                    style={{ left: `${left}%`, width: `${plannedWidth}%` }}
                  />
                  {overshot ? (
                    <div
                      className="absolute top-1 h-6 rounded-md bg-red-500/90"
                      style={{
                        left: `${left + plannedWidth}%`,
                        width: `${Math.max(2, width - plannedWidth)}%`,
                      }}
                      title="Timeline overshot — extended in red"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
