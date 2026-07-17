import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/card";
import { CommandCenter } from "@/components/command-center/command-center";
import type { LinkedTaskNode } from "@/lib/command-center-types";
import Link from "next/link";

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

  const [projects, tasks, openRisks, usersCount, doneTasks, totalTasks, myTasks] = await Promise.all([
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
      take: 60,
    }),
    prisma.risk.count({ where: { status: { not: "closed" } } }),
    prisma.user.count(),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count(),
    prisma.task.findMany({
      where: { assigneeId: session.user.id, status: { not: "DONE" } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 1,
    }),
  ]);

  const budget = projects.reduce((sum, p) => sum + p.overallBudget, 0);
  const canEdit = can(session.user.role, "task:edit");
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const next = myTasks[0] ?? null;

  const nodes: LinkedTaskNode[] = tasks.map((task) => {
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
    };
  });

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col">
      <PageHeader
        title="Command Center"
        subtitle="Hamburger navigation frees the canvas. Main, Process Map, Kanban, and Gantt each fill their own tab."
        actions={
          <Link
            href="/projects"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400/40"
          >
            New / manage projects
          </Link>
        }
      />

      <div className="min-h-0 flex-1">
        <CommandCenter
          initialNodes={nodes}
          canEdit={canEdit}
          initialTab={initialTab}
          overview={{
            activeProjects: projects.length,
            portfolioBudget: budget,
            openRisks,
            processNodes: nodes.length,
            accounts: usersCount,
            progressPct,
            nextActionTitle: next?.title ?? null,
            nextActionProject: next?.project.name ?? null,
            nextActionProjectId: next?.projectId ?? null,
            projects: projects.map((p) => ({
              id: p.id,
              name: p.name,
              taskCount: p._count.tasks,
            })),
          }}
        />
      </div>
    </div>
  );
}
