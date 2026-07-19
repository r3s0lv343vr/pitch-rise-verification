import type { TaskStatus } from "@prisma/client";
import { statusBurnRatio } from "@/lib/linked-status";
import { stageForProcess } from "@/lib/report-analytics";

export type TrendCostPhase = "Discovery" | "Build" | "Testing" | "Deployment";

export type SchedulePoint = {
  week: string;
  plannedPct: number;
  actualPct: number;
};

export type BurnPoint = {
  week: string;
  planned: number;
  actual: number | null;
  forecast: number;
};

export type PhaseCostRow = {
  phase: TrendCostPhase;
  planned: number;
  actual: number;
};

export type TrendAnalysis = {
  schedule: {
    points: SchedulePoint[];
    narrative: string;
    plannedDonePct: number;
    actualDonePct: number;
    slipDays: number;
  };
  burn: {
    points: BurnPoint[];
    originalBudget: number;
    currentForecast: number;
    variancePct: number;
    varianceAmount: number;
    spentToDate: number;
    narrative: string;
  };
  phaseCosts: {
    rows: PhaseCostRow[];
    narrative: string;
  };
};

type TaskLike = {
  id: string;
  title: string;
  status: TaskStatus;
  estimateHours: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  milestone: {
    name: string;
    subBudget: number;
    dueDate: Date | null;
    phase: { name: string; order: number } | null;
  } | null;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

function weekLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weeksBetween(start: Date, end: Date) {
  const points: Date[] = [];
  let cursor = startOfWeek(start);
  const last = startOfWeek(end);
  while (cursor.getTime() <= last.getTime() + 86400000) {
    points.push(new Date(cursor));
    cursor = addDays(cursor, 7);
    if (points.length > 24) break;
  }
  if (points.length === 0) points.push(startOfWeek(new Date()));
  return points;
}

export function costPhaseForTask(task: TaskLike): TrendCostPhase {
  const hay = `${task.title} ${task.milestone?.name ?? ""} ${task.milestone?.phase?.name ?? ""}`.toLowerCase();
  if (/deploy|ship|launch|release|complete|sign.?off|final delivery|approv/.test(hay)) {
    return "Deployment";
  }
  if (/test|qa|evaluat|quality|uat|verify/.test(hay)) return "Testing";
  if (/build|develop|implement|delegat|revise|construct|code/.test(hay)) return "Build";
  if (/discover|align|plan|concept|stakeholder|brainstorm|research/.test(hay)) return "Discovery";

  const stage = task.milestone?.phase
    ? stageForProcess(task.milestone.phase.name, task.milestone.phase.order)
    : stageForProcess(task.milestone?.name ?? task.title, null);
  if (stage.includes("Approve")) return "Deployment";
  if (stage.includes("Build")) return /eval|test/.test(hay) ? "Testing" : "Build";
  return "Discovery";
}

function taskBudgetShare(task: TaskLike, tasks: TaskLike[], overallBudget: number) {
  const milestoneBudget = task.milestone?.subBudget ?? 0;
  if (milestoneBudget > 0) {
    const siblings =
      tasks.filter((t) => t.milestone && task.milestone && t.milestone.name === task.milestone.name)
        .length || 1;
    return milestoneBudget / siblings;
  }
  const totalEst = tasks.reduce((s, t) => s + (t.estimateHours ?? 4), 0) || 1;
  return (overallBudget * (task.estimateHours ?? 4)) / totalEst;
}

function plannedFinish(task: TaskLike) {
  return task.dueDate ?? task.milestone?.dueDate ?? addDays(task.startDate ?? task.createdAt, 7);
}

function actualFinish(task: TaskLike) {
  if (task.status !== "DONE") return null;
  // Prefer update timestamp as completion signal from Gantt/status progress
  return task.updatedAt;
}

export function buildTrendAnalysis(input: {
  overallBudget: number;
  startDate: Date | null;
  endDate: Date | null;
  tasks: TaskLike[];
  now?: Date;
}): TrendAnalysis {
  const now = input.now ?? new Date();
  const tasks = input.tasks;
  const overallBudget = input.overallBudget || 1;

  const starts = tasks.map((t) => (t.startDate ?? t.createdAt).getTime());
  const ends = tasks.map((t) => plannedFinish(t).getTime());
  const windowStart = input.startDate
    ? new Date(input.startDate)
    : starts.length
      ? new Date(Math.min(...starts))
      : addDays(now, -14);
  const windowEnd = input.endDate
    ? new Date(input.endDate)
    : ends.length
      ? new Date(Math.max(...ends))
      : addDays(now, 28);

  const weekStarts = weeksBetween(windowStart, windowEnd);
  const total = Math.max(tasks.length, 1);

  // --- Schedule: planned vs actual completion % ---
  const schedulePoints: SchedulePoint[] = weekStarts.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);
    const plannedCount = tasks.filter((t) => plannedFinish(t).getTime() <= weekEnd.getTime()).length;
    const actualCount = tasks.filter((t) => {
      const fin = actualFinish(t);
      return fin != null && fin.getTime() <= weekEnd.getTime();
    }).length;
    const plannedPct = clamp((plannedCount / total) * 100);
    // Actual only through "now"; future weeks hold last known actual
    const actualPct =
      weekStart.getTime() > now.getTime()
        ? null
        : clamp((actualCount / total) * 100);
    return {
      week: weekLabel(weekStart),
      plannedPct,
      actualPct: actualPct ?? -1,
    };
  });

  // Forward-fill actual for chart (use null marker -1 then replace for display)
  let lastActual = 0;
  const schedule: SchedulePoint[] = schedulePoints.map((p) => {
    if (p.actualPct >= 0) lastActual = p.actualPct;
    return { week: p.week, plannedPct: p.plannedPct, actualPct: lastActual };
  });

  const plannedDoneNow = tasks.filter((t) => plannedFinish(t).getTime() <= now.getTime()).length;
  const actualDoneNow = tasks.filter((t) => t.status === "DONE").length;
  const plannedDonePct = clamp((plannedDoneNow / total) * 100);
  const actualDonePct = clamp((actualDoneNow / total) * 100);

  // Slip estimate: compare median overdue of incomplete tasks past planned finish
  const slips = tasks
    .filter((t) => t.status !== "DONE" && plannedFinish(t).getTime() < now.getTime())
    .map((t) => (now.getTime() - plannedFinish(t).getTime()) / 86400000);
  const slipDays = slips.length
    ? Math.round(slips.reduce((a, b) => a + b, 0) / slips.length)
    : actualDonePct < plannedDonePct
      ? Math.round(((plannedDonePct - actualDonePct) / 100) * ((windowEnd.getTime() - windowStart.getTime()) / 86400000) * 0.35)
      : 0;

  const scheduleNarrative =
    actualDonePct >= plannedDonePct
      ? `Schedule is on or ahead of the Gantt plan (${actualDonePct}% actual vs ${plannedDonePct}% planned complete).`
      : `Schedule is trailing the Gantt plan by about ${Math.max(slipDays, 1)} day${
          Math.max(slipDays, 1) === 1 ? "" : "s"
        } (${actualDonePct}% actual vs ${plannedDonePct}% planned).`;

  // --- Budget burn ---
  const spentToDate = Math.round(
    tasks.reduce((sum, t) => sum + taskBudgetShare(t, tasks, overallBudget) * statusBurnRatio(t.status), 0)
  );

  const elapsedDays = Math.max(1, (now.getTime() - windowStart.getTime()) / 86400000);
  const remainingDays = Math.max(0, (windowEnd.getTime() - now.getTime()) / 86400000);
  const dailyBurn = spentToDate / elapsedDays;
  // Blend completion-based and burn-rate forecasts
  const completionForecast =
    actualDonePct > 5 ? Math.round((spentToDate / (actualDonePct / 100)) * 1.02) : Math.round(overallBudget * 1.08);
  const rateForecast = Math.round(spentToDate + dailyBurn * remainingDays);
  const currentForecast = Math.round((completionForecast * 0.55 + rateForecast * 0.45) / 100) * 100;
  const varianceAmount = currentForecast - overallBudget;
  const variancePct = Math.round(((varianceAmount / overallBudget) * 1000) / 10);

  const burnPoints: BurnPoint[] = weekStarts.map((weekStart, idx) => {
    const weekEnd = addDays(weekStart, 6);
    const progress = (idx + 1) / weekStarts.length;
    const planned = Math.round(overallBudget * progress);
    const daysFromStart = Math.max(0, (Math.min(weekEnd.getTime(), now.getTime()) - windowStart.getTime()) / 86400000);
    const actual =
      weekStart.getTime() > now.getTime()
        ? null
        : Math.round(Math.min(spentToDate, dailyBurn * Math.max(daysFromStart, 1)));
    // Forecast line: planned path until now, then extrapolate to currentForecast
    const forecast =
      weekStart.getTime() <= now.getTime()
        ? actual ?? planned
        : Math.round(
            spentToDate +
              ((currentForecast - spentToDate) * (weekStart.getTime() - now.getTime())) /
                Math.max(windowEnd.getTime() - now.getTime(), 1)
          );
    return {
      week: weekLabel(weekStart),
      planned,
      actual,
      forecast: Math.max(0, forecast),
    };
  });

  const burnNarrative =
    variancePct > 2
      ? `At the current burn rate, cost is trending about ${variancePct}% over the original budget.`
      : variancePct < -2
        ? `Burn is under plan — forecast sits about ${Math.abs(variancePct)}% below the original budget.`
        : `Burn is tracking close to the original budget (within ~2%).`;

  // --- Cost by phase (planned vs actual) ---
  const phaseOrder: TrendCostPhase[] = ["Discovery", "Build", "Testing", "Deployment"];
  const phaseMap = new Map<TrendCostPhase, { planned: number; actual: number }>();
  for (const p of phaseOrder) phaseMap.set(p, { planned: 0, actual: 0 });

  for (const task of tasks) {
    const phase = costPhaseForTask(task);
    const share = taskBudgetShare(task, tasks, overallBudget);
    const row = phaseMap.get(phase)!;
    row.planned += share;
    row.actual += share * statusBurnRatio(task.status);
  }

  // Normalize planned to overall budget
  const plannedSum = [...phaseMap.values()].reduce((s, r) => s + r.planned, 0) || 1;
  const rows: PhaseCostRow[] = phaseOrder.map((phase) => {
    const r = phaseMap.get(phase)!;
    return {
      phase,
      planned: Math.round((r.planned / plannedSum) * overallBudget),
      actual: Math.round(r.actual),
    };
  });

  const hottest = [...rows].sort((a, b) => b.actual - a.actual)[0];
  const phaseNarrative = hottest
    ? `${hottest.phase} currently carries the most realized cost (${Math.round(
        (hottest.actual / Math.max(spentToDate, 1)) * 100
      )}% of spend to date), with planned vs actual shown side-by-side per phase.`
    : "Phase cost split will appear once tasks are linked to the process map.";

  return {
    schedule: {
      points: schedule,
      narrative: scheduleNarrative,
      plannedDonePct,
      actualDonePct,
      slipDays,
    },
    burn: {
      points: burnPoints,
      originalBudget: Math.round(overallBudget),
      currentForecast,
      variancePct,
      varianceAmount,
      spentToDate,
      narrative: burnNarrative,
    },
    phaseCosts: {
      rows,
      narrative: phaseNarrative,
    },
  };
}
