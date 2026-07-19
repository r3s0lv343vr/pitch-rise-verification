import { TaskStatus } from "@prisma/client";

/** Default process-flow shape created with every new project (swimlane flowchart). */
export type ProcessTemplateStep = {
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  phaseOrder: number;
  milestoneOrder: number;
  dayOffset: number;
  durationDays: number;
  estimateHours: number;
  dependsOnKeys: string[];
  /** Preferred assignee username if present in roster */
  preferredUsername?: string;
  budgetShare: number;
};

export const DEFAULT_PROCESS_TEMPLATE: ProcessTemplateStep[] = [
  {
    key: "brainstorm",
    title: "Brainstorm project concept",
    description: "Generate concepts and success criteria with the delivery team.",
    status: TaskStatus.DONE,
    phaseOrder: 1,
    milestoneOrder: 1,
    dayOffset: 0,
    durationDays: 2,
    estimateHours: 8,
    dependsOnKeys: [],
    preferredUsername: "alpha",
    budgetShare: 0.08,
  },
  {
    key: "stakeholder-discuss",
    title: "Discuss concept with stakeholders",
    description: "Align on scope, constraints, and approval path.",
    status: TaskStatus.IN_PROGRESS,
    phaseOrder: 1,
    milestoneOrder: 1,
    dayOffset: 2,
    durationDays: 2,
    estimateHours: 6,
    dependsOnKeys: ["brainstorm"],
    preferredUsername: "priya-pm",
    budgetShare: 0.1,
  },
  {
    key: "concept-decision",
    title: "Decision: stakeholders approve concept?",
    description: "Gate — Yes continues; No loops back to brainstorm.",
    status: TaskStatus.IN_REVIEW,
    phaseOrder: 1,
    milestoneOrder: 1,
    dayOffset: 4,
    durationDays: 1,
    estimateHours: 2,
    dependsOnKeys: ["stakeholder-discuss"],
    preferredUsername: "admin",
    budgetShare: 0.05,
  },
  {
    key: "delegate",
    title: "Delegate tasks across teams",
    description: "Assign owners in Team A / Team Alpha lanes.",
    status: TaskStatus.TODO,
    phaseOrder: 2,
    milestoneOrder: 2,
    dayOffset: 5,
    durationDays: 2,
    estimateHours: 5,
    dependsOnKeys: ["concept-decision"],
    preferredUsername: "randall",
    budgetShare: 0.12,
  },
  {
    key: "initial-eval",
    title: "Conduct initial evaluation",
    description: "Check quality, risks, and schedule fit.",
    status: TaskStatus.TODO,
    phaseOrder: 2,
    milestoneOrder: 2,
    dayOffset: 7,
    durationDays: 3,
    estimateHours: 10,
    dependsOnKeys: ["delegate"],
    preferredUsername: "marcus-dev",
    budgetShare: 0.15,
  },
  {
    key: "issues-major",
    title: "Decision: are issues major?",
    description: "Gate — major issues return to stakeholder discussion.",
    status: TaskStatus.TODO,
    phaseOrder: 2,
    milestoneOrder: 2,
    dayOffset: 10,
    durationDays: 1,
    estimateHours: 3,
    dependsOnKeys: ["initial-eval"],
    preferredUsername: "priya-pm",
    budgetShare: 0.05,
  },
  {
    key: "revise",
    title: "Revise documents & deliverables",
    description: "Incorporate feedback and unblock downstream work.",
    status: TaskStatus.BLOCKED,
    phaseOrder: 2,
    milestoneOrder: 2,
    dayOffset: 11,
    durationDays: 3,
    estimateHours: 12,
    dependsOnKeys: ["issues-major"],
    preferredUsername: "randall",
    budgetShare: 0.15,
  },
  {
    key: "final-eval",
    title: "Conduct final evaluation",
    description: "Validate output against acceptance criteria.",
    status: TaskStatus.TODO,
    phaseOrder: 3,
    milestoneOrder: 3,
    dayOffset: 14,
    durationDays: 2,
    estimateHours: 8,
    dependsOnKeys: ["revise", "issues-major"],
    preferredUsername: "alpha",
    budgetShare: 0.12,
  },
  {
    key: "stakeholder-final",
    title: "Return output for final approval",
    description: "Package and present final project output.",
    status: TaskStatus.TODO,
    phaseOrder: 3,
    milestoneOrder: 3,
    dayOffset: 16,
    durationDays: 2,
    estimateHours: 6,
    dependsOnKeys: ["final-eval"],
    preferredUsername: "priya-pm",
    budgetShare: 0.1,
  },
  {
    key: "complete",
    title: "Project complete",
    description: "Close process map path — archive lessons and handoff.",
    status: TaskStatus.TODO,
    phaseOrder: 3,
    milestoneOrder: 3,
    dayOffset: 18,
    durationDays: 1,
    estimateHours: 2,
    dependsOnKeys: ["stakeholder-final"],
    preferredUsername: "admin",
    budgetShare: 0.08,
  },
];

export const PROCESS_PHASES = [
  { order: 1, name: "Discover & Align" },
  { order: 2, name: "Build & Evaluate" },
  { order: 3, name: "Approve & Complete" },
];

export const PROCESS_MILESTONES = [
  { order: 1, name: "Concept approved", budgetShare: 0.25 },
  { order: 2, name: "Evaluation complete", budgetShare: 0.4 },
  { order: 3, name: "Final delivery", budgetShare: 0.35 },
];
