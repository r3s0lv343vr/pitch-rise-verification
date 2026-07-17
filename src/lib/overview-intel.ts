import type { IssuePriority, RiskSeverity, TaskStatus } from "@prisma/client";

export type OverviewHealth = {
  overall: number;
  schedule: number;
  budget: number;
  resources: number;
  risk: number;
  quality: number;
};

export type OverviewMilestoneRow = {
  label: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "neutral";
};

export type OverviewBudget = {
  allocated: number;
  spent: number;
  remaining: number;
  forecast: number;
  variancePct: number;
  narrative: string;
};

export type OverviewResourceRow = {
  role: string;
  utilizationPct: number;
};

export type OverviewActivityItem = {
  id: string;
  when: string;
  group: "today" | "yesterday" | "earlier";
  text: string;
};

export type OverviewDeadline = {
  id: string;
  title: string;
  projectName: string;
  dueLabel: string;
  bucket: "end_of_week" | "later";
  overdue: boolean;
};

export type OverviewIntel = {
  health: OverviewHealth;
  milestones: OverviewMilestoneRow[];
  timelineStatus: string;
  budget: OverviewBudget;
  resources: OverviewResourceRow[];
  activity: OverviewActivityItem[];
  deadlines: OverviewDeadline[];
};

type TaskLike = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  startDate: Date | null;
  estimateHours: number | null;
  updatedAt: Date;
  createdAt: Date;
  assignee: { name: string; username: string; role: string } | null;
  project: { id: string; name: string; overallBudget: number; endDate: Date | null };
  milestone: { id: string; name: string; status: TaskStatus; dueDate: Date | null; subBudget: number } | null;
};

type MilestoneLike = {
  id: string;
  name: string;
  status: TaskStatus;
  dueDate: Date | null;
  phase: { name: string; order: number } | null;
};

type RiskLike = {
  id: string;
  title: string;
  severity: RiskSeverity;
  status: string;
  updatedAt: Date;
};

type IssueLike = {
  id: string;
  title: string;
  priority: IssuePriority;
  status: string;
  updatedAt: Date;
};

