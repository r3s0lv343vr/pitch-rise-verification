import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";

export type TwinNode = LinkedTaskNode & {
  /** Simulated duration used for timeline / critical-path math */
  estimateDays: number;
  x: number;
  y: number;
  /** True when the node was invented in the twin (not from live project) */
  isSynthetic: boolean;
  color: string;
};

export type TwinTeamLoad = {
  team: string;
  tasks: number;
  openTasks: number;
  capacity: number;
  overloaded: boolean;
  pressure: "low" | "balanced" | "high";
};

export type TwinBottleneck = {
  id: string;
  title: string;
  waitingDownstream: number;
  status: TaskStatusValue;
  effect: "bottleneck" | "cleared_faster" | "stable";
};

export type TwinImpact = {
  baselineDays: number;
  twinDays: number;
  timelineDeltaDays: number;
  baselineBudget: number;
  twinBudget: number;
  budgetDelta: number;
  baselineRisk: number;
  twinRisk: number;
  riskDelta: number;
  teamLoads: TwinTeamLoad[];
  bottlenecks: TwinBottleneck[];
  feasibility: "favorable" | "caution" | "unfavorable";
  summary: string;
};

const NODE_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#f472b6",
  "#c084fc",
];

export function twinStorageKey(projectId: string) {
  return `pm-digital-twin-v1:${projectId}`;
}

export function statusToDays(status: TaskStatusValue, estimateDays: number) {
  if (status === "DONE") return 0;
  if (status === "IN_REVIEW") return Math.max(0.5, estimateDays * 0.25);
  if (status === "IN_PROGRESS") return Math.max(1, estimateDays * 0.55);
  if (status === "BLOCKED") return estimateDays * 1.35;
  return estimateDays;
}

function defaultEstimate(node: LinkedTaskNode) {
  if (node.isDecision) return 1;
  if (node.isTerminal) return 1;
  if (node.status === "BLOCKED") return 5;
  return 3;
}

function layoutSeed(index: number) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return { x: 40 + col * 220, y: 40 + row * 110 };
}

export function cloneLiveNodesToTwin(nodes: LinkedTaskNode[]): TwinNode[] {
  return nodes.map((n, i) => {
    const pos = layoutSeed(i);
    return {
      ...structuredClone(n),
      estimateDays: defaultEstimate(n),
      x: pos.x,
      y: pos.y,
      isSynthetic: false,
      color: NODE_COLORS[i % NODE_COLORS.length],
    };
  });
}

