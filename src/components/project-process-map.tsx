"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setTaskStatus } from "@/app/actions";
import { SwimlaneProcessMap } from "@/components/command-center/swimlane-process-map";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";

/** Project-scoped process flowchart (same component as Command Center Process Workflow Map). */
export function ProjectProcessMap({
  nodes,
  canEdit,
}: {
  nodes: LinkedTaskNode[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onStatusChange(taskId: string, status: TaskStatusValue) {
    startTransition(async () => {
      await setTaskStatus(taskId, status);
      router.refresh();
    });
  }

  return (
    <div className="min-h-[420px] rounded-xl border border-slate-800 bg-slate-950/40">
      <SwimlaneProcessMap nodes={nodes} canEdit={canEdit} onStatusChange={onStatusChange} />
    </div>
  );
}
