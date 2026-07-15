"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ChangeStatus,
  IntegrationProvider,
  IssuePriority,
  ProjectStatus,
  RiskSeverity,
  Role,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";

function parseStatus(value: string): TaskStatus {
  if (Object.values(TaskStatus).includes(value as TaskStatus)) return value as TaskStatus;
  return TaskStatus.TODO;
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !username || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) redirect("/signup?error=exists");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      username,
      passwordHash,
      role: Role.MEMBER,
    },
  });

  redirect("/login?registered=1");
}

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "project:create")) redirect("/projects?error=forbidden");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const overallBudget = Number(formData.get("overallBudget") || 0);
  if (!name) redirect("/projects?error=name");

  const project = await prisma.project.create({
    data: {
      name,
      description,
      overallBudget: Number.isFinite(overallBudget) ? overallBudget : 0,
      status: ProjectStatus.ACTIVE,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: session.user.role },
      },
      phases: {
        create: [
          { name: "Phase 1 — Discover", order: 1 },
          { name: "Phase 2 — Build", order: 2 },
          { name: "Phase 3 — Launch", order: 3 },
        ],
      },
    },
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function archiveProjectAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "project:archive")) return;
  const id = String(formData.get("projectId") || "");
  await prisma.project.update({
    where: { id },
    data: { archived: true, status: ProjectStatus.ARCHIVED },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

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
  if (!can(session.user.role, "task:edit") && session.user.role !== Role.VIEWER) {
    // viewers cannot edit
  }
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

export async function toggleIntegrationAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "integration:toggle")) return;
  const id = String(formData.get("id") || "");
  const connected = String(formData.get("connected") || "") === "true";
  await prisma.integration.update({ where: { id }, data: { connected: !connected } });
  revalidatePath("/settings/integrations");
}

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "project:create") && session.user.role !== Role.ADMIN) {
    // members can still set org name via creating project path
  }
  const orgName = String(formData.get("orgName") || "").trim() || "My Cohort Org";
  const projectName = String(formData.get("projectName") || "").trim() || "First Project";

  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: orgName,
        onboarded: true,
        integrations: {
          create: [
            { provider: IntegrationProvider.SLACK, connected: false },
            { provider: IntegrationProvider.EMAIL, connected: false },
            { provider: IntegrationProvider.CALENDAR, connected: false },
            { provider: IntegrationProvider.GITHUB, connected: false },
          ],
        },
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { name: orgName, onboarded: true },
    });
  }

  const project = await prisma.project.create({
    data: {
      name: projectName,
      description: String(formData.get("description") || "Created from onboarding"),
      status: ProjectStatus.ACTIVE,
      overallBudget: Number(formData.get("overallBudget") || 10000),
      organizationId: org.id,
      ownerId: session.user.id,
      members: { create: { userId: session.user.id, role: session.user.role } },
      phases: {
        create: [
          { name: "Phase 1", order: 1 },
          { name: "Phase 2", order: 2 },
          { name: "Phase 3 — Completion", order: 3 },
        ],
      },
      milestones: {
        create: [{ name: "Kickoff complete", order: 1, subBudget: 2500 }],
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function ensureIntegrationsAction() {
  const org = await prisma.organization.findFirst();
  if (!org) return;
  const providers = [
    IntegrationProvider.SLACK,
    IntegrationProvider.EMAIL,
    IntegrationProvider.CALENDAR,
    IntegrationProvider.GITHUB,
  ];
  for (const provider of providers) {
    await prisma.integration.upsert({
      where: { organizationId_provider: { organizationId: org.id, provider } },
      update: {},
      create: { organizationId: org.id, provider, connected: false },
    });
  }
}