export function createTwinNode(input: {
  projectId: string;
  projectName: string;
  title: string;
  team: string;
  leader: string;
  description?: string;
  estimateDays?: number;
  budgetAllocated?: number;
  x?: number;
  y?: number;
}): TwinNode {
  const id = `twin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || "Synthetic twin task (sandbox only)",
    status: "TODO",
    owner: input.leader.trim() || "Unassigned",
    ownerUsername: "",
    team: input.team.trim() || "Twin Team",
    startDate: new Date().toISOString(),
    deadline: null,
    blockers: [],
    budgetConsumed: 0,
    budgetAllocated: Math.max(0, input.budgetAllocated ?? 1500),
    downstreamImpact: [],
    linkedDocuments: [],
    linkedRisks: [],
    linkedMilestones: [],
    projectId: input.projectId,
    projectName: input.projectName,
    dependsOnIds: [],
    dependentIds: [],
    isDecision: /decision|approve/i.test(input.title),
    isTerminal: /complete|finish|close/i.test(input.title),
    wasteMinutes: 0,
    workMinutes: 0,
    isWasteHotspot: false,
    estimateDays: Math.max(0.5, input.estimateDays ?? 3),
    x: input.x ?? 80 + Math.random() * 240,
    y: input.y ?? 80 + Math.random() * 180,
    isSynthetic: true,
    color,
  };
}

function rebuildDependents(nodes: TwinNode[]): TwinNode[] {
  const dependents = new Map<string, string[]>();
  for (const n of nodes) {
    for (const dep of n.dependsOnIds) {
      const list = dependents.get(dep) ?? [];
      list.push(n.id);
      dependents.set(dep, list);
    }
  }
  return nodes.map((n) => {
    const dependentIds = dependents.get(n.id) ?? [];
    return {
      ...n,
      dependentIds,
      downstreamImpact: dependentIds
        .map((id) => nodes.find((x) => x.id === id)?.title)
        .filter(Boolean) as string[],
      blockers: n.dependsOnIds
        .map((id) => nodes.find((x) => x.id === id))
        .filter((d) => d && d.status !== "DONE")
        .map((d) => `Waiting on: ${d!.title}`),
    };
  });
}

export function connectTwinNodes(nodes: TwinNode[], fromId: string, toId: string): TwinNode[] {
  if (fromId === toId) return nodes;
  const next = nodes.map((n) => {
    if (n.id !== toId) return n;
    if (n.dependsOnIds.includes(fromId)) return n;
    return { ...n, dependsOnIds: [...n.dependsOnIds, fromId] };
  });
  return rebuildDependents(next);
}

export function disconnectTwinNodes(nodes: TwinNode[], fromId: string, toId: string): TwinNode[] {
  const next = nodes.map((n) => {
    if (n.id !== toId) return n;
    return { ...n, dependsOnIds: n.dependsOnIds.filter((id) => id !== fromId) };
  });
  return rebuildDependents(next);
}

export function removeTwinNode(nodes: TwinNode[], id: string): TwinNode[] {
  const filtered = nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      dependsOnIds: n.dependsOnIds.filter((d) => d !== id),
    }));
  return rebuildDependents(filtered);
}

function longestPathDays(nodes: TwinNode[]) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, number>();

  function dfs(id: string, stack = new Set<string>()): number {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return 0;
    const node = byId[id];
    if (!node) return 0;
    stack.add(id);
    const own = statusToDays(node.status, node.estimateDays);
    const upstream = node.dependsOnIds.length
      ? Math.max(...node.dependsOnIds.map((d) => dfs(d, stack)))
      : 0;
    stack.delete(id);
    const total = own + upstream;
    memo.set(id, total);
    return total;
  }

  let max = 0;
  for (const n of nodes) max = Math.max(max, dfs(n.id));
  return Math.round(max * 10) / 10;
}

function riskScore(nodes: TwinNode[]) {
  let score = 0;
  for (const n of nodes) {
    if (n.status === "BLOCKED") score += 18;
    else if (n.status === "IN_REVIEW") score += 4;
    else if (n.status === "TODO" && n.dependsOnIds.length > 2) score += 6;
    score += n.linkedRisks.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").length * 3;
  }
  return Math.min(100, score);
}

function teamLoads(nodes: TwinNode[], baseline?: TwinNode[]): TwinTeamLoad[] {
  const teams = Array.from(new Set(nodes.map((n) => n.team)));
  const baselineCount = new Map<string, number>();
  for (const n of baseline ?? []) {
    baselineCount.set(n.team, (baselineCount.get(n.team) ?? 0) + 1);
  }
  return teams.map((team) => {
    const tasks = nodes.filter((n) => n.team === team);
    const openTasks = tasks.filter((n) => n.status !== "DONE").length;
    const capacity = 4; // soft capacity per team for sandbox pressure
    const overloaded = openTasks > capacity;
    const before = baselineCount.get(team) ?? 0;
    const pressure: TwinTeamLoad["pressure"] = overloaded
      ? "high"
      : openTasks <= Math.max(1, capacity - 2)
        ? "low"
        : "balanced";
    void before;
    return { team, tasks: tasks.length, openTasks, capacity, overloaded, pressure };
  });
}

function bottlenecks(baseline: TwinNode[], twin: TwinNode[]): TwinBottleneck[] {
  const baseWaiting = new Map<string, number>();
  for (const n of baseline) {
    baseWaiting.set(n.id, n.dependentIds.filter((id) => {
      const d = baseline.find((x) => x.id === id);
      return d && d.status !== "DONE";
    }).length);
  }

  return twin
    .map((n) => {
      const waitingDownstream = n.dependentIds.filter((id) => {
        const d = twin.find((x) => x.id === id);
        return d && d.status !== "DONE";
      }).length;
      const before = baseWaiting.get(n.id) ?? 0;
      let effect: TwinBottleneck["effect"] = "stable";
      if (waitingDownstream > before + 0) effect = "bottleneck";
      if (n.status === "DONE" || waitingDownstream < before) effect = "cleared_faster";
      if (n.isSynthetic && waitingDownstream > 0) effect = "bottleneck";
      return {
        id: n.id,
        title: n.title,
        waitingDownstream,
        status: n.status,
        effect,
      };
    })
    .filter((b) => b.waitingDownstream > 0 || b.effect !== "stable")
    .sort((a, b) => b.waitingDownstream - a.waitingDownstream)
    .slice(0, 8);
}

export function computeTwinImpact(baseline: TwinNode[], twin: TwinNode[]): TwinImpact {
  const baselineDays = longestPathDays(baseline);
  const twinDays = longestPathDays(twin);
  const baselineBudget = baseline.reduce((s, n) => s + n.budgetAllocated, 0);
  const twinBudget = twin.reduce((s, n) => s + n.budgetAllocated, 0);
  const baselineRisk = riskScore(baseline);
  const twinRisk = riskScore(twin);
  const loads = teamLoads(twin, baseline);
  const bn = bottlenecks(baseline, twin);

  const timelineDeltaDays = Math.round((twinDays - baselineDays) * 10) / 10;
  const budgetDelta = Math.round(twinBudget - baselineBudget);
  const riskDelta = twinRisk - baselineRisk;
  const overloadCount = loads.filter((l) => l.overloaded).length;
  const newBottlenecks = bn.filter((b) => b.effect === "bottleneck").length;
  const cleared = bn.filter((b) => b.effect === "cleared_faster").length;

  let feasibility: TwinImpact["feasibility"] = "favorable";
  if (timelineDeltaDays > 2 || budgetDelta > 3000 || overloadCount > 0 || riskDelta > 8) {
    feasibility = "caution";
  }
  if (timelineDeltaDays > 5 || budgetDelta > 8000 || overloadCount > 1 || riskDelta > 15 || newBottlenecks >= 3) {
    feasibility = "unfavorable";
  }
  if (timelineDeltaDays <= 0 && budgetDelta <= 0 && overloadCount === 0 && riskDelta <= 0) {
    feasibility = "favorable";
  }

  const parts: string[] = [];
  if (timelineDeltaDays > 0) parts.push(`timeline stretches ~${timelineDeltaDays} day(s)`);
  else if (timelineDeltaDays < 0) parts.push(`timeline may compress ~${Math.abs(timelineDeltaDays)} day(s)`);
  else parts.push("timeline length stays similar");

  if (budgetDelta > 0) parts.push(`budget pressure +${budgetDelta}`);
  else if (budgetDelta < 0) parts.push(`budget relief ${budgetDelta}`);
  else parts.push("budget allocation unchanged");

  if (overloadCount) parts.push(`${overloadCount} team(s) look overloaded`);
  else parts.push("team load stays within soft capacity");

  if (newBottlenecks) parts.push(`${newBottlenecks} downstream bottleneck signal(s)`);
  if (cleared) parts.push(`${cleared} path(s) clear faster`);

  return {
    baselineDays,
    twinDays,
    timelineDeltaDays,
    baselineBudget: Math.round(baselineBudget),
    twinBudget: Math.round(twinBudget),
    budgetDelta,
    baselineRisk,
    twinRisk,
    riskDelta,
    teamLoads: loads,
    bottlenecks: bn,
    feasibility,
    summary: parts.join(" · "),
  };
}

export function serializeTwin(nodes: TwinNode[]) {
  return JSON.stringify(nodes);
}

export function parseTwin(raw: string | null): TwinNode[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TwinNode[];
    if (!Array.isArray(parsed)) return null;
    return rebuildDependents(parsed);
  } catch {
    return null;
  }
}
