import Link from "next/link";
import { updateTaskStatusAction } from "@/app/actions";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";

type AssignmentTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
};

export function AssignmentsPanel({
  tasks,
  canEdit,
}: {
  tasks: AssignmentTask[];
  canEdit: boolean;
}) {
  const open = tasks.filter((t) => t.status !== "DONE");
  const blocked = tasks.filter((t) => t.status === "BLOCKED");
  const done = tasks.filter((t) => t.status === "DONE");

  const statusRank: Record<string, number> = {
    BLOCKED: 0,
    IN_PROGRESS: 1,
    IN_REVIEW: 2,
    TODO: 3,
    DONE: 4,
  };
  const sorted = [...tasks].sort((a, b) => {
    const sr = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (sr !== 0) return sr;
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Assignments</h2>
        <p className="mt-1 text-sm text-slate-400">
          Everything assigned to you — sorted so the next ship action is obvious.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase text-slate-500">Open assignments</div>
          <div className="mt-2 text-3xl font-semibold text-white">{open.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Blocked</div>
          <div className="mt-2 text-3xl font-semibold text-rose-300">{blocked.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Done</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">{done.length}</div>
        </Card>
      </div>

      <Card>
        <div className="space-y-3">
          {sorted.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{task.title}</div>
                  <Link
                    href={`/projects/${task.projectId}`}
                    className="text-sm text-cyan-300 hover:underline"
                  >
                    {task.projectName}
                  </Link>
                </div>
                <Badge className={taskStatusColors[task.status] ?? "bg-slate-800 text-slate-200"}>
                  {taskStatusLabel[task.status] ?? task.status}
                </Badge>
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
