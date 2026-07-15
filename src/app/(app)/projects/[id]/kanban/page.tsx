import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { updateTaskStatusAction } from "@/app/actions";
import { ProjectTabs } from "@/components/project-tabs";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { taskStatusLabel } from "@/lib/utils";

const columns = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as const;

export default async function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: { include: { assignee: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!project) notFound();
  const canEdit = can(session.user.role, "task:edit");

  return (
    <div>
      <PageHeader title={`${project.name} · Kanban`} subtitle="Move work across a five-state delivery workflow." />
      <ProjectTabs projectId={project.id} current="kanban" />
      <div className="grid gap-3 overflow-x-auto md:grid-cols-5">
        {columns.map((status) => {
          const tasks = project.tasks.filter((t) => t.status === status);
          return (
            <Card key={status} className="min-w-[200px] bg-slate-950/50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">{taskStatusLabel[status]}</h3>
                <Badge className="bg-slate-800 text-slate-300">{tasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="text-sm font-medium text-white">{task.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{task.assignee?.name ?? "Unassigned"}</div>
                    {canEdit ? (
                      <form action={updateTaskStatusAction} className="mt-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <select
                          name="status"
                          defaultValue={task.status}
                          className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                        >
                          {columns.map((s) => (
                            <option key={s} value={s}>
                              {taskStatusLabel[s]}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="secondary" className="w-full">
                          Move
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
