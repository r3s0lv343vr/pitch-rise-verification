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

export type WorkloadPerson = {
  name: string;
  openTasks: number;
  openHours: number;
  capacityHours: number;
  utilizationPct: number;
  level: "Overloaded" | "Watch" | "Available";
  reason: string;
};

export type WorkloadWindow = {
  completionPct: number;
  averageDelayDays: number;
  delayedTaskCount: number;
  blockedTasks: number;
  hoursLogged: number;
  openEstimateHours: number;
  overloadPeople: WorkloadPerson[];
  teamLoad: WorkloadPerson[];
  capacityHoursPerPerson: number;
  pressureLabel: "Balanced" | "Watch" | "Overloaded";
};

export type BottleneckChainNode =
  | {
      kind: "gate";
      label: string;
      detail: string;
      waitingCount: number;
      status: string;
      impactLine: string;
    }
  | { kind: "queue"; label: string; waitingCount: number; impactLine: string };

export type DependencyImpactCard = {
  label: string;
  title: string;
  status: string;
  waitingCount: number;
  hoursAtRisk: number;
  stagesImpacted: string[];
  downstreamLabels: string[];
  projectImpact: "Critical" | "High" | "Medium" | "Low";
  ifUnresolved: string;
  recommendation: string;
};

export type DependencyBottlenecks = {
  topLabel: string;
  waitingOnTop: number;
  chain: BottleneckChainNode[];
  ranked: DependencyImpactCard[];
  projectImpact: {
    level: "Critical" | "High" | "Medium" | "Low" | "Clear";
    tasksAtRisk: number;
    hoursAtRisk: number;
    stagesImpacted: string[];
    summary: string;
  };
};

export type StageResourceNeed = {
  stage: string;
  status: "Struggling" | "Steady" | "Clear";
  completionPct: number;
  openTasks: number;
  blockedTasks: number;
  openHours: number;
  assigneeCount: number;
  needLabel: string;
};

export type AvailableMember = {
  id: string;
  name: string;
  homeStage: string;
  doneTasks: number;
  openTasks: number;
  freeHours: number;
  status: "Ready to reallocate" | "Partially free" | "Busy";
  note: string;
};

export type ReallocationSuggestion = {
  memberName: string;
  fromStage: string;
  toStage: string;
  freeHours: number;
  reason: string;
  priority: "High" | "Medium";
};

