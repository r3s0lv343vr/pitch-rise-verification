import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ProjectTabs } from "@/components/project-tabs";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";

function dayOffset(base: Date, value?: Date | null) {
  if (!value) return 0;
  return Math.max(0, Math.round((value.getTime() - base.getTime()) / 86400000));
}

export default async function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: { assignee: true, dependencies: { include: { dependsOn: true } } },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!project) notFound();

  const starts = project.tasks.map((t) => t.startDate || t.createdAt);
  const ends = project.tasks.map((t) => t.dueDate || t.updatedAt);
  const min = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : new Date();
  const max = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : new Date(min.getTime() + 14 * 86400000);
  const span = Math.max(14, dayOffset(min, max) + 3);

  return (
    <div>
      <PageHeader
        title={`${project.name} · Gantt`}
        subtitle="Schedule bars with dependency hints — built for complex delivery plans."
      />
      <ProjectTabs projectId={project.id} current="gantt" />
      <Card className="overflow-x-auto">
        <div className="mb-3 text-xs text-slate-500">
          Window: {formatDate(min)} → {formatDate(max)} ({span} days)
        </div>
        <div className="space-y-3 min-w-[720px]">
          {project.tasks.map((task) => {
            const start = dayOffset(min, task.startDate || task.createdAt);
            const end = Math.max(start + 1, dayOffset(min, task.dueDate || task.updatedAt) + 1);
            const width = Math.max(4, ((end - start) / span) * 100);
            const left = (start / span) * 100;
            return (
              <div key={task.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-100">{task.title}</span>
                  <Badge className={taskStatusColors[task.status]}>{taskStatusLabel[task.status]}</Badge>
                  <span className="text-xs text-slate-500">{task.assignee?.name ?? "Unassigned"}</span>
                </div>
                <div className="relative h-8 rounded-lg bg-slate-950/70">
                  <div
                    className="absolute top-1 h-6 rounded-md bg-gradient-to-r from-cyan-500 to-sky-400"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${formatDate(task.startDate)} → ${formatDate(task.dueDate)}`}
                  />
                </div>
                {task.dependencies.length ? (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Depends on: {task.dependencies.map((d) => d.dependsOn.title).join(", ")}
                  </div>
                ) : null}
              </div>
            );
          })}
          {project.tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks to chart yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
