import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CommandCenter } from "@/components/command-center/command-center";
import type { LinkedTaskNode } from "@/lib/command-center-types";
import type { OverviewSeed } from "@/lib/overview-intel";
import { rankDowntimeHotspots, summarizeTimeEntries } from "@/lib/time-tracking";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; project?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const initialTab =
    sp.tab === "kanban" || sp.tab === "gantt" || sp.tab === "process" || sp.tab === "main"
      ? sp.tab
      : "main";

  const [projects, tasks, milestones, risks, issues, changes, allocations, timeEntries] =
    await Promise.all([
      prisma.project.findMany({
        where: { archived: false },
        include: { _count: { select: { tasks: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.task.findMany({
        where: {
          project: { archived: false },
          ...(sp.project ? { projectId: sp.project } : {}),
        },
        include: {
          assignee: true,
          project: {
            include: {
              risks: { where: { status: { not: "closed" } }, take: 8 },
              milestones: true,
            },
          },
          milestone: true,
          dependencies: { include: { dependsOn: true } },
          dependents: { include: { task: true } },
        },
        orderBy: [{ createdAt: "asc" }],
        take: 80,
      }),
      prisma.milestone.findMany({
        where: { project: { archived: false } },
        include: { phase: true },
        orderBy: [{ order: "asc" }],
      }),
      prisma.risk.findMany({
        where: { project: { archived: false } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.issue.findMany({
        where: { project: { archived: false } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.changeRequest.findMany({
        where: { project: { archived: false } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.resourceAllocation.findMany({
        include: { resource: true, user: true },
      }),
      prisma.timeEntry.findMany({
        where: {
          project: { archived: false },
          ...(sp.project ? { projectId: sp.project } : {}),
        },
        take: 500,
      }),
    ]);

  const budget = projects.reduce((sum, p) => sum + p.overallBudget, 0);
  const canEdit = can(session.user.role, "task:edit");
  const timeSummary = summarizeTimeEntries(timeEntries);
  const topWasteTaskId =
    Array.from(timeSummary.byTask.entries()).sort((a, b) => b[1].break - a[1].break)[0]?.[0] ?? null;

  const nodes: LinkedTaskNode[] = tasks.map((task) => {
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

  const downtimeHotspots = rankDowntimeHotspots(
    nodes.map((n) => ({
      id: n.id,
      title: n.title,
      projectName: n.projectName,
      status: n.status,
      team: n.team,
    })),
    timeSummary.byTask
  ).map((h) => ({
    ...h,
    // serialize for client
  }));

  const seed: OverviewSeed = {
    portfolioBudget: budget,
    projectEnds: Object.fromEntries(projects.map((p) => [p.id, p.endDate ? p.endDate.toISOString() : null])),
    milestones: milestones.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      phase: m.phase ? { name: m.phase.name, order: m.phase.order } : null,
    })),
    risks: risks.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    })),
    issues: issues.map((i) => ({
      id: i.id,
      title: i.title,
      priority: i.priority,
      status: i.status,
      updatedAt: i.updatedAt.toISOString(),
    })),
    changes: changes.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
    })),
    allocations: allocations.map((a) => ({
      hours: a.hours,
      resource: {
        name: a.resource.name,
        type: a.resource.type,
        capacityHours: a.resource.capacityHours,
      },
      user: a.user ? { name: a.user.name, username: a.user.username, role: a.user.role } : null,
    })),
  };

  return (
    <CommandCenter
      initialNodes={nodes}
      canEdit={canEdit}
      initialTab={initialTab}
      overview={{
        seed,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          taskCount: p._count.tasks,
        })),
        downtime: {
          workMinutes: timeSummary.workMinutes,
          breakMinutes: timeSummary.breakMinutes,
          hotspots: downtimeHotspots,
        },
      }}
    />
  );
}
