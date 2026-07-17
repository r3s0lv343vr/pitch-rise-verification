"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/app/actions";
import { SwimlaneProcessMap } from "@/components/command-center/swimlane-process-map";
import { LinkedKanban } from "@/components/command-center/linked-kanban";
import { GanttCalendar } from "@/components/command-center/gantt-calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";

const tabs = [
  { id: "process", label: "Process Map" },
  { id: "kanban", label: "Kanban" },
  { id: "gantt", label: "Gantt + Calendar" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CommandCenter({
  initialNodes,
  canEdit,
  initialTab = "process",
}: {
  initialNodes: LinkedTaskNode[];
  canEdit: boolean;
  initialTab?: TabId;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [nodes, setNodes] = useState(initialNodes);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const projectNames = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.projectName))),
    [nodes]
  );

  function handleStatusChange(taskId: string, status: TaskStatusValue) {
    const previous = nodes;
    setNodes((curr) => curr.map((n) => (n.id === taskId ? { ...n, status } : n)));
    setMessage("Linked views updated — Process Map colors & Gantt health refreshed.");

    startTransition(async () => {
      const res = await setTaskStatus(taskId, status);
      if (!res.ok) {
        setNodes(previous);
        setMessage("Could not save status (permission or network). Reverted.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  tab === t.id
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            {projectNames.length} project{projectNames.length === 1 ? "" : "s"} · {nodes.length} process
            nodes
            {pending ? " · saving…" : ""}
          </div>
        </div>
        {message ? <p className="mt-2 text-xs text-cyan-300/90">{message}</p> : null}
      </Card>

      <Card>
        {tab === "process" ? (
          <div>
            <h2 className="mb-1 text-lg font-medium text-white">Process Map</h2>
            <p className="mb-4 text-sm text-slate-400">
              Swimlane flowchart by team/owner. Click a node for an instant dropdown (owner, deadline,
              blockers, budget, impact, documents, risks, milestones). Status color bars stay linked to
              Kanban.
            </p>
            <SwimlaneProcessMap nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
          </div>
        ) : null}

        {tab === "kanban" ? (
          <div>
            <h2 className="mb-1 text-lg font-medium text-white">Kanban</h2>
            <LinkedKanban nodes={nodes} canEdit={canEdit} onStatusChange={handleStatusChange} />
          </div>
        ) : null}

        {tab === "gantt" ? (
          <div>
            <h2 className="mb-1 text-lg font-medium text-white">Gantt + Calendar</h2>
            <GanttCalendar nodes={nodes} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
