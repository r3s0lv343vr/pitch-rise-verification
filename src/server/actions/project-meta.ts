"use server";

import { revalidatePath } from "next/cache";
import { ChangeStatus, IssuePriority, RiskSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";

export async function createMilestoneAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "project:edit")) return;
  const projectId = String(formData.get("projectId") || "");
  const name = String(formData.get("name") || "").trim();
  const subBudget = Number(formData.get("subBudget") || 0);
  const dueDateRaw = String(formData.get("dueDate") || "");
  const phaseId = String(formData.get("phaseId") || "") || null;
  if (!projectId || !name) return;

  await prisma.milestone.create({
    data: {
      projectId,
      name,
      subBudget: Number.isFinite(subBudget) ? subBudget : 0,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      phaseId,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function createRiskAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "risk:edit")) return;
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const severity = (String(formData.get("severity") || "MEDIUM") as RiskSeverity) || RiskSeverity.MEDIUM;
  if (!projectId || !title) return;
  await prisma.risk.create({
    data: {
      projectId,
      title,
      description,
      severity,
      ownerId: session.user.id,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function createIssueAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "risk:edit")) return;
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priority = (String(formData.get("priority") || "MEDIUM") as IssuePriority) || IssuePriority.MEDIUM;
  if (!projectId || !title) return;
  await prisma.issue.create({
    data: { projectId, title, description, priority, ownerId: session.user.id },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function createChangeRequestAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "risk:edit")) return;
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const impact = String(formData.get("impact") || "").trim();
  if (!projectId || !title) return;
  await prisma.changeRequest.create({
    data: {
      projectId,
      title,
      description,
      impact,
      status: ChangeStatus.REQUESTED,
      ownerId: session.user.id,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateBudgetAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "budget:edit")) return;
  const projectId = String(formData.get("projectId") || "");
  const overallBudget = Number(formData.get("overallBudget") || 0);
  await prisma.project.update({
    where: { id: projectId },
    data: { overallBudget: Number.isFinite(overallBudget) ? overallBudget : 0 },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestoneBudgetAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "budget:edit")) return;
  const milestoneId = String(formData.get("milestoneId") || "");
  const projectId = String(formData.get("projectId") || "");
  const subBudget = Number(formData.get("subBudget") || 0);
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { subBudget: Number.isFinite(subBudget) ? subBudget : 0 },
  });
  revalidatePath(`/projects/${projectId}`);
}
