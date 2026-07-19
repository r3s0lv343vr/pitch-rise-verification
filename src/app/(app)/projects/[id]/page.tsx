import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  archiveProjectAction,
  createMilestoneAction,
  createTaskAction,
  postTaskUpdateAction,
  signOffTaskAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { ProjectTabs } from "@/components/project-tabs";
import { DueDateField } from "@/components/due-date-field";
import { TaskStaffingForm } from "@/components/task-staffing-form";
import { TeamMemberPicker } from "@/components/team-member-picker";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatUserOption } from "@/lib/skills";
import { formatCurrency, formatDate, taskStatusColors, taskStatusLabel } from "@/lib/utils";

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; assignee?: string; staffing?: string; task?: string }>;
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
        include: {
          assignee: true,
          members: { include: { user: true }, orderBy: { createdAt: "asc" } },
          updates: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 3 },
          dependencies: true,
        },
        orderBy: { createdAt: "desc" },
        where: {
          ...(sp.status ? { status: sp.status as never } : {}),
          ...(sp.assignee
            ? {
                OR: [
                  {
                    assignee: {
                      OR: [
                        { email: { contains: sp.assignee, mode: "insensitive" } },
                        { username: { contains: sp.assignee, mode: "insensitive" } },
                        { name: { contains: sp.assignee, mode: "insensitive" } },
                      ],
                    },
                  },
                  {
                    members: {
                      some: {
                        user: {
                          OR: [
                            { email: { contains: sp.assignee, mode: "insensitive" } },
                            { username: { contains: sp.assignee, mode: "insensitive" } },
                            { name: { contains: sp.assignee, mode: "insensitive" } },
                          ],
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
    },
  });
  if (!project) notFound();

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, username: true, name: true, skills: true, role: true },
    orderBy: { name: "asc" },
    take: 200,
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
            <div>
              <h2 className="text-lg font-medium text-white">Task List</h2>
              <p className="mt-1 text-xs text-slate-500">
                Saved tasks for this project. Each card is highlighted so you can see where a task starts.
              </p>
            </div>
            <form className="flex flex-wrap gap-2">
              <Input name="status" placeholder="Filter status e.g. TODO" defaultValue={sp.status} className="w-40" />
              <Input name="assignee" placeholder="Filter leader/member" defaultValue={sp.assignee} className="w-44" />
              <Button type="submit" variant="secondary" size="sm">
                Apply
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            {project.tasks.map((task, index) => {
              const isLeader = task.assigneeId === session.user.id;
              const canLeadActions = isLeader || session.user.role === "ADMIN" || session.user.role === "PM";
              return (
                <div
                  key={task.id}
                  className="rounded-2xl border-2 border-cyan-300/70 bg-gradient-to-br from-cyan-500/15 via-slate-950/80 to-slate-950 p-4 shadow-[0_0_0_1px_rgba(103,232,249,0.12)]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className="bg-cyan-400/20 text-cyan-100">Task {index + 1}</Badge>
                    <Badge className={taskStatusColors[task.status]}>{taskStatusLabel[task.status]}</Badge>
                    {task.leaderSignedOffAt ? (
                      <Badge className="bg-emerald-500/15 text-emerald-200">Leader signed off</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold text-white">{task.title}</div>
                      <p className="mt-1 text-sm text-slate-300">{task.description || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span>
                      Leader: {task.assignee?.name ?? "Unassigned"}
                      {task.assignee?.skills ? ` · ${task.assignee.skills}` : ""}
                    </span>
                    <span>
                      Team:{" "}
                      {task.members.length
                        ? task.members.map((m) => m.user.name).join(", ")
                        : "No additional members"}
                    </span>
                    <span>Due: {formatDate(task.dueDate)}</span>
                    <span>Deps: {task.dependencies.length}</span>
                  </div>

                  {task.updates.length ? (
                    <div className="mt-3 space-y-1 rounded-lg border border-cyan-400/20 bg-slate-900/60 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Recent leader updates
                      </div>
                      {task.updates.map((u) => (
                        <div key={u.id} className="text-xs text-slate-300">
                          <span className="text-cyan-300/90">
                            {u.kind === "SIGN_OFF" ? "Sign-off" : "Update"}
                          </span>{" "}
                          · {u.author.name}: {u.body}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {canEdit ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
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
                      </div>

                      <TaskStaffingForm
                        taskId={task.id}
                        projectId={project.id}
                        initialLeaderId={task.assigneeId}
                        initialMemberIds={task.members.map((m) => m.userId)}
                        users={allUsers}
                        highlightSaved={sp.staffing === "saved" && sp.task === task.id}
                      />

                      {canLeadActions ? (
                        <div className="grid gap-2 border-t border-slate-800 pt-3">
                          <form action={postTaskUpdateAction} className="space-y-2">
                            <input type="hidden" name="taskId" value={task.id} />
                            <Label htmlFor={`update-${task.id}`}>Leader update</Label>
                            <Textarea
                              id={`update-${task.id}`}
                              name="body"
                              rows={2}
                              placeholder="Progress note for the team…"
                              required
                            />
                            <Button type="submit" size="sm">
                              Post update
                            </Button>
                          </form>
                          <form action={signOffTaskAction} className="space-y-2">
                            <input type="hidden" name="taskId" value={task.id} />
                            <Input
                              name="body"
                              placeholder="Optional sign-off note"
                              defaultValue="Leader sign-off — ready for review"
                            />
                            <Button type="submit" size="sm" variant="secondary">
                              Leader sign-off
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {project.tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks in this Task List yet.</p>
            ) : null}
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
                  <Label htmlFor="leaderId">Task leader</Label>
                  <Select id="leaderId" name="leaderId" defaultValue="">
                    <option value="">Unassigned</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {formatUserOption(u)}
                      </option>
                    ))}
                  </Select>
                </div>
                <TeamMemberPicker users={allUsers} label="Team members (optional)" />
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
                <DueDateField />
                <Button type="submit" className="w-full">
                  Add task to Task List
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
                <DueDateField id="milestoneDueDate" name="dueDate" label="Due date" />
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
