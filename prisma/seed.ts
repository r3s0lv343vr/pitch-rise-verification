import { PrismaClient, Role, ProjectStatus, TaskStatus, RiskSeverity, IssuePriority, ChangeStatus, IntegrationProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: "pm@hult-cohort.test",
      username: "priya-pm",
      name: "Priya Manager",
      passwordHash,
      role: Role.PM,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@hult-cohort.test",
      username: "marcus-dev",
      name: "Marcus Member",
      passwordHash,
      role: Role.MEMBER,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@hult-cohort.test",
      username: "vicky-view",
      name: "Vicky Viewer",
      passwordHash,
      role: Role.VIEWER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff-review@hult-cohort.test",
      username: "staff-review",
      name: "Staff Reviewer",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const randall = await prisma.user.create({
    data: {
      email: "randall@hult-cohort.test",
      username: "randall",
      name: "Randall Chen",
      passwordHash,
      role: Role.MEMBER,
    },
  });

  const alpha = await prisma.user.create({
    data: {
      email: "alpha@hult-cohort.test",
      username: "alpha",
      name: "Alpha Rivera",
      passwordHash,
      role: Role.MEMBER,
    },
  });

  // Extra accounts so the roster clearly supports a 30+ cohort
  const cohort = [];
  for (let i = 1; i <= 26; i++) {
    const u = await prisma.user.create({
      data: {
        email: `student${i}@hult-cohort.test`,
        username: `student${i}`,
        name: `Student ${i}`,
        passwordHash,
        role: i % 5 === 0 ? Role.PM : Role.MEMBER,
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
          { provider: IntegrationProvider.SLACK, connected: false },
          { provider: IntegrationProvider.EMAIL, connected: true },
          { provider: IntegrationProvider.CALENDAR, connected: false },
          { provider: IntegrationProvider.GITHUB, connected: true },
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

  const phase1 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: "Foundation",
      description: "Auth, data model, core PM workflows",
      order: 1,
      startDate: start,
      endDate: new Date(start.getTime() + 7 * 86400000),
    },
  });
  const phase2 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: "Intelligence Views",
      description: "Kanban, Gantt, maps, budgets, risks",
      order: 2,
      startDate: new Date(start.getTime() + 7 * 86400000),
      endDate: new Date(start.getTime() + 21 * 86400000),
    },
  });
  const phase3 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: "Operate & Scale",
      description: "Cohort rollout, review week, cutover",
      order: 3,
      startDate: new Date(start.getTime() + 21 * 86400000),
      endDate: end,
    },
  });

  const m1 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      phaseId: phase1.id,
      name: "Ballot-ready baseline",
      description: "Projects, tasks, status, assign, filters, auth ≥30",
      dueDate: new Date(start.getTime() + 5 * 86400000),
      status: TaskStatus.IN_PROGRESS,
      subBudget: 25000,
      order: 1,
    },
  });
  const m2 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      phaseId: phase2.id,
      name: "Complex PM surfaces",
      description: "Maps, Gantt, budgets, risk/issue/change",
      dueDate: new Date(start.getTime() + 14 * 86400000),
      status: TaskStatus.TODO,
      subBudget: 45000,
      order: 2,
    },
  });
  const m3 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      phaseId: phase3.id,
      name: "Production cutover",
      description: "HTTPS live, roster seeded, staff smoke-test passed",
      dueDate: end,
      status: TaskStatus.TODO,
      subBudget: 55000,
      order: 3,
    },
  });

  const t1 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      title: "Ship email/password auth for 30+ accounts",
      description: "Open registration + seeded staff-review account",
      status: TaskStatus.DONE,
      assigneeId: admin.id,
      creatorId: pm.id,
      startDate: start,
      dueDate: new Date(start.getTime() + 2 * 86400000),
      estimateHours: 12,
    },
  });
  const t2 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      title: "Project + task CRUD with status workflow",
      description: "todo / in progress / in review / done / blocked",
      status: TaskStatus.IN_PROGRESS,
      assigneeId: randall.id,
      creatorId: pm.id,
      startDate: start,
      dueDate: new Date(start.getTime() + 4 * 86400000),
      estimateHours: 16,
    },
  });
  const t3 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      title: "Assignment + filters by assignee/status/project",
      description: "Any cohort member by email or username",
      status: TaskStatus.TODO,
      assigneeId: alpha.id,
      creatorId: pm.id,
      dueDate: new Date(start.getTime() + 5 * 86400000),
      estimateHours: 8,
    },
  });
  const t4 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m2.id,
      title: "Kanban + Gantt + project map views",
      description: "Phases → milestones → tasks → completion",
      status: TaskStatus.IN_REVIEW,
      assigneeId: member.id,
      creatorId: pm.id,
      dueDate: new Date(start.getTime() + 12 * 86400000),
      estimateHours: 20,
    },
  });
  const t5 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m2.id,
      title: "Budget burn + milestone sub-budgets",
      description: "Overall budget with per-milestone allocations",
      status: TaskStatus.TODO,
      assigneeId: alpha.id,
      creatorId: admin.id,
      dueDate: new Date(start.getTime() + 13 * 86400000),
      estimateHours: 10,
    },
  });
  const t6 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m3.id,
      title: "Risk / issue / change request tracking",
      description: "Operator-ready workflow for cohort chaos",
      status: TaskStatus.BLOCKED,
      assigneeId: randall.id,
      creatorId: admin.id,
      dueDate: new Date(start.getTime() + 20 * 86400000),
      estimateHours: 12,
    },
  });
  const t7 = await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: m2.id,
      title: "Process Map Command Center UX",
      description: "Node-first navigation with owner, deadline, blockers, budget, risks",
      status: TaskStatus.IN_PROGRESS,
      assigneeId: pm.id,
      creatorId: admin.id,
      dueDate: new Date(start.getTime() + 10 * 86400000),
      estimateHours: 14,
    },
  });

  await prisma.taskDependency.createMany({
    data: [
      { taskId: t2.id, dependsOnId: t1.id },
      { taskId: t3.id, dependsOnId: t2.id },
      { taskId: t4.id, dependsOnId: t3.id },
      { taskId: t5.id, dependsOnId: t3.id },
      { taskId: t6.id, dependsOnId: t4.id },
      { taskId: t7.id, dependsOnId: t2.id },
    ],
  });

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

  // Second sample project
  await prisma.project.create({
    data: {
      name: "Project 2 — Comms Platform (preview)",
      description: "Placeholder project for week 3 briefing once PM stack wins.",
      status: ProjectStatus.PLANNING,
      overallBudget: 80000,
      organizationId: org.id,
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: pm.id, role: Role.PM },
        ],
      },
      tasks: {
        create: [
          {
            title: "Draft comms kickoff brief",
            description: "Ready for cutover Monday",
            status: TaskStatus.TODO,
            assigneeId: pm.id,
            creatorId: admin.id,
          },
        ],
      },
    },
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
