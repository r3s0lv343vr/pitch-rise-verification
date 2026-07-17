import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { updateTaskStatusAction } from "@/app/actions";
import { can } from "@/lib/permissions";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";
import Link from "next/link";
import { TimeClock } from "@/components/my-work/time-clock";
import { DailyBriefBar } from "@/components/my-work/daily-brief";
import { TaskReminderBoard } from "@/components/my-work/task-reminders";
import { PersonalProcessListingBar } from "@/components/my-work/priority-process-bar";
import {
  scoreMyWorkTasks,
  summarizeTimeEntries,
  summarizeTodayByProject,
} from "@/lib/time-tracking";

export default async function MyWorkPage() {
  const session = await requireSession();

  const [tasks, timeEntries, openRisks, memberships] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: session.user.id },
      include: {
        project: true,
        dependencies: { include: { dependsOn: { include: { assignee: true } } } },
        dependents: { include: { task: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
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
  const budgetOk = true; // personal assignments inherit portfolio budget health unless flagged later

  const projects = memberships.map((m) => ({ id: m.projectId, name: m.project.name }));
  // Include assigned tasks (open + recent done) so clock target is never empty when work exists
  const clockTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.project.name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Work"
        subtitle="Clock time, daily brief, reminders, and a personal priority process queue."
      />

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
        budgetOk={budgetOk}
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

      <Card>
        <div className="mb-3 text-sm font-medium text-white">All assignments</div>
        <div className="space-y-3">
          {tasks.map((task) => {
            const critical = ranked.find((r) => r.id === task.id)?.critical;
            return (
              <div
                key={task.id}
                className={
                  critical
                    ? "impact-critical rounded-xl border border-rose-400/40 bg-rose-500/5 p-4"
                    : "rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">{task.title}</div>
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="text-sm text-cyan-300 hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  </div>
                  <Badge className={taskStatusColors[task.status]}>{taskStatusLabel[task.status]}</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-500">Due {formatDate(task.dueDate)}</div>
                {canEdit ? (
                  <form action={updateTaskStatusAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <Select name="status" defaultValue={task.status} className="max-w-xs">
                      {Object.keys(taskStatusLabel).map((s) => (
                        <option key={s} value={s}>
                          {taskStatusLabel[s]}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="secondary">
                      Update
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
          {tasks.length === 0 ? <p className="text-sm text-slate-500">Nothing assigned yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