export type ResourceReallocation = {
  stages: StageResourceNeed[];
  available: AvailableMember[];
  suggestions: ReallocationSuggestion[];
  summary: string;
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
  const reallocation = buildResourceReallocation(input.tasks, stageOrder);

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
    reallocation,
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

  const CAPACITY_HOURS = 20; // project open-work capacity per person (2.5 day stretch)
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

  const teamLoad: WorkloadPerson[] = [...byPerson.values()]
    .map((p) => {
      const openHours = Math.round(p.openHours * 10) / 10;
      const utilizationPct = clamp((openHours / CAPACITY_HOURS) * 100, 0, 200);
      let level: WorkloadPerson["level"] = "Available";
      let reason = "Within capacity — room to take more work.";
      if (openHours >= CAPACITY_HOURS || p.openTasks >= 5) {
        level = "Overloaded";
        reason =
          openHours >= CAPACITY_HOURS
            ? `Open load ${openHours}h exceeds ${CAPACITY_HOURS}h capacity.`
            : `${p.openTasks} open tasks is above the safe handoff limit (5).`;
      } else if (openHours >= CAPACITY_HOURS * 0.75 || p.openTasks >= 3) {
        level = "Watch";
        reason =
          openHours >= CAPACITY_HOURS * 0.75
            ? `Approaching capacity (${openHours}h of ${CAPACITY_HOURS}h).`
            : `${p.openTasks} open tasks — monitor before assigning more.`;
      }
      return {
        name: p.name,
        openTasks: p.openTasks,
        openHours,
        capacityHours: CAPACITY_HOURS,
        utilizationPct,
        level,
        reason,
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct || b.openHours - a.openHours);

  const overloadPeople = teamLoad.filter((p) => p.level === "Overloaded").slice(0, 6);

  const pressureLabel: WorkloadWindow["pressureLabel"] =
    blockedTasks >= 3 || overloadPeople.length >= 2 || averageDelayDays >= 5
      ? "Overloaded"
      : blockedTasks >= 1 || overloadPeople.length >= 1 || teamLoad.some((p) => p.level === "Watch") || averageDelayDays >= 2
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
    teamLoad: teamLoad.slice(0, 8),
    capacityHoursPerPerson: CAPACITY_HOURS,
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

function collectDownstreamIds(
  taskId: string,
  dependentsOf: Map<string, string[]>,
  statusById: Map<string, TaskStatus>,
  seen = new Set<string>()
): string[] {
  const out: string[] = [];
  for (const childId of dependentsOf.get(taskId) ?? []) {
    if (statusById.get(childId) === "DONE" || seen.has(childId)) continue;
    seen.add(childId);
    out.push(childId);
    out.push(...collectDownstreamIds(childId, dependentsOf, statusById, seen));
  }
  return out;
}

function impactLevel(waitingCount: number, hoursAtRisk: number, status: string): DependencyImpactCard["projectImpact"] {
  if (status === "BLOCKED" && waitingCount >= 2) return "Critical";
  if (waitingCount >= 5 || hoursAtRisk >= 24 || (status === "IN_REVIEW" && waitingCount >= 3)) return "Critical";
  if (waitingCount >= 3 || hoursAtRisk >= 12 || status === "BLOCKED") return "High";
  if (waitingCount >= 1 || hoursAtRisk >= 6) return "Medium";
  return "Low";
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
    for (const d of task.dependents ?? []) {
      const list = dependentsOf.get(task.id) ?? [];
      if (!list.includes(d.taskId)) list.push(d.taskId);
      dependentsOf.set(task.id, list);
    }
  }

  const scored = tasks
    .filter((t) => t.status !== "DONE")
    .map((t) => {
      const downstreamIds = collectDownstreamIds(t.id, dependentsOf, statusById);
      const waitingCount = downstreamIds.length;
      const directWaiting = (dependentsOf.get(t.id) ?? []).filter((id) => statusById.get(id) !== "DONE").length;
      const downstreamTasks = downstreamIds
        .map((id) => taskById.get(id))
        .filter((x): x is TaskLike => !!x);
      const hoursAtRisk = Math.round(
        downstreamTasks.reduce((sum, d) => sum + (d.estimateHours ?? 4), 0) * 10
      ) / 10;
      const stagesImpacted = [
        ...new Set(
          downstreamTasks.map((d) =>
            d.milestone?.phase
              ? stageForProcess(d.milestone.phase.name, d.milestone.phase.order)
              : gateLabel(d.title, d.milestone?.phase?.name)
          )
        ),
      ];
      const downstreamLabels = [
        ...new Set(downstreamTasks.map((d) => gateLabel(d.title, d.milestone?.phase?.name))),
      ].slice(0, 4);
      const level = impactLevel(waitingCount, hoursAtRisk, t.status);
      const label = gateLabel(t.title, t.milestone?.phase?.name);

      let score = waitingCount * 10 + directWaiting * 6 + hoursAtRisk;
      if (t.status === "IN_REVIEW") score += 25;
      if (t.status === "BLOCKED") score += 30;
      if (t.status === "IN_PROGRESS") score += 8;
      if (level === "Critical") score += 20;

      const ifUnresolved =
        waitingCount === 0
          ? `“${label}” is open but not yet blocking other tasks — resolve before downstream work is queued.`
          : `If “${label}” stays unresolved, ${waitingCount} downstream task${
              waitingCount === 1 ? "" : "s"
            } (${hoursAtRisk}h) stall${downstreamLabels.length ? ` across ${downstreamLabels.join(" → ")}` : ""}.`;

      const recommendation =
        t.status === "BLOCKED"
          ? "Clear the blocker first — this gate is already red and cascading delay into later stages."
          : t.status === "IN_REVIEW"
            ? "Chase reviewer decision today; approval gates amplify schedule risk the longer they sit."
            : waitingCount >= 3
              ? "Treat as critical path: finish or re-sequence this gate before starting non-dependent work."
              : "Keep a named owner and next checkpoint so this does not become a silent delay.";

      return {
        task: t,
        waitingCount,
        directWaiting,
        hoursAtRisk,
        stagesImpacted,
        downstreamLabels,
        level,
        score,
        label,
        ifUnresolved,
        recommendation,
      };
    })
    .sort((a, b) => b.score - a.score || b.waitingCount - a.waitingCount);

  const ranked: DependencyImpactCard[] = scored.slice(0, 5).map((s) => ({
    label: s.label,
    title: s.task.title,
    status: s.task.status,
    waitingCount: s.waitingCount,
    hoursAtRisk: s.hoursAtRisk,
    stagesImpacted: s.stagesImpacted,
    downstreamLabels: s.downstreamLabels,
    projectImpact: s.level,
    ifUnresolved: s.ifUnresolved,
    recommendation: s.recommendation,
  }));

  const top = scored[0];
  if (!top) {
    return {
      topLabel: "No open bottlenecks",
      waitingOnTop: 0,
      chain: [],
      ranked: [],
      projectImpact: {
        level: "Clear",
        tasksAtRisk: 0,
        hoursAtRisk: 0,
        stagesImpacted: [],
        summary: "No unresolved dependency gates are currently cascading into downstream work.",
      },
    };
  }

  // Unique downstream at risk across top bottlenecks (project-level)
  const atRiskIds = new Set<string>();
  for (const s of scored.slice(0, 3)) {
    for (const id of collectDownstreamIds(s.task.id, dependentsOf, statusById)) atRiskIds.add(id);
  }
  const atRiskTasks = [...atRiskIds].map((id) => taskById.get(id)).filter((t): t is TaskLike => !!t);
  const hoursAtRisk =
    Math.round(atRiskTasks.reduce((sum, t) => sum + (t.estimateHours ?? 4), 0) * 10) / 10;
  const stagesImpacted = [
    ...new Set(
      atRiskTasks.map((t) =>
        t.milestone?.phase
          ? stageForProcess(t.milestone.phase.name, t.milestone.phase.order)
          : gateLabel(t.title, null)
      )
    ),
  ];
  const projectLevel =
    ranked.some((r) => r.projectImpact === "Critical") || atRiskIds.size >= 5
      ? "Critical"
      : ranked.some((r) => r.projectImpact === "High") || atRiskIds.size >= 3
        ? "High"
        : atRiskIds.size >= 1
          ? "Medium"
          : "Low";

  const projectImpact = {
    level: projectLevel as DependencyBottlenecks["projectImpact"]["level"],
    tasksAtRisk: atRiskIds.size,
    hoursAtRisk,
    stagesImpacted,
    summary:
      atRiskIds.size === 0
        ? `Top unresolved area is “${top.label}” — limited downstream cascade so far, but it sits on the critical path.`
        : `Unresolved “${top.label}” (and related gates) put ${atRiskIds.size} downstream task${
            atRiskIds.size === 1 ? "" : "s"
          } / ${hoursAtRisk}h at risk${
            stagesImpacted.length ? ` in ${stagesImpacted.join(", ")}` : ""
          }. Delivery slip grows while these stay open.`,
  };

  // Walk heaviest downstream path for cascade visualization
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
        collectDownstreamIds(b.id, dependentsOf, statusById).length -
        collectDownstreamIds(a.id, dependentsOf, statusById).length
    );
    const next = children[0];
    chainTasks.push(next);
    seen.add(next.id);
    cursor = next.id;
  }

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
    const waitingCount = collectDownstreamIds(task.id, dependentsOf, statusById).length;
    const directWaiting = (dependentsOf.get(task.id) ?? []).filter((id) => statusById.get(id) !== "DONE").length;
    const label = gateLabel(task.title, task.milestone?.phase?.name);
    const wait = Math.max(waitingCount, directWaiting);
    const downstreamLabels = [
      ...new Set(
        collectDownstreamIds(task.id, dependentsOf, statusById)
          .map((id) => taskById.get(id))
          .filter((t): t is TaskLike => !!t)
          .map((t) => gateLabel(t.title, t.milestone?.phase?.name))
      ),
    ].slice(0, 3);

    chain.push({
      kind: "gate",
      label,
      detail: task.title,
      waitingCount: wait,
      status: task.status,
      impactLine:
        wait > 0
          ? `Unresolved → stalls ${wait} downstream${
              downstreamLabels.length ? ` (${downstreamLabels.join(", ")})` : ""
            }`
          : "On path — limited cascade until dependents queue up",
    });

    if (idx === 0 && wait > 0) {
      chain.push({
        kind: "queue",
        label: `${wait} task${wait === 1 ? "" : "s"} waiting`,
        waitingCount: wait,
        impactLine: `These cannot finish until “${label}” clears`,
      });
    }
  });

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
    projectImpact,
  };
}

