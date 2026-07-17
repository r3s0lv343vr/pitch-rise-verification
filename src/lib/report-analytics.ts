import type { RiskSeverity, TaskStatus } from "@prisma/client";

export type ProcessStageKey = string;

export type StageMetric = {
  stage: string;
  budget: number;
  timeMinutes: number;
  riskScore: number;
  taskCount: number;
  blockedCount: number;
};

export type CriticalRiskReview = {
  id: string;
  title: string;
  severity: string;
  status: string;
  stage: string;
  description: string;
  mitigation: string;
  solutions: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function stageForProcess(name: string, order?: number | null): string {
  const n = name.toLowerCase();
  if (/deploy|complete|final|ship|launch|approve/.test(n) || order === 3) return "Approve & Complete";
  if (/build|develop|evaluat|test|delegat|implement|construct/.test(n) || order === 2) {
    return "Build & Evaluate";
  }
  if (/discover|align|plan|concept|stakeholder|brainstorm/.test(n) || order === 1) {
    return "Discover & Align";
  }
  return order === 2 ? "Build & Evaluate" : order === 3 ? "Approve & Complete" : "Discover & Align";
}

function severityWeight(severity: RiskSeverity | string) {
  const s = String(severity).toUpperCase();
  if (s === "CRITICAL") return 40;
  if (s === "HIGH") return 28;
  if (s === "MEDIUM") return 14;
  return 6;
}

function solutionsForRisk(title: string, mitigation: string, stage: string): string[] {
  const base = mitigation.trim()
    ? [mitigation.trim()]
    : [`Document ownership and decision date for “${title}” in ${stage}.`];

  const extras: string[] = [];
  const t = title.toLowerCase();
  if (/credential|env|deploy|vercel|db|database/.test(t)) {
    extras.push("Run a pre-freeze env checklist and assign a single deploy owner.");
    extras.push("Claim/permanentize the database URL before the submission window.");
  } else if (/signup|account|auth|login|reviewer/.test(t)) {
    extras.push("Publish demo credentials and keep open registration for peer review.");
    extras.push("Add a staff-review account to the seed and README.");
  } else if (/budget|cost|spend/.test(t)) {
    extras.push("Re-baseline stage budgets and freeze non-critical scope.");
    extras.push("Move discretionary spend behind a change-request gate.");
  } else if (/schedule|deadline|delay|timeline/.test(t)) {
    extras.push("Cut optional scope and protect the critical path milestones.");
    extras.push("Increase daily standup focus on blocked process nodes only.");
  } else {
    extras.push(`Add a mitigation owner and weekly checkpoint for ${stage}.`);
    extras.push("Convert the risk into a tracked issue with an exit criterion.");
  }

  return [...base, ...extras].slice(0, 3);
}

type TaskLike = {
  id: string;
  title: string;
  status: TaskStatus;
  estimateHours: number | null;
  dueDate: Date | null;
  milestone: {
    name: string;
    subBudget: number;
    phase: { name: string; order: number } | null;
  } | null;
};

type RiskLike = {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  status: string;
  mitigation: string;
};

type TimeLike = {
  taskId: string | null;
  kind: "WORK" | "BREAK";
  startedAt: Date;
  endedAt: Date | null;
};

function entryMinutes(startedAt: Date, endedAt: Date | null, now = new Date()) {
  const end = endedAt ?? now;
  return Math.max(0, (end.getTime() - startedAt.getTime()) / 60000);
}

export function buildReportAnalytics(input: {
  overallBudget: number;
  startDate: Date | null;
  endDate: Date | null;
  tasks: TaskLike[];
  risks: RiskLike[];
  timeEntries: TimeLike[];
  phases: { name: string; order: number }[];
}) {
  const now = new Date();
  const stageOrder =
    input.phases.length > 0
      ? [...input.phases].sort((a, b) => a.order - b.order).map((p) => p.name)
      : ["Discover & Align", "Build & Evaluate", "Approve & Complete"];

  const metrics = new Map<string, StageMetric>();
  for (const stage of stageOrder) {
    metrics.set(stage, {
      stage,
      budget: 0,
      timeMinutes: 0,
      riskScore: 0,
      taskCount: 0,
      blockedCount: 0,
    });
  }

  const taskStage = new Map<string, string>();
  for (const task of input.tasks) {
    const stage = task.milestone?.phase
      ? stageForProcess(task.milestone.phase.name, task.milestone.phase.order)
      : stageForProcess(task.milestone?.name ?? task.title, null);
    const bucket = metrics.get(stage) ?? {
      stage,
      budget: 0,
      timeMinutes: 0,
      riskScore: 0,
      taskCount: 0,
      blockedCount: 0,
    };
    if (!metrics.has(stage)) metrics.set(stage, bucket);
    bucket.taskCount += 1;
    if (task.status === "BLOCKED") {
      bucket.blockedCount += 1;
      bucket.riskScore += 18;
    }
    // budget attribution: prefer milestone sub-budget share across tasks in milestone, else estimate
    const milestoneBudget = task.milestone?.subBudget ?? 0;
    if (milestoneBudget > 0) {
      const siblings = input.tasks.filter((t) => t.milestone && task.milestone && t.milestone.name === task.milestone.name).length || 1;
      bucket.budget += milestoneBudget / siblings;
    } else {
      const share = (task.estimateHours ?? 4) / Math.max(
        input.tasks.reduce((s, t) => s + (t.estimateHours ?? 4), 0),
        1
      );
      bucket.budget += input.overallBudget * share;
    }
    // planned time fallback from estimates
    bucket.timeMinutes += (task.estimateHours ?? 4) * 60 * (
      task.status === "DONE" ? 1 : task.status === "IN_REVIEW" ? 0.75 : task.status === "IN_PROGRESS" ? 0.45 : 0.2
    );
    taskStage.set(task.id, stage);
    metrics.set(stage, bucket);
  }

  // Overlay actual clocked work minutes when available
  for (const entry of input.timeEntries) {
    if (entry.kind !== "WORK" || !entry.taskId) continue;
    const stage = taskStage.get(entry.taskId);
    if (!stage) continue;
    const bucket = metrics.get(stage);
    if (!bucket) continue;
    bucket.timeMinutes += entryMinutes(entry.startedAt, entry.endedAt, now);
  }

  // Attribute risks to stages
  const openRisks = input.risks.filter((r) => r.status !== "closed");
  for (const risk of openRisks) {
    const hay = `${risk.title} ${risk.description}`.toLowerCase();
    let stage =
      stageOrder.find((s) => hay.includes(s.toLowerCase().split(" ")[0])) ??
      (hay.match(/deploy|final|approv|complete|ship/)
        ? stageOrder[stageOrder.length - 1]
        : hay.match(/build|eval|test|delegat|develop/)
          ? stageOrder[Math.min(1, stageOrder.length - 1)]
          : stageOrder[0]);
    // Prefer stage with most blocked work for critical/high risks if ambiguous
    if (risk.severity === "CRITICAL" || risk.severity === "HIGH") {
      const hottest = [...metrics.values()].sort((a, b) => b.blockedCount - a.blockedCount)[0];
      if (hottest && hottest.blockedCount > 0) stage = hottest.stage;
    }
    const bucket = metrics.get(stage) ?? metrics.get(stageOrder[0])!;
    bucket.riskScore += severityWeight(risk.severity);
    metrics.set(bucket.stage, bucket);
  }

  // Normalize budgets to overall if drift
  const stageList = [...metrics.values()].filter((m) => stageOrder.includes(m.stage) || m.taskCount > 0);
  const budgetSum = stageList.reduce((s, m) => s + m.budget, 0) || 1;
  for (const m of stageList) {
    m.budget = Math.round((m.budget / budgetSum) * input.overallBudget);
  }

  const done = input.tasks.filter((t) => t.status === "DONE").length;
  const progressPct = input.tasks.length ? clamp((done / input.tasks.length) * 100) : 0;
  let daysRemaining: number | null = null;
  if (input.endDate) {
    daysRemaining = Math.ceil((input.endDate.getTime() - now.getTime()) / 86400000);
  } else {
    const openDue = input.tasks
      .filter((t) => t.status !== "DONE" && t.dueDate)
      .map((t) => t.dueDate!.getTime());
    if (openDue.length) {
      daysRemaining = Math.ceil((Math.max(...openDue) - now.getTime()) / 86400000);
    }
  }

  const criticalRisks: CriticalRiskReview[] = openRisks
    .filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH")
    .map((r) => {
      const hay = `${r.title} ${r.description}`.toLowerCase();
      const stage =
        stageOrder.find((s) => hay.includes(s.toLowerCase().split("&")[0].trim().toLowerCase())) ??
        [...metrics.values()].sort((a, b) => b.riskScore - a.riskScore)[0]?.stage ??
        stageOrder[0];
      return {
        id: r.id,
        title: r.title,
        severity: r.severity,
        status: r.status,
        stage,
        description: r.description || "No description provided.",
        mitigation: r.mitigation || "No mitigation logged yet.",
        solutions: solutionsForRisk(r.title, r.mitigation, stage),
      };
    })
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));

  return {
    stages: stageOrder
      .map((name) => metrics.get(name))
      .filter((m): m is StageMetric => !!m)
      .concat(
        [...metrics.values()].filter((m) => !stageOrder.includes(m.stage) && (m.taskCount > 0 || m.riskScore > 0))
      ),
    progressPct,
    daysRemaining,
    doneTasks: done,
    totalTasks: input.tasks.length,
    criticalRisks,
  };
}
