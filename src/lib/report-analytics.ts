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
  assignee?: { id: string; name: string } | null;
  dependencies?: { dependsOnId: string }[];
  dependents?: { taskId: string }[];
  milestone: {
    name: string;
    subBudget: number;
    phase: { name: string; order: number } | null;
  } | null;
};

export type WorkloadWindow = {
  completionPct: number;
  averageDelayDays: number;
  delayedTaskCount: number;
  blockedTasks: number;
  hoursLogged: number;
  openEstimateHours: number;
  overloadPeople: { name: string; openTasks: number; openHours: number }[];
  pressureLabel: "Balanced" | "Watch" | "Overloaded";
};

export type BottleneckChainNode =
  | { kind: "gate"; label: string; detail: string; waitingCount: number; status: string }
  | { kind: "queue"; label: string; waitingCount: number };

export type DependencyBottlenecks = {
  topLabel: string;
  waitingOnTop: number;
  chain: BottleneckChainNode[];
  ranked: { label: string; waitingCount: number; status: string; title: string }[];
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

  const workload = buildWorkloadWindow({
    tasks: input.tasks,
    timeEntries: input.timeEntries,
    now,
    completionPct: progressPct,
  });

  const bottlenecks = buildDependencyBottlenecks(input.tasks);

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
    workload,
    bottlenecks,
  };
}

function daysBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / 86400000;
}

export function buildWorkloadWindow(input: {
  tasks: TaskLike[];
  timeEntries: TimeLike[];
  now?: Date;
  completionPct?: number;
}): WorkloadWindow {
  const now = input.now ?? new Date();
  const done = input.tasks.filter((t) => t.status === "DONE").length;
  const completionPct =
    input.completionPct ?? (input.tasks.length ? clamp((done / input.tasks.length) * 100) : 0);

  const delayed = input.tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now.getTime()
  );
  const averageDelayDays = delayed.length
    ? Math.round(
        (delayed.reduce((sum, t) => sum + daysBetween(now, t.dueDate!), 0) / delayed.length) * 10
      ) / 10
    : 0;

  const blockedTasks = input.tasks.filter((t) => t.status === "BLOCKED").length;

  const hoursLogged =
    Math.round(
      (input.timeEntries
        .filter((e) => e.kind === "WORK")
        .reduce((sum, e) => sum + entryMinutes(e.startedAt, e.endedAt, now), 0) /
        60) *
        10
    ) / 10;

  const byPerson = new Map<string, { name: string; openTasks: number; openHours: number }>();
  let openEstimateHours = 0;
  for (const task of input.tasks) {
    if (task.status === "DONE") continue;
    const hrs = task.estimateHours ?? 4;
    openEstimateHours += hrs;
    const person = task.assignee;
    if (!person) continue;
    const row = byPerson.get(person.id) ?? { name: person.name, openTasks: 0, openHours: 0 };
    row.openTasks += 1;
    row.openHours += hrs;
    byPerson.set(person.id, row);
  }

  const overloadPeople = [...byPerson.values()]
    .filter((p) => p.openHours >= 18 || p.openTasks >= 4)
    .sort((a, b) => b.openHours - a.openHours)
    .slice(0, 4)
    .map((p) => ({
      ...p,
      openHours: Math.round(p.openHours * 10) / 10,
    }));

  const pressureLabel: WorkloadWindow["pressureLabel"] =
    blockedTasks >= 3 || overloadPeople.length >= 2 || averageDelayDays >= 5
      ? "Overloaded"
      : blockedTasks >= 1 || overloadPeople.length >= 1 || averageDelayDays >= 2
        ? "Watch"
        : "Balanced";

  return {
    completionPct,
    averageDelayDays,
    delayedTaskCount: delayed.length,
    blockedTasks,
    hoursLogged,
    openEstimateHours: Math.round(openEstimateHours * 10) / 10,
    overloadPeople,
    pressureLabel,
  };
}

function gateLabel(title: string, phaseName?: string | null): string {
  const t = title.toLowerCase();
  if (/review|approv|sign.?off|decision|stakeholder/.test(t)) {
    if (/final|client|complete|delivery/.test(t)) return "Client Signoff";
    return "Reviewer Approval";
  }
  if (/deploy|ship|launch|release/.test(t)) return "Deployment";
  if (/build|evaluat|revise|implement|delegat|develop|test/.test(t)) return "Build Phase";
  if (/complete|close|archive|handoff/.test(t)) return "Client Signoff";
  if (phaseName) {
    const p = phaseName.toLowerCase();
    if (/approv|complete/.test(p)) return "Client Signoff";
    if (/build|evaluat/.test(p)) return "Build Phase";
  }
  return title.length > 28 ? `${title.slice(0, 26)}…` : title;
}

