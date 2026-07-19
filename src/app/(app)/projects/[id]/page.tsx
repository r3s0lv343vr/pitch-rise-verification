import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  assignTaskAction,
  archiveProjectAction,
  createMilestoneAction,
  createTaskAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { ProjectTabs } from "@/components/project-tabs";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatCurrency, formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; assignee?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      members: { include: { user: true } },
      phases: { orderBy: { order: "asc" } },
      milestones: { orderBy: { order: "asc" } },
      tasks: {
        include: { assignee: true, dependencies: true },
        orderBy: { createdAt: "desc" },
        where: {
          ...(sp.status ? { status: sp.status as never } : {}),
          ...(sp.assignee
            ? {
                assignee: {
                  OR: [
                    { email: { contains: sp.assignee, mode: "insensitive" } },
                    { username: { contains: sp.assignee, mode: "insensitive" } },
                    { name: { contains: sp.assignee, mode: "insensitive" } },
                  ],
                },
              }
            : {}),
        },
      },
    },
  });
  if (!project) notFound();

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, username: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  const canEdit = can(session.user.role, "task:create");
  const canArchive = can(session.user.role, "project:archive");

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={project.description || "No description yet."}
        actions={
          canArchive && !project.archived ? (
            <form action={archiveProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <Button type="submit" variant="danger" size="sm">
                Archive
              </Button>
            </form>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-400">
        <Badge className="bg-slate-800 text-slate-200">{project.status}</Badge>
        <span>Budget {formatCurrency(project.overallBudget)}</span>
        <span>Owner {project.owner.name}</span>
        <span>{project.members.length} members</span>
      </div>

      <ProjectTabs projectId={project.id} current="" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-medium text-white">Tasks</h2>
            <form className="flex flex-wrap gap-2">
              <Input name="status" placeholder="Filter status e.g. TODO" defaultValue={sp.status} className="w-40" />
              <Input name="assignee" placeholder="Filter assignee" defaultValue={sp.assignee} className="w-40" />
              <Button type="submit" variant="secondary" size="sm">
                Apply
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            {project.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">{task.title}</div>
                    <p className="mt-1 text-sm text-slate-400">{task.description || "—"}</p>
                  </div>
                  <Badge className={taskStatusColors[task.status]}>{taskStatusLabel[task.status]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Assignee: {task.assignee?.name ?? "Unassigned"}</span>
                  <span>Due: {formatDate(task.dueDate)}</span>
                  <span>Deps: {task.dependencies.length}</span>
                </div>
                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={updateTaskStatusAction} className="flex gap-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <Select name="status" defaultValue={task.status} className="w-40">
                        {Object.keys(taskStatusLabel).map((s) => (
                          <option key={s} value={s}>
                            {taskStatusLabel[s]}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="secondary">
                        Update status
                      </Button>
                    </form>
                    <form action={assignTaskAction} className="flex gap-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <Input name="assignee" placeholder="email or username" className="w-48" />
                      <Button type="submit" size="sm" variant="secondary">
                        Assign
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
            {project.tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks match these filters.</p> : null}
          </div>
        </Card>

        <div className="space-y-4">
          {canEdit ? (
            <Card>
              <h3 className="text-base font-medium text-white">Create task</h3>
              <form action={createTaskAction} className="mt-3 space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue="TODO">
                    {Object.keys(taskStatusLabel).map((s) => (
                      <option key={s} value={s}>
                        {taskStatusLabel[s]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignee">Assignee (email or username)</Label>
                  <Input id="assignee" name="assignee" list="cohort-users" placeholder="student1 or email" />
                  <datalist id="cohort-users">
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.username}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="milestoneId">Milestone</Label>
                  <Select id="milestoneId" name="milestoneId" defaultValue="">
                    <option value="">None</option>
                    {project.milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dependsOnId">Depends on task</Label>
                  <Select id="dependsOnId" name="dependsOnId" defaultValue="">
                    <option value="">None</option>
                    {project.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
                <Button type="submit" className="w-full">
                  Add task
                </Button>
              </form>
            </Card>
          ) : null}

          <Card>
            <h3 className="text-base font-medium text-white">Milestones</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {project.milestones.map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-800 px-3 py-2">
                  <div className="text-slate-200">{m.name}</div>
                  <div className="text-xs text-slate-500">
                    {formatCurrency(m.subBudget)} · due {formatDate(m.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
            {can(session.user.role, "project:edit") ? (
              <form action={createMilestoneAction} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                <input type="hidden" name="projectId" value={project.id} />
                <Input name="name" placeholder="Milestone name" required />
                <Input name="subBudget" type="number" placeholder="Sub-budget" defaultValue={0} />
                <Select name="phaseId" defaultValue="">
                  <option value="">No phase</option>
                  {project.phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input name="dueDate" type="date" />
                <Button type="submit" variant="secondary" className="w-full">
                  Add milestone
                </Button>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
