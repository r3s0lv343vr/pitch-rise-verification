export type TaskStatusValue = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";

export type LinkedTaskNode = {
  id: string;
  title: string;
  description: string;
  status: TaskStatusValue;
  owner: string;
  ownerUsername: string;
  team: string;
  startDate: string | null;
  deadline: string | null;
  blockers: string[];
  budgetConsumed: number;
  budgetAllocated: number;
  downstreamImpact: string[];
  linkedDocuments: string[];
  linkedRisks: { id: string; title: string; severity: string }[];
  linkedMilestones: { id: string; name: string }[];
  projectId: string;
  projectName: string;
  dependsOnIds: string[];
  dependentIds: string[];
  isDecision: boolean;
  isTerminal: boolean;
  /** Attributed break/downtime minutes from clock tracking */
  wasteMinutes: number;
  workMinutes: number;
  isWasteHotspot: boolean;
};

export const STATUS_BAR: Record<TaskStatusValue, string> = {
  TODO: "bg-orange-400",
  IN_PROGRESS: "bg-yellow-400",
  IN_REVIEW: "bg-blue-400",
  DONE: "bg-emerald-400",
  BLOCKED: "bg-red-500",
};

export const STATUS_LABEL: Record<TaskStatusValue, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export const STATUS_COLUMNS: TaskStatusValue[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
];
