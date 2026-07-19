"use client";

import { useEffect, useRef } from "react";
import {
  STATUS_BAR,
  STATUS_COLUMNS,
  STATUS_LABEL,
  type LinkedTaskNode,
  type TaskStatusValue,
} from "@/lib/command-center-types";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

export function LinkedKanban({
  nodes,
  onStatusChange,
  canEdit,
  focusTaskId,
}: {
  nodes: LinkedTaskNode[];
  onStatusChange: (taskId: string, status: TaskStatusValue) => void;
  canEdit: boolean;
  focusTaskId?: string | null;
}) {
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusTaskId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusTaskId]);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        Move cards between columns — Overview health/budget, Process Workflow Map colors, and Gantt
        overshoot update from the same status model.
      </p>
      <div className="grid gap-3 overflow-x-auto md:grid-cols-5">
        {STATUS_COLUMNS.map((status) => {
          const cards = nodes.filter((n) => n.status === status);
          return (
            <div key={status} className="min-w-[180px] rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {STATUS_LABEL[status]}
                </div>
                <Badge className="bg-slate-800 text-slate-300">{cards.length}</Badge>
              </div>
              <div className={cn("mb-3 h-1 rounded-full", STATUS_BAR[status])} />
              <div className="space-y-2">
                {cards.map((card) => {
                  const focused = focusTaskId === card.id;
                  return (
                    <div
                      key={card.id}
                      ref={focused ? focusRef : undefined}
                      className={cn(
                        "rounded-xl border border-slate-800 bg-slate-900/80 p-3",
                        focused && "ring-2 ring-cyan-400/70"
                      )}
                    >
                      <div className="text-sm font-medium text-white">{card.title}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {card.team} · {card.owner}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">Due {formatDate(card.deadline)}</div>
                      {card.blockers.length ? (
                        <div className="mt-1 text-[10px] text-amber-300/90">
                          {card.blockers[0]}
                        </div>
                      ) : null}
                      <div className={cn("mt-2 h-1.5 rounded-full", STATUS_BAR[card.status])} />
                      {canEdit ? (
                        <select
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                          value={card.status}
                          onChange={(e) => onStatusChange(card.id, e.target.value as TaskStatusValue)}
                        >
                          {STATUS_COLUMNS.map((s) => (
                            <option key={s} value={s}>
                              Move to {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
