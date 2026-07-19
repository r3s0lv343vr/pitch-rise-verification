"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { parseStatus } from "@/server/actions/task-status";

export async function createTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:create")) redirect(`/projects/${formData.get("projectId")}?error=forbidden`);

  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status = parseStatus(String(formData.get("status") || "TODO"));
  const assigneeRaw = String(formData.get("assignee") || "").trim();
  const milestoneId = String(formData.get("milestoneId") || "") || null;
  const dueDateRaw = String(formData.get("dueDate") || "");
  const dependsOnId = String(formData.get("dependsOnId") || "") || null;

  if (!projectId || !title) redirect(`/projects/${projectId}?error=task`);

  let assigneeId: string | null = null;
  if (assigneeRaw) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: assigneeRaw.toLowerCase() },
          { username: assigneeRaw.toLowerCase() },
        ],
      },
    });
    if (user) {
      assigneeId = user.id;
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: user.id } },
        update: {},
        create: { projectId, userId: user.id, role: user.role },
      });
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      status,
      assigneeId,
      milestoneId,
      creatorId: session.user.id,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
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

export async function assignTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "task:assign") && !can(session.user.role, "task:edit")) return;

  const taskId = String(formData.get("taskId") || "");
  const assigneeRaw = String(formData.get("assignee") || "").trim();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  let assigneeId: string | null = null;
  if (assigneeRaw) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: assigneeRaw.toLowerCase() }, { username: assigneeRaw.toLowerCase() }],
      },
    });
    if (user) {
      assigneeId = user.id;
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
        update: {},
        create: { projectId: task.projectId, userId: user.id, role: user.role },
      });
    }
  }

  await prisma.task.update({ where: { id: taskId }, data: { assigneeId } });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-work");
}
