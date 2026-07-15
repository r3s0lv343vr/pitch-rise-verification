import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { formatCurrency, taskStatusLabel } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Flame } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();

  const [projects, myTasks, openRisks, usersCount, doneTasks, totalTasks] = await Promise.all([
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
      where: {
        assigneeId: session.user.id,
        status: { not: "DONE" },
      },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.risk.count({ where: { status: { not: "closed" } } }),
    prisma.user.count(),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count(),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const budget = projects.reduce((sum, p) => sum + p.overallBudget, 0);
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const nextAction =
    myTasks[0] ??
    null;

  return (
    <div>
      <PageHeader
        title="Command dashboard"
        subtitle="See where the cohort stands, what is blocked, and the next concrete action to ship."
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
          <div className="text-xs uppercase tracking-wide text-slate-500">Accounts ready</div>
          <div className="mt-2 text-3xl font-semibold text-white">{usersCount}</div>
          <p className="mt-1 text-xs text-slate-500">Supports ≥30 cohort seats</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Motivation pulse</h2>
            <Badge className="bg-cyan-500/15 text-cyan-200">{progress}% complete</Badge>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
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
                  Open project <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                No assigned open tasks. Pick up work from{" "}
                <Link href="/projects" className="text-cyan-300 hover:underline">
                  Projects
                </Link>{" "}
                or create one.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-medium text-white">Shipping signals</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2 text-slate-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              {doneTasks} tasks done across the portfolio
            </li>
            <li className="flex gap-2 text-slate-300">
              <CircleDashed className="mt-0.5 h-4 w-4 text-sky-300" />
              {totalTasks - doneTasks} still in motion
            </li>
            <li className="flex gap-2 text-slate-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
              Treat critical risks as sprint blockers
            </li>
          </ul>
          <Link href="/my-work" className="mt-4 inline-flex text-sm text-cyan-300 hover:underline">
            Go to My Work →
          </Link>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Projects</h2>
          <Link href="/projects" className="text-sm text-cyan-300 hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {projects.map((p) => {
            const done = p.tasks.filter((t) => t.status === "DONE").length;
            const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-cyan-500/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.tasks.length} tasks · {p.milestones.length} milestones · {p.risks.length} open risks
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-800 text-slate-300">{p.status}</Badge>
                  <div className="w-28">
                    <div className="mb-1 text-right text-[11px] text-slate-500">{pct}%</div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
