"use client";

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
}: {
  nodes: LinkedTaskNode[];
  onStatusChange: (taskId: string, status: TaskStatusValue) => void;
  canEdit: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        Move cards between columns — Process Map colors and Gantt health update together.
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
                {cards.map((card) => (
                  <div key={card.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="text-sm font-medium text-white">{card.title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {card.team} · {card.owner}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Due {formatDate(card.deadline)}</div>
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
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
