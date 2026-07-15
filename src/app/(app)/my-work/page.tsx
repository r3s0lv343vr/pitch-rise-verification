import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { updateTaskStatusAction } from "@/app/actions";
import { can } from "@/lib/permissions";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";

export default async function MyWorkPage() {
  const session = await requireSession();
  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: { project: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const open = tasks.filter((t) => t.status !== "DONE");
  const canEdit = can(session.user.role, "task:edit");

  return (
    <div>
      <PageHeader
        title="My Work"
        subtitle="Everything assigned to you — sorted so the next ship action is obvious."
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase text-slate-500">Open assignments</div>
          <div className="mt-2 text-3xl font-semibold text-white">{open.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Blocked</div>
          <div className="mt-2 text-3xl font-semibold text-rose-300">
            {tasks.filter((t) => t.status === "BLOCKED").length}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Done</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">
            {tasks.filter((t) => t.status === "DONE").length}
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{task.title}</div>
                  <Link href={`/projects/${task.projectId}`} className="text-sm text-cyan-300 hover:underline">
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
          ))}
          {tasks.length === 0 ? <p className="text-sm text-slate-500">Nothing assigned yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