function transitiveWaitingCount(
  taskId: string,
  dependentsOf: Map<string, string[]>,
  statusById: Map<string, TaskStatus>,
  memo = new Map<string, number>(),
  stack = new Set<string>()
): number {
  if (memo.has(taskId)) return memo.get(taskId)!;
  if (stack.has(taskId)) return 0;
  stack.add(taskId);
  let count = 0;
  for (const childId of dependentsOf.get(taskId) ?? []) {
    if (statusById.get(childId) === "DONE") continue;
    count += 1 + transitiveWaitingCount(childId, dependentsOf, statusById, memo, stack);
  }
  stack.delete(taskId);
  memo.set(taskId, count);
  return count;
}

export function buildDependencyBottlenecks(tasks: TaskLike[]): DependencyBottlenecks {
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const dependentsOf = new Map<string, string[]>();

  for (const task of tasks) {
    for (const dep of task.dependencies ?? []) {
      const list = dependentsOf.get(dep.dependsOnId) ?? [];
      list.push(task.id);
      dependentsOf.set(dep.dependsOnId, list);
    }
    // Prefer explicit dependents relation when present
    for (const d of task.dependents ?? []) {
      const list = dependentsOf.get(task.id) ?? [];
      if (!list.includes(d.taskId)) list.push(d.taskId);
      dependentsOf.set(task.id, list);
    }
  }

  const scored = tasks
    .filter((t) => t.status !== "DONE")
    .map((t) => {
      const waitingCount = transitiveWaitingCount(t.id, dependentsOf, statusById);
      const directWaiting = (dependentsOf.get(t.id) ?? []).filter((id) => statusById.get(id) !== "DONE").length;
      let score = waitingCount * 10 + directWaiting * 6;
      if (t.status === "IN_REVIEW") score += 25;
      if (t.status === "BLOCKED") score += 30;
      if (t.status === "IN_PROGRESS") score += 8;
      return {
        task: t,
        waitingCount: Math.max(waitingCount, directWaiting),
        directWaiting,
        score,
        label: gateLabel(t.title, t.milestone?.phase?.name),
      };
    })
    .sort((a, b) => b.score - a.score || b.waitingCount - a.waitingCount);

  const ranked = scored.slice(0, 5).map((s) => ({
    label: s.label,
    waitingCount: s.waitingCount,
    status: s.task.status,
    title: s.task.title,
  }));

  const top = scored[0];
  if (!top) {
    return {
      topLabel: "No open bottlenecks",
      waitingOnTop: 0,
      chain: [],
      ranked: [],
    };
  }

  // Walk heaviest downstream path to form a readable bottleneck chain
  const chainTasks: TaskLike[] = [top.task];
  let cursor = top.task.id;
  const seen = new Set<string>([cursor]);
  for (let i = 0; i < 4; i++) {
    const children = (dependentsOf.get(cursor) ?? [])
      .map((id) => taskById.get(id))
      .filter((t): t is TaskLike => !!t && t.status !== "DONE" && !seen.has(t.id));
    if (!children.length) break;
    children.sort(
      (a, b) =>
        transitiveWaitingCount(b.id, dependentsOf, statusById) -
        transitiveWaitingCount(a.id, dependentsOf, statusById)
    );
    const next = children[0];
    chainTasks.push(next);
    seen.add(next.id);
    cursor = next.id;
  }

  // Ensure late-stage gates appear when present in open work
  const ensureLabels = ["Build Phase", "Deployment", "Client Signoff"];
  for (const label of ensureLabels) {
    if (chainTasks.some((t) => gateLabel(t.title, t.milestone?.phase?.name) === label)) continue;
    const candidate = scored.find((s) => s.label === label && !seen.has(s.task.id));
    if (candidate) {
      chainTasks.push(candidate.task);
      seen.add(candidate.task.id);
    }
  }

  const chain: BottleneckChainNode[] = [];
  chainTasks.forEach((task, idx) => {
    const waitingCount = transitiveWaitingCount(task.id, dependentsOf, statusById);
    const directWaiting = (dependentsOf.get(task.id) ?? []).filter((id) => statusById.get(id) !== "DONE").length;
    const label = gateLabel(task.title, task.milestone?.phase?.name);
    chain.push({
      kind: "gate",
      label,
      detail: task.title,
      waitingCount: Math.max(waitingCount, directWaiting),
      status: task.status,
    });
    if (idx === 0 && Math.max(waitingCount, directWaiting) > 0) {
      chain.push({
        kind: "queue",
        label: `${Math.max(waitingCount, directWaiting)} task${
          Math.max(waitingCount, directWaiting) === 1 ? "" : "s"
        } waiting`,
        waitingCount: Math.max(waitingCount, directWaiting),
      });
    }
  });

  // Deduplicate consecutive identical gate labels
  const deduped: BottleneckChainNode[] = [];
  for (const node of chain) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.kind === "gate" && node.kind === "gate" && prev.label === node.label) continue;
    deduped.push(node);
  }

  return {
    topLabel: top.label,
    waitingOnTop: top.waitingCount,
    chain: deduped.slice(0, 7),
    ranked,
  };
}