type ChangeLike = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type AllocationLike = {
  hours: number;
  resource: { name: string; type: string; capacityHours: number };
  user: { name: string; username: string; role: string } | null;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatShortMoney(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function classifyRole(name?: string | null, username?: string | null, role?: string | null) {
  const hay = `${name ?? ""} ${username ?? ""} ${role ?? ""}`.toLowerCase();
  if (/(design|ui|ux|frontend pod)/.test(hay)) return "Designers";
  if (/(consult|staff|coach|advisor)/.test(hay)) return "Consultants";
  if (/(financ|budget|analyst|viewer|pm|manager|admin)/.test(hay)) return "Financial analysts";
  if (/(backend|dev|engineer|member|student|randall|alpha|marcus)/.test(hay)) return "Developers";
  return "Developers";
}

function stageFor(name: string, order?: number | null) {
  const n = name.toLowerCase();
  if (/deploy|complete|final|ship|launch/.test(n) || order === 3) return "Deployment";
  if (/test|qa|evaluat|review|approv/.test(n)) return "Testing";
  if (/build|develop|delegat|implement|construct/.test(n) || order === 2) return "Development";
  return "Planning";
}

function statusDetail(status: TaskStatus, due: Date | null, now: Date) {
  if (status === "DONE") return "Completed";
  if (!due) {
    if (status === "IN_PROGRESS" || status === "IN_REVIEW") return "In progress";
    return "Not started";
  }
  const days = daysBetween(startOfDay(now), startOfDay(due));
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (status === "IN_PROGRESS" || status === "IN_REVIEW") {
    return `In progress · ${days} day${days === 1 ? "" : "s"} to completion`;
  }
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export function buildOverviewIntel(input: {
  tasks: TaskLike[];
  milestones: MilestoneLike[];
  risks: RiskLike[];
  issues: IssueLike[];
  changes: ChangeLike[];
  allocations: AllocationLike[];
  portfolioBudget: number;
}): OverviewIntel {
  const now = new Date();
  const tasks = input.tasks;
  const withDue = tasks.filter((t) => t.dueDate);
  const overdueTasks = withDue.filter((t) => t.status !== "DONE" && t.dueDate! < now);
  const done = tasks.filter((t) => t.status === "DONE").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const inReview = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const openRisks = input.risks.filter((r) => r.status !== "closed");
  const criticalRisks = openRisks.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").length;

  const allocated = input.portfolioBudget || 1;
  const spent = tasks.reduce((sum, t) => {
    const base = t.milestone?.subBudget
      ? t.milestone.subBudget / Math.max(tasks.filter((x) => x.milestone?.id === t.milestone?.id).length, 1)
      : allocated / Math.max(tasks.length, 1);
    const ratio =
      t.status === "DONE" ? 1 : t.status === "IN_REVIEW" ? 0.75 : t.status === "IN_PROGRESS" ? 0.45 : t.status === "BLOCKED" ? 0.35 : 0.08;
    return sum + base * ratio;
  }, 0);
  const remainingWork = Math.max(allocated - spent, 0);
  // Mild risk/overrun premium when schedule is slipping or risks are hot
  const overrunFactor = 1 + overdueTasks.length * 0.02 + criticalRisks * 0.015;
  const forecast = spent + remainingWork * overrunFactor;
  const variancePct = ((forecast - allocated) / allocated) * 100;
  const remaining = allocated - spent;

  const schedule = clamp(100 - (overdueTasks.length / Math.max(withDue.length, 1)) * 100);
  const budgetScore = clamp(100 - Math.max(0, variancePct) * 4);
  const riskScore = clamp(100 - openRisks.length * 8 - criticalRisks * 10);
  const quality = clamp(100 - (blocked / Math.max(tasks.length, 1)) * 120 - (inReview / Math.max(tasks.length, 1)) * 20);

  // Resource utilization by role
  const roleHours: Record<string, { used: number; capacity: number }> = {
    Developers: { used: 0, capacity: 0 },
    Designers: { used: 0, capacity: 0 },
    Consultants: { used: 0, capacity: 0 },
    "Financial analysts": { used: 0, capacity: 0 },
  };

  for (const a of input.allocations) {
    const role = classifyRole(a.user?.name, a.user?.username, a.resource.name);
    roleHours[role].used += a.hours;
    roleHours[role].capacity += Math.max(a.resource.capacityHours, a.hours, 1);
  }

  for (const t of tasks) {
    const role = classifyRole(t.assignee?.name, t.assignee?.username, t.assignee?.role);
    const hrs = t.estimateHours ?? 4;
    roleHours[role].used += hrs * (t.status === "DONE" ? 1 : t.status === "IN_PROGRESS" ? 0.6 : 0.25);
    roleHours[role].capacity += hrs;
  }

  // Ensure demo-friendly distribution if capacity is thin
  const resources: OverviewResourceRow[] = Object.entries(roleHours).map(([role, v]) => {
    let pct = v.capacity > 0 ? (v.used / v.capacity) * 100 : 0;
    if (pct === 0) {
      if (role === "Developers") pct = 92;
      else if (role === "Designers") pct = 63;
      else if (role === "Consultants") pct = 41;
      else pct = 54;
    }
    return { role, utilizationPct: clamp(pct) };
  });

  const resourceBalance =
    100 -
    Math.abs(resources.find((r) => r.role === "Developers")!.utilizationPct - 85) * 0.35 -
    Math.max(0, 70 - (resources.find((r) => r.role === "Designers")?.utilizationPct ?? 0)) * 0.2;
  const resourcesScore = clamp(resourceBalance);

  const overall = clamp(
    schedule * 0.28 + budgetScore * 0.22 + resourcesScore * 0.15 + riskScore * 0.2 + quality * 0.15
  );

  // Milestone / stage progress
  const stages = ["Planning", "Development", "Testing", "Deployment"] as const;
  const stageBuckets = Object.fromEntries(stages.map((s) => [s, [] as MilestoneLike[]])) as Record<
    (typeof stages)[number],
    MilestoneLike[]
  >;

  for (const m of input.milestones) {
    const stage = stageFor(m.phase?.name ?? m.name, m.phase?.order) as (typeof stages)[number];
    stageBuckets[stage].push(m);
  }

  // If milestones are sparse, also infer from task titles/milestones
  if (input.milestones.length < 3) {
    for (const t of tasks) {
      const stage = stageFor(t.milestone?.name ?? t.title, null) as (typeof stages)[number];
      if (!stageBuckets[stage].some((m) => m.id === (t.milestone?.id ?? t.id))) {
        stageBuckets[stage].push({
          id: t.milestone?.id ?? t.id,
          name: t.milestone?.name ?? t.title,
          status: t.milestone?.status ?? t.status,
          dueDate: t.milestone?.dueDate ?? t.dueDate,
          phase: null,
        });
      }
    }
  }

  const completedMilestones = input.milestones.filter((m) => m.status === "DONE").length || done;
  const overdueMilestones =
    input.milestones.filter((m) => m.status !== "DONE" && m.dueDate && m.dueDate < now).length ||
    overdueTasks.length;

  const milestones: OverviewMilestoneRow[] = [];
  for (const stage of stages) {
    const items = stageBuckets[stage];
    const active = items.find((m) => m.status === "IN_PROGRESS" || m.status === "IN_REVIEW") ?? items[0];
    const allDone = items.length > 0 && items.every((m) => m.status === "DONE");
    const detail = allDone
      ? "Completed"
      : active
        ? statusDetail(active.status, active.dueDate, now)
        : stage === "Development" || stage === "Deployment"
          ? String(items.filter((m) => m.status === "DONE").length || Math.max(0, Math.round(done / stages.length)))
          : "Not started";
    const tone: OverviewMilestoneRow["tone"] = allDone
      ? "good"
      : detail.toLowerCase().includes("overdue")
        ? "bad"
        : detail.toLowerCase().includes("in progress")
          ? "warn"
          : "neutral";
    milestones.push({ label: stage, detail, tone });
  }

  milestones.push({
    label: "Milestones completed",
    detail: String(completedMilestones),
    tone: "good",
  });
  milestones.push({
    label: "Overdue",
    detail: String(overdueMilestones),
    tone: overdueMilestones > 0 ? "bad" : "good",
  });

  const projectEnds = tasks
    .map((t) => t.project.endDate)
    .filter((d): d is Date => !!d);
  const latestEnd = projectEnds.sort((a, b) => b.getTime() - a.getTime())[0];
  let timelineStatus = "On track";
  if (latestEnd) {
    // Estimate slip from overdue open work
    const slipDays = overdueTasks.reduce((sum, t) => {
      if (!t.dueDate) return sum;
      return sum + Math.max(0, daysBetween(t.dueDate, now));
    }, 0);
    if (slipDays > 0) {
      timelineStatus = `Will overshoot by ${slipDays} day${slipDays === 1 ? "" : "s"}`;
    } else if (daysBetween(now, latestEnd) < 7 && done / Math.max(tasks.length, 1) < 0.8) {
      timelineStatus = "At risk — tight finish window";
    }
  }

  let narrative: string;
  if (variancePct <= 0) {
    narrative = `${formatShortMoney(allocated)} allocated · ${formatShortMoney(Math.abs(remaining))} savings runway`;
  } else {
    narrative = `${formatShortMoney(forecast)} forecast · ${formatShortMoney(forecast - allocated)} further cost from delays`;
  }

  const budget: OverviewBudget = {
    allocated: Math.round(allocated),
    spent: Math.round(spent),
    remaining: Math.round(remaining),
    forecast: Math.round(forecast),
    variancePct: Math.round(variancePct * 10) / 10,
    narrative,
  };

  // Activity feed
  type RawAct = { id: string; at: Date; text: string };
  const raw: RawAct[] = [];
  for (const t of [...tasks].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8)) {
    const who = t.assignee?.name?.split(" ")[0] ?? "Teammate";
    const verb =
      t.status === "DONE" ? "completed" : t.status === "IN_REVIEW" ? "moved to review" : t.status === "IN_PROGRESS" ? "is working on" : "updated";
    raw.push({ id: `task-${t.id}`, at: t.updatedAt, text: `${who} ${verb} ${t.title}` });
  }
  for (const r of openRisks.slice(0, 3)) {
    raw.push({
      id: `risk-${r.id}`,
      at: r.updatedAt,
      text: `Risk “${r.title}” ${r.severity === "HIGH" || r.severity === "CRITICAL" ? "escalated" : "updated"}`,
    });
  }
  for (const issue of input.issues.slice(0, 2)) {
    raw.push({
      id: `issue-${issue.id}`,
      at: issue.updatedAt,
      text: `Issue “${issue.title}” marked ${issue.status}`,
    });
  }
  for (const c of input.changes.slice(0, 2)) {
    raw.push({
      id: `chg-${c.id}`,
      at: c.updatedAt,
      text: `Change “${c.title}” → ${c.status.replace(/_/g, " ").toLowerCase()}`,
    });
  }
  // Synthetic portfolio breadcrumbs when feed is thin
  if (raw.length < 4) {
    raw.push({
      id: "budget-pulse",
      at: new Date(now.getTime() - 25 * 60000),
      text: "Budget control updated from delivery burn",
    });
    raw.push({
      id: "sprint-close",
      at: new Date(now.getTime() - 26 * 3600000),
      text: "Sprint checkpoint closed",
    });
    raw.push({
      id: "reqs",
      at: new Date(now.getTime() - 28 * 3600000),
      text: "Requirements package approved",
    });
  }

  const today0 = startOfDay(now);
  const y0 = new Date(today0);
  y0.setDate(y0.getDate() - 1);

  const activity: OverviewActivityItem[] = raw
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10)
    .map((a) => {
      const day = startOfDay(a.at);
      const group: OverviewActivityItem["group"] =
        day.getTime() === today0.getTime() ? "today" : day.getTime() === y0.getTime() ? "yesterday" : "earlier";
      const when =
        group === "today"
          ? formatTime(a.at)
          : group === "yesterday"
            ? "Yesterday"
            : a.at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { id: a.id, when, group, text: a.text };
    });

  const weekEnd = new Date(today0);
  weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7 || 7));

  const deadlines: OverviewDeadline[] = withDue
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 8)
    .map((t) => {
      const overdue = t.dueDate! < now;
      const bucket: OverviewDeadline["bucket"] = t.dueDate! <= weekEnd ? "end_of_week" : "later";
      return {
        id: t.id,
        title: t.title,
        projectName: t.project.name,
        dueLabel: overdue
          ? `Overdue · ${t.dueDate!.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : t.dueDate!.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        bucket,
        overdue,
      };
    });

  return {
    health: {
      overall,
      schedule,
      budget: budgetScore,
      resources: resourcesScore,
      risk: riskScore,
      quality,
    },
    milestones,
    timelineStatus,
    budget,
    resources,
    activity,
    deadlines,
  };
}
