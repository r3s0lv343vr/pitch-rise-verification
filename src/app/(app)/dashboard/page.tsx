import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CommandCenter } from "@/components/command-center/command-center";
import { buildLinkedTaskNodes } from "@/lib/build-linked-task-nodes";
import type { OverviewSeed } from "@/lib/overview-intel";
import { rankDowntimeHotspots, summarizeTimeEntries } from "@/lib/time-tracking";

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

  const projects = await prisma.project.findMany({
    where: { archived: false },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Process / Kanban / Gantt in Command Center are single-project views.
  // Default to the most recently updated project when none is selected.
  const linkedView = initialTab === "process" || initialTab === "kanban" || initialTab === "gantt";
  if (linkedView && !sp.project && projects[0]) {
    const params = new URLSearchParams();
    params.set("tab", initialTab);
    params.set("project", projects[0].id);
    redirect(`/dashboard?${params.toString()}`);
  }

  const selectedProjectId =
    sp.project && projects.some((p) => p.id === sp.project) ? sp.project : projects[0]?.id ?? null;

  // Overview can stay portfolio-aware; linked maps use one project only.
  const taskWhere = linkedView && selectedProjectId
    ? { projectId: selectedProjectId }
    : sp.project
      ? { projectId: sp.project }
      : { project: { archived: false } };

  const timeWhere = selectedProjectId
    ? { projectId: selectedProjectId }
    : { project: { archived: false } };

  const [tasks, milestones, risks, issues, changes, allocations, timeEntries] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
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
      take: linkedView ? 200 : 80,
    }),
    prisma.milestone.findMany({
      where: selectedProjectId
        ? { projectId: selectedProjectId }
        : { project: { archived: false } },
      include: { phase: true },
      orderBy: [{ order: "asc" }],
    }),
    prisma.risk.findMany({
      where: selectedProjectId
        ? { projectId: selectedProjectId }
        : { project: { archived: false } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.issue.findMany({
      where: selectedProjectId
        ? { projectId: selectedProjectId }
        : { project: { archived: false } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.changeRequest.findMany({
      where: selectedProjectId
        ? { projectId: selectedProjectId }
        : { project: { archived: false } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.resourceAllocation.findMany({
      where: selectedProjectId ? { projectId: selectedProjectId } : undefined,
      include: { resource: true, user: true },
    }),
    prisma.timeEntry.findMany({
      where: timeWhere,
      take: 500,
    }),
  ]);

  const budget = projects.reduce((sum, p) => sum + p.overallBudget, 0);
  const canEdit = can(session.user.role, "task:edit");
  const timeSummary = summarizeTimeEntries(timeEntries);

  const nodes = buildLinkedTaskNodes(tasks, timeEntries);

  const downtimeHotspots = rankDowntimeHotspots(
    nodes.map((n) => ({
      id: n.id,
      title: n.title,
      projectName: n.projectName,
      status: n.status,
      team: n.team,
    })),
    timeSummary.byTask
  );

  const seed: OverviewSeed = {
    portfolioBudget: budget,
    projectEnds: Object.fromEntries(
      projects.map((p) => [p.id, p.endDate ? p.endDate.toISOString() : null])
    ),
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <CommandCenter
      initialNodes={nodes}
      canEdit={canEdit}
      initialTab={initialTab}
      selectedProjectId={selectedProjectId}
      selectedProjectName={selectedProject?.name ?? null}
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
