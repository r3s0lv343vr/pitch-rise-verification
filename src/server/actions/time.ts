"use server";

import { revalidatePath } from "next/cache";
import { TimeEntryKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function clockInAction(input?: {
  taskId?: string | null;
  projectId?: string | null;
}) {
  try {
    const session = await requireSession();
    const taskId = input?.taskId?.trim() || null;
    let projectId = input?.projectId?.trim() || null;

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return { ok: false as const, error: "Task not found." };
      projectId = task.projectId;
    }

    if (!projectId) {
      const membership = await prisma.projectMember.findFirst({
        where: { userId: session.user.id, project: { archived: false } },
        orderBy: { createdAt: "desc" },
      });
      projectId = membership?.projectId ?? null;
    }

    if (!projectId) {
      return { ok: false as const, error: "Join or create a project before clocking in." };
    }

    const open = await prisma.timeEntry.findMany({
      where: { userId: session.user.id, endedAt: null },
    });

    const now = new Date();
    for (const entry of open) {
      if (entry.kind === TimeEntryKind.WORK) {
        return { ok: false as const, error: "Already clocked in." };
      }
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { endedAt: now },
      });
    }

    await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        kind: TimeEntryKind.WORK,
        taskId,
        projectId,
        startedAt: now,
        note: "Clock in",
      },
    });

    revalidatePath("/my-work");
    revalidatePath("/dashboard");
    return { ok: true as const, status: "IN" as const, startedAt: now.toISOString() };
  } catch (e) {
    console.error("clockInAction failed", e);
    return { ok: false as const, error: "Could not clock in. Please try again." };
  }
}

export async function clockOutAction() {
  try {
    const session = await requireSession();
    const now = new Date();

    const openWork = await prisma.timeEntry.findFirst({
      where: { userId: session.user.id, kind: TimeEntryKind.WORK, endedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (!openWork) {
      return { ok: false as const, error: "You are not clocked in." };
    }

    await prisma.timeEntry.update({
      where: { id: openWork.id },
      data: { endedAt: now },
    });

    // Start break/downtime attributed to the same task/project until next clock in
    await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        kind: TimeEntryKind.BREAK,
        taskId: openWork.taskId,
        projectId: openWork.projectId,
        startedAt: now,
        note: "Clock out · downtime",
      },
    });

    revalidatePath("/my-work");
    revalidatePath("/dashboard");
    return { ok: true as const, status: "OUT" as const, endedAt: now.toISOString() };
  } catch (e) {
    console.error("clockOutAction failed", e);
    return { ok: false as const, error: "Could not clock out. Please try again." };
  }
}
