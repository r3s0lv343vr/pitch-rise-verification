"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  parseDocumentCategory,
  sanitizeFileName,
  TASK_DOCUMENT_MAX_BYTES,
  validateTaskDocumentFile,
} from "@/lib/task-documents";

async function canManageTaskDocuments(taskId: string, userId: string, role: string) {
  if (can(role as never, "task:edit")) return true;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { members: { select: { userId: true } } },
  });
  if (!task) return false;
  if (task.assigneeId === userId) return true;
  return task.members.some((m) => m.userId === userId);
}

export async function uploadTaskDocumentAction(formData: FormData) {
  try {
    const session = await requireSession();
    const taskId = String(formData.get("taskId") || "");
    const note = String(formData.get("note") || "").trim().slice(0, 500);
    const category = parseDocumentCategory(String(formData.get("category") || "other"));
    const file = formData.get("file");

    if (!taskId) {
      return { ok: false as const, error: "Task not found." };
    }
    if (!(file instanceof File)) {
      return { ok: false as const, error: "Choose a file to upload." };
    }

    const validationError = validateTaskDocumentFile(file);
    if (validationError) {
      return { ok: false as const, error: validationError };
    }

    if (file.size > TASK_DOCUMENT_MAX_BYTES) {
      return { ok: false as const, error: "File exceeds the 25MB limit." };
    }

    if (!(await canManageTaskDocuments(taskId, session.user.id, session.user.role))) {
      return { ok: false as const, error: "You do not have permission to upload documents for this task." };
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { ok: false as const, error: "Task not found." };
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        ok: false as const,
        error: "Document storage is not configured (missing BLOB_READ_WRITE_TOKEN).",
      };
    }

    const safeName = sanitizeFileName(file.name);
    const pathname = `tasks/${task.projectId}/${taskId}/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      multipart: file.size > 4 * 1024 * 1024,
    });

    const doc = await prisma.taskDocument.create({
      data: {
        taskId,
        uploaderId: session.user.id,
        category,
        fileName: safeName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        url: blob.url,
        blobPathname: blob.pathname,
        note,
      },
    });

    // Also leave a lightweight trail in task updates for the activity stream.
    await prisma.taskUpdate.create({
      data: {
        taskId,
        authorId: session.user.id,
        body: `Uploaded ${category} document: ${safeName}${note ? ` — ${note}` : ""}`,
        kind: "UPDATE",
      },
    });

    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/my-work");
    return {
      ok: true as const,
      documentId: doc.id,
      fileName: doc.fileName,
      url: doc.url,
    };
  } catch (e) {
    console.error("uploadTaskDocumentAction failed", e);
    return { ok: false as const, error: "Could not upload document. Please try again." };
  }
}

export async function deleteTaskDocumentAction(formData: FormData) {
  try {
    const session = await requireSession();
    const documentId = String(formData.get("documentId") || "");
    if (!documentId) {
      return { ok: false as const, error: "Document not found." };
    }

    const doc = await prisma.taskDocument.findUnique({
      where: { id: documentId },
      include: { task: true },
    });
    if (!doc) {
      return { ok: false as const, error: "Document not found." };
    }

    const canDelete =
      doc.uploaderId === session.user.id ||
      (await canManageTaskDocuments(doc.taskId, session.user.id, session.user.role));
    if (!canDelete) {
      return { ok: false as const, error: "You do not have permission to delete this document." };
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(doc.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (err) {
        console.warn("blob delete failed", err);
      }
    }

    await prisma.taskDocument.delete({ where: { id: documentId } });
    revalidatePath(`/projects/${doc.task.projectId}`);
    revalidatePath("/my-work");
    return { ok: true as const };
  } catch (e) {
    console.error("deleteTaskDocumentAction failed", e);
    return { ok: false as const, error: "Could not delete document. Please try again." };
  }
}
