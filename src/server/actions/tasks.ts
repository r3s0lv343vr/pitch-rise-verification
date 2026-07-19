"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role, TaskUpdateKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { parseStatus } from "@/server/actions/task-status";

async function ensureProjectMember(projectId: string, userId: string, role: Role) {
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId, role },
  });
}

function collectMemberIds(formData: FormData, leaderId: string | null) {
  const fromMulti = formData
    .getAll("memberIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const unique = Array.from(new Set(fromMulti));
  return unique.filter((id) => id !== leaderId);
}

export async function createTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:create")) redirect(`/projects/${formData.get("projectId")}?error=forbidden`);

  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status = parseStatus(String(formData.get("status") || "TODO"));
  const leaderId = String(formData.get("leaderId") || "").trim() || null;
  const milestoneId = String(formData.get("milestoneId") || "") || null;
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const dependsOnId = String(formData.get("dependsOnId") || "") || null;
  const memberIds = collectMemberIds(formData, leaderId);

  if (!projectId || !title) redirect(`/projects/${projectId}?error=task`);

  if (leaderId) {
    const leader = await prisma.user.findUnique({ where: { id: leaderId } });
    if (leader) {
      await ensureProjectMember(projectId, leader.id, leader.role);
    }
  }

  for (const memberId of memberIds) {
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (member) {
      await ensureProjectMember(projectId, member.id, member.role);
    }
  }

  const dueDate = dueDateRaw ? new Date(`${dueDateRaw}T12:00:00.000Z`) : null;

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      status,
      assigneeId: leaderId,
      milestoneId,
      creatorId: session.user.id,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      members: memberIds.length
        ? {
            create: memberIds.map((userId) => ({ userId })),
          }
        : undefined,
    },
  });

  if (dependsOnId) {
    await prisma.taskDependency.create({
      data: { taskId: task.id, dependsOnId },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:edit")) return;

  const taskId = String(formData.get("taskId") || "");
  const status = parseStatus(String(formData.get("status") || "TODO"));
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
}

/** Client-friendly status update used by linked Command Center views */
export async function setTaskStatus(taskId: string, status: string) {
  const session = await requireSession();
  if (!can(session.user.role, "task:edit")) {
    return { ok: false as const, error: "forbidden" };
  }
  const parsed = parseStatus(status);
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: parsed },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
  return { ok: true as const, status: parsed, projectId: task.projectId };
}

/** Set/replace the task leader (stored as assigneeId). */
export async function assignTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:assign") && !can(session.user.role, "task:edit")) return;

  const taskId = String(formData.get("taskId") || "");
  const leaderId = String(formData.get("leaderId") || formData.get("assignee") || "").trim() || null;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  let assigneeId: string | null = null;
  if (leaderId) {
    const user = await prisma.user.findUnique({ where: { id: leaderId } });
    if (user) {
      assigneeId = user.id;
      await ensureProjectMember(task.projectId, user.id, user.role);
      // Leader should not also sit in the supporting member list
      await prisma.taskMember.deleteMany({ where: { taskId, userId: user.id } });
    }
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      assigneeId,
      // Changing leader clears prior sign-off
      leaderSignedOffAt: assigneeId !== task.assigneeId ? null : task.leaderSignedOffAt,
    },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  redirect(`/projects/${task.projectId}?staffing=saved`);
}

/** Replace the supporting team roster for a task (excludes leader). */
export async function updateTaskMembersAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:assign") && !can(session.user.role, "task:edit")) return;

  const taskId = String(formData.get("taskId") || "");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const memberIds = collectMemberIds(formData, task.assigneeId);

  for (const memberId of memberIds) {
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (member) {
      await ensureProjectMember(task.projectId, member.id, member.role);
    }
  }

  await prisma.taskMember.deleteMany({ where: { taskId } });
  if (memberIds.length) {
    await prisma.taskMember.createMany({
      data: memberIds.map((userId) => ({ taskId, userId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  redirect(`/projects/${task.projectId}?staffing=saved`);
}

/** One-shot save for leader + members on an existing task. */
export async function updateTaskStaffingAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:assign") && !can(session.user.role, "task:edit")) return;

  const taskId = String(formData.get("taskId") || "");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const leaderId = String(formData.get("leaderId") || "").trim() || null;
  const memberIds = collectMemberIds(formData, leaderId);

  let assigneeId: string | null = null;
  if (leaderId) {
    const leader = await prisma.user.findUnique({ where: { id: leaderId } });
    if (leader) {
      assigneeId = leader.id;
      await ensureProjectMember(task.projectId, leader.id, leader.role);
    }
  }

  for (const memberId of memberIds) {
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (member) {
      await ensureProjectMember(task.projectId, member.id, member.role);
    }
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      assigneeId,
      leaderSignedOffAt: assigneeId !== task.assigneeId ? null : task.leaderSignedOffAt,
    },
  });
  await prisma.taskMember.deleteMany({ where: { taskId } });
  if (memberIds.length) {
    await prisma.taskMember.createMany({
      data: memberIds.map((userId) => ({ taskId, userId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  redirect(`/projects/${task.projectId}?staffing=saved`);
}

/** Task leader (or admin/PM with edit) posts a progress update. */
export async function postTaskUpdateAction(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!taskId || !body) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const isLeader = task.assigneeId === session.user.id;
  const canEdit = can(session.user.role, "task:edit");
  if (!isLeader && !canEdit) return;

  await prisma.taskUpdate.create({
    data: {
      taskId,
      authorId: session.user.id,
      body,
      kind: TaskUpdateKind.UPDATE,
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
}

/** Task leader signs off the task (records sign-off update + timestamp). */
export async function signOffTaskAction(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") || "");
  const note = String(formData.get("body") || "").trim() || "Leader sign-off";
  if (!taskId) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const isLeader = task.assigneeId === session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "PM";
  if (!isLeader && !isAdmin) return;

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        leaderSignedOffAt: new Date(),
        status: task.status === "DONE" ? task.status : "IN_REVIEW",
      },
    }),
    prisma.taskUpdate.create({
      data: {
        taskId,
        authorId: session.user.id,
        body: note,
        kind: TaskUpdateKind.SIGN_OFF,
      },
    }),
  ]);

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
}
