export type TimeEntryLike = {
  id: string;
  kind: "WORK" | "BREAK";
  startedAt: Date | string;
  endedAt: Date | string | null;
  projectId: string | null;
  taskId: string | null;
  userId?: string;
};

export function asDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

export function entryMinutes(entry: TimeEntryLike, now = new Date()) {
  const start = asDate(entry.startedAt).getTime();
  const end = entry.endedAt ? asDate(entry.endedAt).getTime() : now.getTime();
  return Math.max(0, (end - start) / 60000);
}

export function formatHours(minutes: number) {
  const h = minutes / 60;
  if (h >= 10) return `${Math.round(h)}h`;
  return `${Math.round(h * 10) / 10}h`;
}

/** HH:MM:SS for live clock / session timers */
export function formatClock(totalMinutes: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMinutes * 60));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export type DayProjectRow = {
  projectId: string;
  name: string;
  workMinutes: number;
  breakMinutes: number;
};

/** Worked time today, broken down per project. */
export function summarizeTodayByProject(
  entries: TimeEntryLike[],
  projectNames: Record<string, string>,
  now = new Date()
) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const byProject = new Map<string, { work: number; break: number }>();
  let workMinutes = 0;
  let breakMinutes = 0;

  for (const entry of entries) {
    const start = asDate(entry.startedAt);
    const end = entry.endedAt ? asDate(entry.endedAt) : now;
    // overlap of entry with today
    const overlapStart = Math.max(start.getTime(), dayStart.getTime());
    const overlapEnd = Math.min(end.getTime(), dayEnd.getTime());
    if (overlapEnd <= overlapStart) continue;
    const mins = (overlapEnd - overlapStart) / 60000;
    if (entry.kind === "WORK") workMinutes += mins;
    else breakMinutes += mins;
    if (!entry.projectId) continue;
    const cur = byProject.get(entry.projectId) ?? { work: 0, break: 0 };
    if (entry.kind === "WORK") cur.work += mins;
    else cur.break += mins;
    byProject.set(entry.projectId, cur);
  }

  const rows: DayProjectRow[] = Array.from(byProject.entries())
    .map(([projectId, stats]) => ({
      projectId,
      name: projectNames[projectId] || "Project",
      workMinutes: stats.work,
      breakMinutes: stats.break,
    }))
    .sort((a, b) => b.workMinutes - a.workMinutes);

  return { workMinutes, breakMinutes, rows };
}

export function summarizeTimeEntries(entries: TimeEntryLike[], now = new Date()) {
  let workMinutes = 0;
  let breakMinutes = 0;
  const byProject = new Map<string, { work: number; break: number }>();
  const byTask = new Map<string, { work: number; break: number }>();

  for (const entry of entries) {
    const mins = entryMinutes(entry, now);
    if (entry.kind === "WORK") workMinutes += mins;
    else breakMinutes += mins;

    if (entry.projectId) {
      const cur = byProject.get(entry.projectId) ?? { work: 0, break: 0 };
      if (entry.kind === "WORK") cur.work += mins;
      else cur.break += mins;
      byProject.set(entry.projectId, cur);
    }
    if (entry.taskId) {
      const cur = byTask.get(entry.taskId) ?? { work: 0, break: 0 };
      if (entry.kind === "WORK") cur.work += mins;
      else cur.break += mins;
      byTask.set(entry.taskId, cur);
    }
  }

  return {
    workMinutes,
    breakMinutes,
    byProject,
    byTask,
    openWork: entries.find((e) => e.kind === "WORK" && !e.endedAt) ?? null,
    openBreak: entries.find((e) => e.kind === "BREAK" && !e.endedAt) ?? null,
  };
}

export type DowntimeHotspot = {
  taskId: string;
  title: string;
  projectName: string;
  breakMinutes: number;
  workMinutes: number;
  status: string;
  stageHint: string;
};

export function rankDowntimeHotspots(
  nodes: {
    id: string;
    title: string;
    projectName: string;
    status: string;
    team?: string;
  }[],
  byTask: Map<string, { work: number; break: number }>
): DowntimeHotspot[] {
  return nodes
    .map((n) => {
      const stats = byTask.get(n.id) ?? { work: 0, break: 0 };
      return {
        taskId: n.id,
        title: n.title,
        projectName: n.projectName,
        breakMinutes: stats.break,
        workMinutes: stats.work,
        status: n.status,
        stageHint: n.team || "Delivery",
      };
    })
    .filter((h) => h.breakMinutes > 0 || h.status === "BLOCKED")
    .sort((a, b) => {
      const aScore = a.breakMinutes + (a.status === "BLOCKED" ? 45 : 0);
      const bScore = b.breakMinutes + (b.status === "BLOCKED" ? 45 : 0);
      return bScore - aScore;
    });
}

export type PriorityTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: string;
  dueDate: Date | string | null;
  estimateHours: number | null;
  dependentTitles: string[];
  waitingOnNames: string[];
  impactScore: number;
  bucket: "attention" | "today" | "upcoming" | "waiting";
  critical: boolean;
};

export function scoreMyWorkTasks(
  tasks: {
    id: string;
    title: string;
    status: string;
    dueDate: Date | string | null;
    estimateHours: number | null;
    project: { id: string; name: string };
    dependencies: { dependsOn: { status: string; title: string; assignee: { name: string } | null } }[];
    dependents: { task: { title: string } }[];
  }[]
): PriorityTask[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const upcomingEnd = new Date(start);
  upcomingEnd.setDate(upcomingEnd.getDate() + 4);

  return tasks
    .filter((t) => t.status !== "DONE")
    .map((t) => {
      const due = t.dueDate ? (typeof t.dueDate === "string" ? new Date(t.dueDate) : t.dueDate) : null;
      const waitingOn = t.dependencies
        .filter((d) => d.dependsOn.status !== "DONE")
        .map((d) => d.dependsOn.assignee?.name || d.dependsOn.title);
      const overdue = !!due && due < start && t.status !== "DONE";
      const dueToday = !!due && due >= start && due < end;
      const upcoming = !!due && due >= end && due < upcomingEnd;
      const blocked = t.status === "BLOCKED";
      const critical = overdue || blocked || t.dependents.length >= 2;

      let bucket: PriorityTask["bucket"] = "upcoming";
      if (overdue || blocked) bucket = "attention";
      else if (waitingOn.length) bucket = "waiting";
      else if (dueToday) bucket = "today";
      else if (upcoming) bucket = "upcoming";
      else if (t.status === "IN_PROGRESS" || t.status === "IN_REVIEW") bucket = "today";
      else bucket = "upcoming";

      let impactScore = 10;
      if (overdue) impactScore += 50;
      if (blocked) impactScore += 40;
      if (dueToday) impactScore += 25;
      if (upcoming) impactScore += 10;
      if (t.status === "IN_PROGRESS") impactScore += 15;
      impactScore += t.dependents.length * 12;
      if (waitingOn.length) impactScore -= 5;

      return {
        id: t.id,
        title: t.title,
        projectId: t.project.id,
        projectName: t.project.name,
        status: t.status,
        dueDate: t.dueDate,
        estimateHours: t.estimateHours,
        dependentTitles: t.dependents.map((d) => d.task.title),
        waitingOnNames: waitingOn,
        impactScore,
        bucket,
        critical,
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore);
}
