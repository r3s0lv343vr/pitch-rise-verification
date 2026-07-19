import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import { STATUS_LABEL } from "@/lib/command-center-types";
import type { OverviewActivityItem } from "@/lib/overview-intel";

export function statusBurnRatio(status: TaskStatusValue) {
  if (status === "DONE") return 1;
  if (status === "IN_REVIEW") return 0.75;
  if (status === "IN_PROGRESS") return 0.45;
  if (status === "BLOCKED") return 0.35;
  return 0.1;
}

/** Keep blockers + budget burn aligned with the shared status model. */
export function applyStatusToLinkedNodes(
  nodes: LinkedTaskNode[],
  taskId: string,
  status: TaskStatusValue
): LinkedTaskNode[] {
  const patched = nodes.map((n) =>
    n.id === taskId
      ? {
          ...n,
          status,
          budgetConsumed: Math.round(n.budgetAllocated * statusBurnRatio(status)),
          // preserve clock-attributed waste/work minutes across status sync
          wasteMinutes: n.wasteMinutes,
          workMinutes: n.workMinutes,
          isWasteHotspot: n.isWasteHotspot,
        }
      : n
  );

  const byId = Object.fromEntries(patched.map((n) => [n.id, n]));

  return patched.map((n) => {
    const unmetDeps = n.dependsOnIds
      .map((id) => byId[id])
      .filter((dep): dep is LinkedTaskNode => !!dep && dep.status !== "DONE")
      .map((dep) => `Waiting on: ${dep.title}`);
    const riskBlockers = n.blockers.filter((b) => b.startsWith("Risk:"));
    const blockedSelf =
      n.status === "BLOCKED" && unmetDeps.length === 0 && riskBlockers.length === 0
        ? ["Marked blocked in linked status model"]
        : [];
    return {
      ...n,
      blockers: [...unmetDeps, ...riskBlockers, ...blockedSelf],
    };
  });
}

export function makeLiveActivityEvent(
  node: LinkedTaskNode,
  status: TaskStatusValue
): OverviewActivityItem {
  const when = new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const who = node.owner?.split(" ")[0] || "Teammate";
  return {
    id: `live-${node.id}-${Date.now()}`,
    when,
    group: "today",
    text: `${who} moved “${node.title}” → ${STATUS_LABEL[status]} (linked views)`,
  };
}
