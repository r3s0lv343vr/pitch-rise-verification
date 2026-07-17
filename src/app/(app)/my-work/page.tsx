import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui/card";
import { TimeClock } from "@/components/my-work/time-clock";
import { DailyBriefBar } from "@/components/my-work/daily-brief";
import { TaskReminderBoard } from "@/components/my-work/task-reminders";
import { PersonalProcessListingBar } from "@/components/my-work/priority-process-bar";
import { AssignmentsPanel } from "@/components/my-work/assignments-panel";
import { MyWorkTabBar } from "@/components/my-work/my-work-tabs";
import {
  scoreMyWorkTasks,
  summarizeTimeEntries,
  summarizeTodayByProject,
} from "@/lib/time-tracking";

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const tab = sp.tab === "assignments" ? "assignments" : "overview";

  const [tasks, timeEntries, openRisks, memberships] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: session.user.id },
      include: {
        project: true,
        dependencies: { include: { dependsOn: { include: { assignee: true } } } },
        dependents: { include: { task: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.timeEntry.findMany({
      where: { userId: session.user.id },
      include: { project: true },
      orderBy: { startedAt: "desc" },
      take: 400,
    }),
    prisma.risk.count({
      where: {
        status: { not: "closed" },
        project: { members: { some: { userId: session.user.id } } },
      },
    }),
    prisma.projectMember.findMany({
      where: { userId: session.user.id, project: { archived: false } },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ranked = scoreMyWorkTasks(tasks);
  const summary = summarizeTimeEntries(timeEntries);
  const closedSummary = summarizeTimeEntries(timeEntries.filter((e) => e.endedAt));
  const canEdit = can(session.user.role, "task:edit");

  const projectNames: Record<string, string> = {};
  for (const m of memberships) projectNames[m.projectId] = m.project.name;
  for (const t of tasks) projectNames[t.projectId] = t.project.name;
  for (const e of timeEntries) {
    if (e.projectId && e.project?.name) projectNames[e.projectId] = e.project.name;
  }

  const today = summarizeTodayByProject(timeEntries, projectNames);
  const cumulativeByProject = Array.from(summary.byProject.entries())
    .map(([projectId, stats]) => ({
      projectId,
      name: projectNames[projectId] || "Project",
      workMinutes: stats.work,
      breakMinutes: stats.break,
    }))
    .sort((a, b) => b.workMinutes - a.workMinutes);

  const workloadHours = ranked.reduce((sum, t) => sum + (t.estimateHours ?? 2.4), 0);
  const scheduleRisks =
    ranked.filter((t) => t.bucket === "attention").length + (openRisks > 0 ? 1 : 0);

  const projects = memberships.map((m) => ({ id: m.projectId, name: m.project.name }));
  const clockTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.project.name,
  }));

  const assignmentTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId,
    projectName: t.project.name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Work"
        subtitle="Personal Overview for clocking and priorities · Assignments for your ship list."
      />

      <Suspense fallback={<div className="h-10" />}>
        <MyWorkTabBar />
      </Suspense>

      {tab === "assignments" ? (
        <div className="space-y-3">
          {assignmentTasks.length === 0 ? (
            <Card className="p-4 text-sm text-amber-200">
              No assignments found for this login. Sign out and sign back in as{" "}
              <span className="font-semibold">pm@hult-cohort.test</span> /{" "}
              <span className="font-semibold">password123</span> (sessions can go stale after a data
              refresh).
            </Card>
          ) : null}
          <AssignmentsPanel tasks={assignmentTasks} canEdit={canEdit} />
        </div>
      ) : (
        <div className="space-y-4">
          <TimeClock
            isClockedIn={!!summary.openWork}
            activeStartedAt={
              summary.openWork?.startedAt
                ? new Date(summary.openWork.startedAt).toISOString()
                : summary.openBreak?.startedAt
                  ? new Date(summary.openBreak.startedAt).toISOString()
                  : null
            }
            activeTaskId={summary.openWork?.taskId ?? ranked[0]?.id ?? null}
            activeProjectId={
              summary.openWork?.projectId ??
              summary.openBreak?.projectId ??
              ranked[0]?.projectId ??
              projects[0]?.id ??
              null
            }
            closedWorkMinutes={closedSummary.workMinutes}
            closedBreakMinutes={closedSummary.breakMinutes}
            todayWorkMinutes={today.workMinutes}
            todayByProject={today.rows}
            cumulativeByProject={cumulativeByProject}
            projects={projects}
            tasks={clockTasks}
          />

          <DailyBriefBar
            priority={ranked[0] ?? null}
            workloadHours={workloadHours || 0}
            budgetOk
            scheduleRisks={scheduleRisks}
          />

          <TaskReminderBoard tasks={ranked} />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <PersonalProcessListingBar tasks={ranked} />

            <Card className="p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Impact Reading
              </div>
              <h2 className="font-display text-lg font-semibold text-white">Critical attention</h2>
              <p className="mt-1 text-xs text-slate-400">
                Items that are overdue, blocked, or unlock multiple downstream steps light up urgently.
              </p>
              <div className="mt-4 space-y-2">
                {ranked
                  .filter((t) => t.critical)
                  .slice(0, 6)
                  .map((t) => (
                    <Link
                      key={t.id}
                      href={`/projects/${t.projectId}`}
                      className="impact-critical block rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2"
                    >
                      <div className="text-sm font-medium text-white">{t.title}</div>
                      <div className="text-[11px] text-rose-100/80">
                        {t.projectName} · impact {t.impactScore}
                        {t.dependentTitles.length ? ` · unlocks ${t.dependentTitles.length}` : ""}
                      </div>
                    </Link>
                  ))}
                {ranked.filter((t) => t.critical).length === 0 ? (
                  <p className="text-sm text-slate-500">No critical-impact items on your plate.</p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
