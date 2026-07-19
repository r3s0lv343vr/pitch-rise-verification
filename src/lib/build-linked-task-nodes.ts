import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import { summarizeTimeEntries } from "@/lib/time-tracking";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatusValue;
  projectId: string;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  assignee: { name: string; username: string } | null;
  milestone: { id: string; name: string; subBudget: number } | null;
  project: {
    name: string;
    overallBudget: number;
    milestones: { id: string; name: string; subBudget: number }[];
    risks: { id: string; title: string; severity: string; status: string }[];
  };
  dependencies: { dependsOnId: string; dependsOn: { title: string; status: string } }[];
  dependents: { taskId: string; task: { title: string } }[];
};

type TimeEntryRow = {
  id: string;
  kind: "WORK" | "BREAK";
  startedAt: Date;
  endedAt: Date | null;
  taskId: string | null;
  projectId: string | null;
  userId?: string;
};

function teamFor(name?: string | null, username?: string | null) {
  const n = `${name ?? ""} ${username ?? ""}`.toLowerCase();
  if (n.includes("randall")) return "Team A";
  if (n.includes("alpha")) return "Team Alpha";
  if (n.includes("priya") || n.includes("pm")) return "Delivery Lead";
  if (n.includes("marcus") || n.includes("member")) return "Team A";
  if (n.includes("alex") || n.includes("admin")) return "Platform Ops";
  if (n.includes("staff")) return "Staff Review";
  const key = (username || name || "unassigned").length;
  return ["Team A", "Team Alpha", "Team Cascade", "Team North"][key % 4];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Build Command Center / Project Map process nodes from one project's tasks. */
export function buildLinkedTaskNodes(
  tasks: TaskRow[],
  timeEntries: TimeEntryRow[] = []
): LinkedTaskNode[] {
  const timeSummary = summarizeTimeEntries(timeEntries);
  const topWasteTaskId =
    Array.from(timeSummary.byTask.entries()).sort((a, b) => b[1].break - a[1].break)[0]?.[0] ?? null;

  return tasks.map((task) => {
    const taskTime = timeSummary.byTask.get(task.id) ?? { work: 0, break: 0 };
    const milestoneBudget =
      task.milestone?.subBudget ??
      task.project.overallBudget / Math.max(task.project.milestones.length, 1);
    const consumedRatio =
      task.status === "DONE"
        ? 1
        : task.status === "IN_REVIEW"
          ? 0.75
          : task.status === "IN_PROGRESS"
            ? 0.45
            : task.status === "BLOCKED"
              ? 0.35
              : 0.1;
    const unmetDeps = task.dependencies
      .filter((d) => d.dependsOn.status !== "DONE")
      .map((d) => `Waiting on: ${d.dependsOn.title}`);
    const riskBlockers =
      task.status === "BLOCKED" ? task.project.risks.slice(0, 2).map((r) => `Risk: ${r.title}`) : [];
    const titleLower = task.title.toLowerCase();

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      owner: task.assignee?.name ?? "Unassigned",
      ownerUsername: task.assignee?.username ?? "",
      team: teamFor(task.assignee?.name, task.assignee?.username),
      startDate: task.startDate ? task.startDate.toISOString() : task.createdAt.toISOString(),
      deadline: task.dueDate ? task.dueDate.toISOString() : null,
      blockers: [...unmetDeps, ...riskBlockers],
      budgetConsumed: Math.round(milestoneBudget * consumedRatio),
      budgetAllocated: Math.round(milestoneBudget),
      downstreamImpact: task.dependents.map((d) => d.task.title),
      linkedDocuments: [
        `${task.project.name} / briefs / ${slugify(task.title)}.md`,
        task.milestone
          ? `${task.project.name} / milestones / ${slugify(task.milestone.name)}.pdf`
          : `${task.project.name} / plans / delivery-plan.md`,
      ],
      linkedRisks: task.project.risks.slice(0, 3).map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
      })),
      linkedMilestones: task.milestone
        ? [{ id: task.milestone.id, name: task.milestone.name }]
        : task.project.milestones.slice(0, 2).map((m) => ({ id: m.id, name: m.name })),
      projectId: task.projectId,
      projectName: task.project.name,
      dependsOnIds: task.dependencies.map((d) => d.dependsOnId),
      dependentIds: task.dependents.map((d) => d.taskId),
      isDecision: titleLower.includes("decision") || titleLower.includes("approve"),
      isTerminal: titleLower.includes("complete") || titleLower.includes("start"),
      wasteMinutes: taskTime.break,
      workMinutes: taskTime.work,
      isWasteHotspot: topWasteTaskId === task.id && taskTime.break > 0,
    };
  });
}
