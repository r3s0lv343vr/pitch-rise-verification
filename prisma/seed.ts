import { PrismaClient, Role, ProjectStatus, TaskStatus, RiskSeverity, IssuePriority, ChangeStatus, IntegrationProvider, TimeEntryKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_PROCESS_TEMPLATE,
  PROCESS_MILESTONES,
  PROCESS_PHASES,
} from "../src/lib/process-template";
import { skillsForSeedUser } from "../src/lib/skills";

const prisma = new PrismaClient();

async function main() {
  await prisma.timeEntry.deleteMany();
  await prisma.taskUpdate.deleteMany();
  await prisma.taskMember.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.resourceAllocation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@hult-cohort.test",
      username: "admin",
      name: "Alex Admin",
      passwordHash,
      role: Role.ADMIN,
      skills: skillsForSeedUser({ username: "admin", role: Role.ADMIN }),
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: "pm@hult-cohort.test",
      username: "priya-pm",
      name: "Priya Manager",
      passwordHash,
      role: Role.PM,
      skills: skillsForSeedUser({ username: "priya-pm", role: Role.PM }),
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@hult-cohort.test",
      username: "marcus-dev",
      name: "Marcus Member",
      passwordHash,
      role: Role.MEMBER,
      skills: skillsForSeedUser({ username: "marcus-dev", role: Role.MEMBER }),
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@hult-cohort.test",
      username: "vicky-view",
      name: "Vicky Viewer",
      passwordHash,
      role: Role.VIEWER,
      skills: skillsForSeedUser({ username: "vicky-view", role: Role.VIEWER }),
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff-review@hult-cohort.test",
      username: "staff-review",
      name: "Staff Reviewer",
      passwordHash,
      role: Role.ADMIN,
      skills: skillsForSeedUser({ username: "staff-review", role: Role.ADMIN }),
    },
  });

  const randall = await prisma.user.create({
    data: {
      email: "randall@hult-cohort.test",
      username: "randall",
      name: "Randall Chen",
      passwordHash,
      role: Role.MEMBER,
      skills: skillsForSeedUser({ username: "randall", role: Role.MEMBER }),
    },
  });

  const alpha = await prisma.user.create({
    data: {
      email: "alpha@hult-cohort.test",
      username: "alpha",
      name: "Alpha Rivera",
      passwordHash,
      role: Role.MEMBER,
      skills: skillsForSeedUser({ username: "alpha", role: Role.MEMBER }),
    },
  });

  // Extra accounts so the roster clearly supports a 30+ cohort
  const cohort = [];
  for (let i = 1; i <= 26; i++) {
    const role = i % 5 === 0 ? Role.PM : Role.MEMBER;
    const u = await prisma.user.create({
      data: {
        email: `student${i}@hult-cohort.test`,
        username: `student${i}`,
        name: `Student ${i}`,
        passwordHash,
        role,
        skills: skillsForSeedUser({ username: `student${i}`, role, index: i }),
      },
    });
    cohort.push(u);
  }

  const org = await prisma.organization.create({
    data: {
      name: "Hult Cohort Summer 26",
      onboarded: true,
      integrations: {
        create: [
          // All start disconnected — Connect toggles are UI stubs only (no OAuth/API).
          { provider: IntegrationProvider.SLACK, connected: false },
          { provider: IntegrationProvider.EMAIL, connected: false },
          { provider: IntegrationProvider.CALENDAR, connected: false },
          { provider: IntegrationProvider.GITHUB, connected: false },
        ],
      },
      resources: {
        create: [
          { name: "Frontend pod", type: "people", capacityHours: 120, costRate: 85 },
          { name: "Backend pod", type: "people", capacityHours: 100, costRate: 95 },
          { name: "Cloud budget", type: "budget", capacityHours: 0, costRate: 1 },
        ],
      },
    },
    include: { resources: true },
  });

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 42);

  const project = await prisma.project.create({
    data: {
      name: "Cohort Pilot Operating System",
      description:
        "The platform the cohort lives in for projects, assignments, deadlines, and shipping rituals across the six-week pilot.",
      status: ProjectStatus.ACTIVE,
      startDate: start,
      endDate: end,
      overallBudget: 125000,
      organizationId: org.id,
      ownerId: pm.id,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: pm.id, role: Role.PM },
          { userId: member.id, role: Role.MEMBER },
          { userId: viewer.id, role: Role.VIEWER },
          { userId: staff.id, role: Role.ADMIN },
          { userId: randall.id, role: Role.MEMBER },
          { userId: alpha.id, role: Role.MEMBER },
          ...cohort.slice(0, 12).map((u) => ({ userId: u.id, role: Role.MEMBER })),
        ],
      },
    },
  });

  const phases = [];
  for (const p of PROCESS_PHASES) {
    phases.push(
      await prisma.phase.create({
        data: {
          projectId: project.id,
          name: p.name,
          order: p.order,
          startDate: new Date(start.getTime() + (p.order - 1) * 7 * 86400000),
          endDate: new Date(start.getTime() + p.order * 7 * 86400000),
        },
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
          subBudget: Math.round(125000 * m.budgetShare),
          dueDate: new Date(start.getTime() + m.order * 7 * 86400000),
        },
      })
    );
  }

  const userByUsername: Record<string, { id: string }> = {
    admin,
    "priya-pm": pm,
    "marcus-dev": member,
    randall,
    alpha,
  };

  const createdByKey: Record<string, string> = {};
  for (const step of DEFAULT_PROCESS_TEMPLATE) {
    const milestone = milestones.find((m) => m.order === step.milestoneOrder) ?? milestones[0];
    const assignee = step.preferredUsername ? userByUsername[step.preferredUsername] : pm;
    // Force one overshot blocked item for Gantt red demo on revise step
    const taskStart = new Date(start.getTime() + step.dayOffset * 86400000);
    let taskDue = new Date(taskStart.getTime() + step.durationDays * 86400000);
    if (step.key === "revise") {
      taskDue = new Date(Date.now() - 2 * 86400000);
    }
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        milestoneId: milestone.id,
        title: step.title,
        description: step.description,
        status: step.status,
        assigneeId: assignee.id,
        creatorId: pm.id,
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
        await prisma.taskDependency.create({ data: { taskId, dependsOnId } });
      }
    }
  }

  await prisma.risk.createMany({
    data: [
      {
        projectId: project.id,
        title: "Deploy credentials missing at deadline",
        description: "Vercel env or DB claim not completed",
        severity: RiskSeverity.HIGH,
        status: "open",
        ownerId: admin.id,
        mitigation: "Claim Prisma DB + document env in README before freeze",
      },
      {
        projectId: project.id,
        title: "Reviewer signup friction",
        description: "Peers cannot create accounts without help",
        severity: RiskSeverity.CRITICAL,
        status: "mitigating",
        ownerId: pm.id,
        mitigation: "Open registration + demo credentials in README",
      },
    ],
  });

  await prisma.issue.createMany({
    data: [
      {
        projectId: project.id,
        title: "Kanban drag feels laggy on mobile",
        description: "Need touch-friendly status updates",
        priority: IssuePriority.MEDIUM,
        status: "open",
        ownerId: member.id,
      },
    ],
  });

  await prisma.changeRequest.create({
    data: {
      projectId: project.id,
      title: "Add review/vote module for Project 2+",
      description: "Replace Google Forms ballots with in-app voting",
      status: ChangeStatus.UNDER_REVIEW,
      impact: "High engagement lift; 2–3 days of work",
      ownerId: admin.id,
    },
  });

  if (org.resources[0]) {
    await prisma.resourceAllocation.create({
      data: {
        resourceId: org.resources[0].id,
        projectId: project.id,
        userId: member.id,
        hours: 30,
        notes: "Frontend delivery for baseline + Kanban",
      },
    });
  }

  // Sample clock / downtime history for My Work + Command Center correlation
  const seededTasks = await prisma.task.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });
  const discuss = seededTasks.find((t) => t.title.toLowerCase().includes("discuss")) ?? seededTasks[1];
  const evalTask = seededTasks.find((t) => t.title.toLowerCase().includes("evaluation")) ?? seededTasks[2];
  const now = Date.now();
  const hours = (h: number) => new Date(now - h * 3600000);

  if (discuss) {
    await prisma.timeEntry.createMany({
      data: [
        {
          userId: pm.id,
          projectId: project.id,
          taskId: discuss.id,
          kind: TimeEntryKind.WORK,
          startedAt: hours(8),
          endedAt: hours(6.2),
          note: "Stakeholder discussion block",
        },
        {
          userId: pm.id,
          projectId: project.id,
          taskId: discuss.id,
          kind: TimeEntryKind.BREAK,
          startedAt: hours(6.2),
          endedAt: hours(5.1),
          note: "Waiting on stakeholder reply",
        },
        {
          userId: pm.id,
          projectId: project.id,
          taskId: discuss.id,
          kind: TimeEntryKind.WORK,
          startedAt: hours(5.1),
          endedAt: hours(3.4),
          note: "Follow-up notes",
        },
        {
          userId: member.id,
          projectId: project.id,
          taskId: evalTask?.id ?? discuss.id,
          kind: TimeEntryKind.WORK,
          startedAt: hours(10),
          endedAt: hours(7.5),
          note: "Evaluation prep",
        },
        {
          userId: member.id,
          projectId: project.id,
          taskId: evalTask?.id ?? discuss.id,
          kind: TimeEntryKind.BREAK,
          startedAt: hours(7.5),
          endedAt: hours(4.8),
          note: "Blocked on upstream decision",
        },
        {
          userId: randall.id,
          projectId: project.id,
          taskId: seededTasks.find((t) => t.title.toLowerCase().includes("delegate"))?.id ?? discuss.id,
          kind: TimeEntryKind.BREAK,
          startedAt: hours(12),
          endedAt: hours(8),
          note: "Idle while waiting on lane handoff",
        },
      ],
    });
  }

  // Second sample project with richer PM assignments
  const project2 = await prisma.project.create({
    data: {
      name: "Project 2 — Comms Platform (preview)",
      description: "Placeholder project for week 3 briefing once PM stack wins.",
      status: ProjectStatus.PLANNING,
      startDate: start,
      endDate: end,
      overallBudget: 80000,
      organizationId: org.id,
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: pm.id, role: Role.PM },
          { userId: member.id, role: Role.MEMBER },
        ],
      },
    },
  });

  const today0 = new Date();
  today0.setHours(12, 0, 0, 0);
  const yesterday = new Date(today0);
  yesterday.setDate(yesterday.getDate() - 1);
  const inTwoDays = new Date(today0);
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  const overdueDay = new Date(today0);
  overdueDay.setDate(overdueDay.getDate() - 3);

  await prisma.task.createMany({
    data: [
      {
        projectId: project2.id,
        title: "Draft comms kickoff brief",
        description: "Ready for cutover Monday",
        status: TaskStatus.TODO,
        assigneeId: pm.id,
        creatorId: admin.id,
        dueDate: inTwoDays,
        estimateHours: 3,
      },
      {
        projectId: project2.id,
        title: "Confirm channel owners with Alex",
        description: "Waiting on Platform Ops confirmation",
        status: TaskStatus.IN_REVIEW,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: today0,
        estimateHours: 1.5,
      },
      {
        projectId: project2.id,
        title: "Publish stakeholder FAQ draft",
        description: "Blocked on legal review language",
        status: TaskStatus.BLOCKED,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: overdueDay,
        estimateHours: 2,
      },
      {
        projectId: project.id,
        title: "Weekly delivery standup notes",
        description: "Capture blockers and next actions for the cohort board",
        status: TaskStatus.DONE,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: yesterday,
        estimateHours: 1,
        startDate: yesterday,
      },
      {
        projectId: project.id,
        title: "Risk register hygiene check",
        description: "Close stale mitigations and escalate critical items",
        status: TaskStatus.TODO,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: today0,
        estimateHours: 2.5,
      },
      {
        projectId: project.id,
        title: "Prepare mid-sprint stakeholder update",
        description: "Summarize progress, risks, and asks for leadership",
        status: TaskStatus.IN_PROGRESS,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: today0,
        estimateHours: 2,
      },
      {
        projectId: project.id,
        title: "Review Team A lane handoff checklist",
        description: "Confirm ownership and exit criteria before delegation",
        status: TaskStatus.TODO,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: inTwoDays,
        estimateHours: 1.5,
      },
      {
        projectId: project.id,
        title: "Close open change-request comments",
        description: "Resolve review threads before implementation",
        status: TaskStatus.IN_REVIEW,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: inTwoDays,
        estimateHours: 2,
      },
      {
        projectId: project.id,
        title: "Archive completed discovery notes",
        description: "File approved discovery artifacts",
        status: TaskStatus.DONE,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: yesterday,
        estimateHours: 1,
      },
      {
        projectId: project2.id,
        title: "Map comms roles to delivery owners",
        description: "Align Project 2 RACI with cohort teams",
        status: TaskStatus.TODO,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: new Date(today0.getTime() + 3 * 86400000),
        estimateHours: 3,
      },
      {
        projectId: project2.id,
        title: "Draft launch checklist for Project 2",
        description: "Go-live readiness list for week 3 briefing",
        status: TaskStatus.TODO,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: new Date(today0.getTime() + 4 * 86400000),
        estimateHours: 2.5,
      },
      {
        projectId: project2.id,
        title: "Unblock FAQ legal language review",
        description: "Chase legal sign-off to clear blocked FAQ",
        status: TaskStatus.BLOCKED,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: overdueDay,
        estimateHours: 1,
      },
      {
        projectId: project2.id,
        title: "Schedule Project 2 kickoff dry-run",
        description: "Book rehearsal with admin and delivery leads",
        status: TaskStatus.IN_PROGRESS,
        assigneeId: pm.id,
        creatorId: pm.id,
        dueDate: inTwoDays,
        estimateHours: 1,
      },
    ],
  });

  // Extra today-facing work + break sessions for Personal Overview clock demo
  const faq = await prisma.task.findFirst({
    where: { projectId: project2.id, title: "Publish stakeholder FAQ draft" },
  });
  const riskHygiene = await prisma.task.findFirst({
    where: { projectId: project.id, title: "Risk register hygiene check" },
  });

  await prisma.timeEntry.createMany({
    data: [
      {
        userId: pm.id,
        projectId: project.id,
        taskId: riskHygiene?.id ?? discuss?.id,
        kind: TimeEntryKind.WORK,
        startedAt: new Date(today0.getTime() - 5 * 3600000),
        endedAt: new Date(today0.getTime() - 3.2 * 3600000),
        note: "Morning delivery block",
      },
      {
        userId: pm.id,
        projectId: project.id,
        taskId: riskHygiene?.id ?? discuss?.id,
        kind: TimeEntryKind.BREAK,
        startedAt: new Date(today0.getTime() - 3.2 * 3600000),
        endedAt: new Date(today0.getTime() - 2.7 * 3600000),
        note: "Standup + coffee",
      },
      {
        userId: pm.id,
        projectId: project2.id,
        taskId: faq?.id ?? null,
        kind: TimeEntryKind.WORK,
        startedAt: new Date(today0.getTime() - 2.5 * 3600000),
        endedAt: new Date(today0.getTime() - 1.1 * 3600000),
        note: "Comms platform planning",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log("- admin@hult-cohort.test");
  console.log("- pm@hult-cohort.test");
  console.log("- member@hult-cohort.test");
  console.log("- viewer@hult-cohort.test");
  console.log("- staff-review@hult-cohort.test");
  console.log("- randall@hult-cohort.test (Team A)");
  console.log("- alpha@hult-cohort.test (Team Alpha)");
  console.log(`Users total: ${7 + cohort.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
