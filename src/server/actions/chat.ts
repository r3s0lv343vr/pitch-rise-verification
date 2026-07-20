"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

async function assertCanChat(projectId: string) {
  const session = await requireSession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: { select: { userId: true }, take: 500 },
    },
  });
  if (!project) {
    return { ok: false as const, error: "Project not found.", session, project: null };
  }

  // Open to all authenticated roles for remote collaboration efficiency.
  // Prefer members/owner, but still allow any signed-in cohort user to participate
  // when viewing a project (VIEWER included).
  return { ok: true as const, session, project };
}

export async function listProjectMessagesAction(input: {
  projectId: string;
  q?: string;
  afterId?: string | null;
  limit?: number;
}) {
  const gate = await assertCanChat(input.projectId);
  if (!gate.ok || !gate.project) {
    return { ok: false as const, error: gate.error || "Unavailable", messages: [], projectName: null };
  }

  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200);
  const q = (input.q || "").trim();

  const messages = await prisma.projectMessage.findMany({
    where: {
      projectId: input.projectId,
      ...(q
        ? {
            OR: [
              { body: { contains: q, mode: "insensitive" } },
              { author: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, username: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return {
    ok: true as const,
    projectName: gate.project.name,
    currentUserId: gate.session.user.id,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: m.author,
    })),
  };
}

export async function sendProjectMessageAction(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!projectId) return { ok: false as const, error: "Project not found." };
  if (!body) return { ok: false as const, error: "Message cannot be empty." };
  if (body.length > 4000) return { ok: false as const, error: "Message is too long (max 4000 characters)." };

  const gate = await assertCanChat(projectId);
  if (!gate.ok || !gate.project) {
    return { ok: false as const, error: gate.error || "Unavailable" };
  }

  const message = await prisma.projectMessage.create({
    data: {
      projectId,
      authorId: gate.session.user.id,
      body,
    },
    include: {
      author: { select: { id: true, name: true, username: true, role: true } },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      author: message.author,
    },
  };
}

export async function getProjectChatMetaAction(projectId: string) {
  const gate = await assertCanChat(projectId);
  if (!gate.ok || !gate.project) {
    return { ok: false as const, error: gate.error || "Unavailable", projectName: null, latestAt: null };
  }
  const latest = await prisma.projectMessage.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, id: true },
  });
  return {
    ok: true as const,
    projectName: gate.project.name,
    latestAt: latest?.createdAt.toISOString() ?? null,
    latestId: latest?.id ?? null,
  };
}