function taskStage(task: TaskLike): string {
  return task.milestone?.phase
    ? stageForProcess(task.milestone.phase.name, task.milestone.phase.order)
    : stageForProcess(task.milestone?.name ?? task.title, null);
}

export function buildResourceReallocation(
  tasks: TaskLike[],
  stageOrder: string[]
): ResourceReallocation {
  const stagesUsed =
    stageOrder.length > 0
      ? stageOrder
      : ["Discover & Align", "Build & Evaluate", "Approve & Complete"];

  // Per-stage health
  const stageNeeds: StageResourceNeed[] = stagesUsed.map((stage) => {
    const stageTasks = tasks.filter((t) => taskStage(t) === stage);
    const done = stageTasks.filter((t) => t.status === "DONE").length;
    const open = stageTasks.filter((t) => t.status !== "DONE");
    const blocked = open.filter((t) => t.status === "BLOCKED").length;
    const openHours = Math.round(open.reduce((s, t) => s + (t.estimateHours ?? 4), 0) * 10) / 10;
    const assignees = new Set(open.map((t) => t.assignee?.id).filter(Boolean));
    const completionPct = stageTasks.length ? clamp((done / stageTasks.length) * 100) : 100;

    let status: StageResourceNeed["status"] = "Steady";
    let needLabel = "On track — no extra hands required.";
    if (blocked >= 1 || (completionPct < 40 && open.length >= 2) || openHours >= 20) {
      status = "Struggling";
      needLabel =
        blocked >= 1
          ? `Needs help — ${blocked} blocked + ${open.length} open (${openHours}h).`
          : `Behind pace — ${open.length} open tasks / ${openHours}h with low completion.`;
    } else if (completionPct >= 80 && open.length <= 1) {
      status = "Clear";
      needLabel = "Mostly finished — people here can move downstream.";
    }

    return {
      stage,
      status,
      completionPct,
      openTasks: open.length,
      blockedTasks: blocked,
      openHours,
      assigneeCount: assignees.size,
      needLabel,
    };
  });

  // Per-person home stage + availability
  type Acc = {
    id: string;
    name: string;
    byStage: Map<string, { done: number; open: number; openHours: number; doneHours: number }>;
  };
  const people = new Map<string, Acc>();

  for (const task of tasks) {
    if (!task.assignee) continue;
    const acc =
      people.get(task.assignee.id) ??
      ({
        id: task.assignee.id,
        name: task.assignee.name,
        byStage: new Map(),
      } satisfies Acc);
    const stage = taskStage(task);
    const row = acc.byStage.get(stage) ?? { done: 0, open: 0, openHours: 0, doneHours: 0 };
    const hrs = task.estimateHours ?? 4;
    if (task.status === "DONE") {
      row.done += 1;
      row.doneHours += hrs;
    } else {
      row.open += 1;
      row.openHours += hrs;
    }
    acc.byStage.set(stage, row);
    people.set(task.assignee.id, acc);
  }

  const available: AvailableMember[] = [...people.values()]
    .map((p) => {
      const stageRows = [...p.byStage.entries()].map(([stage, stats]) => ({
        stage,
        ...stats,
        weight: stats.done + stats.open,
      }));
      stageRows.sort((a, b) => b.weight - a.weight || b.doneHours - a.doneHours);
      const home = stageRows[0];
      const homeStage = home?.stage ?? stagesUsed[0];
      const doneTasks = stageRows.reduce((s, r) => s + r.done, 0);
      const openTasks = stageRows.reduce((s, r) => s + r.open, 0);
      const openHours = stageRows.reduce((s, r) => s + r.openHours, 0);
      const homeOpen = home?.open ?? 0;
      const homeDone = home?.done ?? 0;

      let status: AvailableMember["status"] = "Busy";
      let note = `Still carrying open work in ${homeStage}.`;
      let freeHours = 0;

      if (openTasks === 0 && doneTasks > 0) {
        status = "Ready to reallocate";
        freeHours = Math.max(8, Math.round((home?.doneHours ?? 8) * 0.5));
        note = `Finished assigned work in ${homeStage} — free to reinforce a struggling stage.`;
      } else if (homeOpen === 0 && homeDone > 0 && openHours <= 8) {
        status = "Ready to reallocate";
        freeHours = Math.max(6, Math.round(20 - openHours));
        note = `Home stage ${homeStage} is complete; only light residual work elsewhere.`;
      } else if (openHours <= 8 && doneTasks >= 1) {
        status = "Partially free";
        freeHours = Math.round((20 - openHours) * 10) / 10;
        note = `Has ~${freeHours}h spare capacity after ${homeStage} progress.`;
      }

      return {
        id: p.id,
        name: p.name,
        homeStage,
        doneTasks,
        openTasks,
        freeHours,
        status,
        note,
      };
    })
    .filter((p) => p.doneTasks > 0 || p.openTasks > 0)
    .sort((a, b) => {
      const rank = (s: AvailableMember["status"]) =>
        s === "Ready to reallocate" ? 0 : s === "Partially free" ? 1 : 2;
      return rank(a.status) - rank(b.status) || b.freeHours - a.freeHours;
    });

  const struggling = stageNeeds.filter((s) => s.status === "Struggling");
  const movers = available.filter(
    (p) => p.status === "Ready to reallocate" || p.status === "Partially free"
  );

  const suggestions: ReallocationSuggestion[] = [];
  for (const need of struggling) {
    const candidates = movers
      .filter((m) => m.homeStage !== need.stage)
      .sort((a, b) => {
        // Prefer people from Clear/finished earlier stages
        const aClear = stageNeeds.find((s) => s.stage === a.homeStage)?.status === "Clear" ? 1 : 0;
        const bClear = stageNeeds.find((s) => s.stage === b.homeStage)?.status === "Clear" ? 1 : 0;
        return bClear - aClear || b.freeHours - a.freeHours;
      });

    for (const m of candidates.slice(0, 2)) {
      if (suggestions.some((s) => s.memberName === m.name && s.toStage === need.stage)) continue;
      suggestions.push({
        memberName: m.name,
        fromStage: m.homeStage,
        toStage: need.stage,
        freeHours: m.freeHours,
        priority: m.status === "Ready to reallocate" && need.blockedTasks > 0 ? "High" : "Medium",
        reason:
          need.blockedTasks > 0
            ? `${m.name} finished (or nearly finished) ${m.homeStage} and can help clear ${need.blockedTasks} blocked item${need.blockedTasks === 1 ? "" : "s"} in ${need.stage}.`
            : `${m.name} has spare capacity from ${m.homeStage} — move ~${m.freeHours}h into ${need.stage} (${need.openTasks} open / ${need.openHours}h).`,
      });
    }
  }

  // If no struggling stage but someone is free, suggest reinforcing the least-complete open stage
  if (suggestions.length === 0 && movers.length > 0) {
    const target =
      [...stageNeeds].sort((a, b) => a.completionPct - b.completionPct || b.openHours - a.openHours)[0] ??
      null;
    const mover = movers[0];
    if (target && mover && target.stage !== mover.homeStage) {
      suggestions.push({
        memberName: mover.name,
        fromStage: mover.homeStage,
        toStage: target.stage,
        freeHours: mover.freeHours,
        priority: "Medium",
        reason: `${mover.name} is free from ${mover.homeStage}; reinforce ${target.stage} to keep momentum (${target.completionPct}% complete).`,
      });
    }
  }

  const readyCount = available.filter((p) => p.status === "Ready to reallocate").length;
  const summary =
    struggling.length === 0
      ? readyCount > 0
        ? `${readyCount} teammate${readyCount === 1 ? "" : "s"} finished their home stage and can be reassigned if a later area slips.`
        : "No stage is currently flagged as struggling; keep monitoring open load by process area."
      : `${struggling.map((s) => s.stage).join(", ")} need${struggling.length === 1 ? "s" : ""} reinforcement — ${
          suggestions.length
            ? `${suggestions.length} reallocation option${suggestions.length === 1 ? "" : "s"} from finished/lighter stages.`
            : "no free capacity found yet; finish earlier-stage work to free people."
        }`;

  return {
    stages: stageNeeds,
    available: available.slice(0, 10),
    suggestions: suggestions.slice(0, 6),
    summary,
  };
}
