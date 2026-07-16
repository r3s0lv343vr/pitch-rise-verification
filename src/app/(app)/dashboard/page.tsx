import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { ProcessMap, type ProcessMapNode } from "@/components/process-map";
import { formatCurrency, taskStatusLabel } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Flame } from "lucide-react";

function teamFor(name?: string | null, username?: string | null) {
  const n = `${name ?? ""} ${username ?? ""}`.toLowerCase();
  if (n.includes("randall")) return "Team A";
  if (n.includes("alpha")) return "Team Alpha";
  if (n.includes("priya") || n.includes("pm")) return "Delivery Lead";
  if (n.includes("marcus") || n.includes("member")) return "Team A";
  if (n.includes("alex") || n.includes("admin")) return "Platform Ops";
  if (n.includes("staff")) return "Staff Review";
  // Stable cohort buckets
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

export default async function DashboardPage() {
  const session = await requireSession();

  const [projects, tasks, openRisks, usersCount, doneTasks, totalTasks, myTasks] = await Promise.all([
    prisma.project.findMany({
      where: { archived: false },
      include: {
        tasks: true,
        milestones: true,
        risks: { where: { status: { not: "closed" } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { project: { archived: false } },
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
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 40,
    }),
    prisma.risk.count({ where: { status: { not: "closed" } } }),
    prisma.user.count(),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count(),
    prisma.task.findMany({
      where: { assigneeId: session.user.id, status: { not: "DONE" } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const budget = projects.reduce((sum, p) => sum + p.overallBudget, 0);
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const nextAction = myTasks[0] ?? null;

  const processNodes: ProcessMapNode[] = tasks.map((task) => {
    const milestoneBudget = task.milestone?.subBudget ?? task.project.overallBudget / Math.max(task.project.milestones.length, 1);
    const consumedRatio =
      task.status === "DONE" ? 1 : task.status === "IN_REVIEW" ? 0.75 : task.status === "IN_PROGRESS" ? 0.45 : task.status === "BLOCKED" ? 0.35 : 0.1;
    const unmetDeps = task.dependencies
      .filter((d) => d.dependsOn.status !== "DONE")
      .map((d) => `Waiting on: ${d.dependsOn.title}`);
    const riskBlockers =
      task.status === "BLOCKED"
        ? task.project.risks.slice(0, 2).map((r) => `Risk: ${r.title}`)
        : [];

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      owner: task.assignee?.name ?? "Unassigned",
      team: teamFor(task.assignee?.name, task.assignee?.username),
      deadline: task.dueDate ? task.dueDate.toISOString() : null,
      blockers: [...unmetDeps, ...riskBlockers],
      budgetConsumed: Math.round(milestoneBudget * consumedRatio),
      budgetAllocated: Math.round(milestoneBudget),
      downstreamImpact: task.dependents.map((d) => d.task.title),
      linkedDocuments: [
        `${task.project.name} / briefs / ${slugify(task.title)}.md`,
        task.milestone ? `${task.project.name} / milestones / ${slugify(task.milestone.name)}.pdf` : `${task.project.name} / plans / delivery-plan.md`,
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
    };
  });

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Process Map first — see where every part of the work sits, who owns it, and what is blocking ship."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Active projects</div>
          <div className="mt-2 text-3xl font-semibold text-white">{activeProjects}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Portfolio budget</div>
          <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(budget)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Open risks</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white">
            <AlertTriangle className="h-6 w-6 text-amber-300" /> {openRisks}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Process nodes</div>
          <div className="mt-2 text-3xl font-semibold text-white">{processNodes.length}</div>
          <p className="mt-1 text-xs text-slate-500">{usersCount} accounts in roster</p>
        </Card>
      </div>

      <div className="mb-6">
        <ProcessMap nodes={processNodes} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Supporting task signals</h2>
            <Badge className="bg-cyan-500/15 text-cyan-200">{progress}% complete</Badge>
          </div>
          <p className="mb-3 text-sm text-slate-400">
            Tasks remain available as supporting detail. The Process Map above is the primary navigation surface.
          </p>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
              <Flame className="h-4 w-4" /> Your next action
            </div>
            {nextAction ? (
              <div className="mt-2">
                <div className="text-white">{nextAction.title}</div>
                <div className="mt-1 text-sm text-slate-400">
                  in {nextAction.project.name} · {taskStatusLabel[nextAction.status]}
                </div>
                <Link
                  href={`/projects/${nextAction.projectId}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
                >
                  Open project workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                No assigned open tasks. Use the Process Map or{" "}
                <Link href="/projects" className="text-cyan-300 hover:underline">
                  Projects
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-medium text-white">Projects (support)</h2>
          <div className="space-y-3">
            {projects.slice(0, 4).map((p) => {
              const done = p.tasks.filter((t) => t.status === "DONE").length;
              const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-white">{p.name}</div>
                    <Badge className="bg-slate-800 text-slate-300">{pct}%</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {p.tasks.length} tasks · {p.risks.length} risks
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/projects" className="mt-4 inline-flex text-sm text-cyan-300 hover:underline">
            View all projects →
          </Link>
        </Card>
      </div>
    </div>
  );
}
