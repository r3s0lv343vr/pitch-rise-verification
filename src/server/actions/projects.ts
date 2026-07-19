"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IntegrationProvider, ProjectStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "project:create")) redirect("/projects?error=forbidden");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const overallBudget = Number(formData.get("overallBudget") || 0);
  if (!name) redirect("/projects?error=name");

  const budget = Number.isFinite(overallBudget) ? overallBudget : 0;
  const { DEFAULT_PROCESS_TEMPLATE, PROCESS_PHASES, PROCESS_MILESTONES } = await import(
    "@/lib/process-template"
  );

  const project = await prisma.project.create({
    data: {
      name,
      description:
        description ||
        "Process-mapped project with linked Command Center views (Process Map, Kanban, Gantt).",
      overallBudget: budget,
      status: ProjectStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 21 * 86400000),
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: session.user.role },
      },
    },
  });

  const phases = [];
  for (const p of PROCESS_PHASES) {
    phases.push(
      await prisma.phase.create({
        data: { projectId: project.id, name: p.name, order: p.order },
      })
    );
  }

  const milestones = [];
  for (const m of PROCESS_MILESTONES) {
    const phase = phases.find((ph) => ph.order === m.order) ?? phases[0];
    milestones.push(
      await prisma.milestone.create({
        data: {
          projectId: project.id,
          phaseId: phase.id,
          name: m.name,
          order: m.order,
          subBudget: Math.round(budget * m.budgetShare),
          dueDate: new Date(Date.now() + m.order * 7 * 86400000),
        },
      })
    );
  }

  const usernames = Array.from(
    new Set(DEFAULT_PROCESS_TEMPLATE.map((s) => s.preferredUsername).filter(Boolean) as string[])
  );
  const preferredUsers = await prisma.user.findMany({
    where: { username: { in: usernames } },
  });
  const userByUsername = Object.fromEntries(preferredUsers.map((u) => [u.username, u]));

  const createdByKey: Record<string, string> = {};
  const start = new Date();
  for (const step of DEFAULT_PROCESS_TEMPLATE) {
    const milestone = milestones.find((m) => m.order === step.milestoneOrder) ?? milestones[0];
    const assignee = step.preferredUsername ? userByUsername[step.preferredUsername] : undefined;
    if (assignee) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: assignee.id } },
        update: {},
        create: { projectId: project.id, userId: assignee.id, role: assignee.role },
      });
    }
    const taskStart = new Date(start.getTime() + step.dayOffset * 86400000);
    const taskDue = new Date(taskStart.getTime() + step.durationDays * 86400000);
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        milestoneId: milestone.id,
        title: step.title,
        description: step.description,
        status: step.status,
        assigneeId: assignee?.id ?? session.user.id,
        creatorId: session.user.id,
        startDate: taskStart,
        dueDate: taskDue,
        estimateHours: step.estimateHours,
      },
    });
    createdByKey[step.key] = task.id;
  }

  for (const step of DEFAULT_PROCESS_TEMPLATE) {
    for (const depKey of step.dependsOnKeys) {
      const dependsOnId = createdByKey[depKey];
      const taskId = createdByKey[step.key];
      if (dependsOnId && taskId) {
        await prisma.taskDependency.create({
          data: { taskId, dependsOnId },
        });
      }
    }
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/dashboard?tab=process&project=${project.id}`);
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
