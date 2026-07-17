import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { roleLabel } from "@/lib/permissions";
import { buildReportAnalytics } from "@/lib/report-analytics";
import { Badge, Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportProgressBanner } from "@/components/reports/progress-banner";
import {
  BudgetBreakdownCharts,
  RisksChart,
  TimeChart,
} from "@/components/reports/report-charts";
import { RiskReviewDeck } from "@/components/reports/risk-review-deck";
import { WorkloadWindowPanel } from "@/components/reports/workload-window";
import { DependencyBottlenecksPanel } from "@/components/reports/dependency-bottlenecks";
import { ResourceReallocationPanel } from "@/components/reports/resource-reallocation";

/** Tab: Insights — full project report rollup */
export default async function ReportInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, username: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, username: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      phases: { orderBy: { order: "asc" }, select: { name: true, order: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          estimateHours: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
          dependencies: { select: { dependsOnId: true } },
          dependents: { select: { taskId: true } },
          milestone: {
            select: {
              name: true,
              subBudget: true,
              phase: { select: { name: true, order: true } },
            },
          },
        },
      },
      risks: {
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          mitigation: true,
        },
      },
      timeEntries: {
        select: {
          taskId: true,
          kind: true,
          startedAt: true,
          endedAt: true,
        },
      },
      milestones: { select: { subBudget: true } },
    },
  });

  if (!project || project.archived) {
    notFound();
  }

  const analytics = buildReportAnalytics({
    overallBudget: project.overallBudget,
    startDate: project.startDate,
    endDate: project.endDate,
    tasks: project.tasks,
    risks: project.risks,
    timeEntries: project.timeEntries,
    phases: project.phases,
  });

  const allocated = project.milestones.reduce((sum, m) => sum + m.subBudget, 0);
  const remainingBudget = project.overallBudget - allocated;

  const uniqueTeam = new Map<
    string,
    { name: string; email: string; username: string; role: string; isOwner: boolean }
  >();
  uniqueTeam.set(project.owner.id, {
    name: project.owner.name,
    email: project.owner.email,
    username: project.owner.username,
    role: "OWNER",
    isOwner: true,
  });
  for (const m of project.members) {
    if (!uniqueTeam.has(m.user.id)) {
      uniqueTeam.set(m.user.id, {
        name: m.user.name,
        email: m.user.email,
        username: m.user.username,
        role: m.role,
        isOwner: false,
      });
    } else {
      const existing = uniqueTeam.get(m.user.id)!;
      if (!existing.isOwner) existing.role = m.role;
    }
  }

  return (
    <div className="space-y-6">
      <ReportProgressBanner
        progressPct={analytics.progressPct}
        daysRemaining={analytics.daysRemaining}
        doneTasks={analytics.doneTasks}
        totalTasks={analytics.totalTasks}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</div>
          <p className="mt-3 text-lg font-semibold text-white">{project.owner.name}</p>
          <p className="text-sm text-slate-400">@{project.owner.username}</p>
          <p className="mt-1 text-xs text-slate-500">{project.owner.email}</p>
          <Badge className="mt-3 bg-slate-800 text-slate-200">{roleLabel(project.owner.role)}</Badge>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Team listing
            </div>
            <span className="text-xs text-slate-500">{uniqueTeam.size} people</span>
          </div>
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {[...uniqueTeam.values()].map((member) => (
              <li
                key={member.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{member.name}</p>
                  <p className="text-xs text-slate-500">
                    @{member.username} · {member.email}
                  </p>
                </div>
                <Badge className="bg-slate-800 text-slate-300">
                  {member.isOwner ? "Owner" : roleLabel(member.role as never) ?? member.role}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase text-slate-500">Overall budget</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(project.overallBudget)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(project.startDate)} → {formatDate(project.endDate)}
          </p>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Milestone allocated</div>
          <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(allocated)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Remaining</div>
          <div
            className={`mt-2 text-2xl font-semibold ${
              remainingBudget < 0 ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {formatCurrency(remainingBudget)}
          </div>
        </Card>
      </div>

      <BudgetBreakdownCharts stages={analytics.stages} />
      <TimeChart stages={analytics.stages} />
      <RisksChart stages={analytics.stages} />
      <WorkloadWindowPanel workload={analytics.workload} />
      <DependencyBottlenecksPanel bottlenecks={analytics.bottlenecks} />
      <ResourceReallocationPanel reallocation={analytics.reallocation} />
      <RiskReviewDeck risks={analytics.criticalRisks} />
    </div>
  );
}
