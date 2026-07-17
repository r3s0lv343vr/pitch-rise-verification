"use client";

import { useEffect, useMemo, useState } from "react";
import { formatHours } from "@/lib/time-tracking";
import {
  STATUS_BAR,
  STATUS_LABEL,
  type LinkedTaskNode,
  type TaskStatusValue,
} from "@/lib/command-center-types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  FileText,
  Flag,
  GitBranch,
  Milestone,
  UserRound,
  Wallet,
} from "lucide-react";

const LANE_W = 148;
const COL_W = 230;
const NODE_W = 180;
const NODE_H = 76;
const NODE_GAP_Y = 14;
const LANE_PAD_Y = 28;
const DROPDOWN_H = 340;

function topologicalColumns(nodes: LinkedTaskNode[]) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();

  function getDepth(id: string, stack = new Set<string>()): number {
    if (depth.has(id)) return depth.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    const node = byId[id];
    if (!node || node.dependsOnIds.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...node.dependsOnIds.map((dep) => getDepth(dep, stack)));
    depth.set(id, d);
    return d;
  }

  nodes.forEach((n) => getDepth(n.id));
  const max = Math.max(0, ...Array.from(depth.values()));
  const columns: LinkedTaskNode[][] = Array.from({ length: max + 1 }, () => []);
  for (const n of nodes) columns[depth.get(n.id) ?? 0].push(n);
  return columns;
}

export function SwimlaneProcessMap({
  nodes,
  onStatusChange,
  canEdit,
  focusTaskId,
}: {
  nodes: LinkedTaskNode[];
  onStatusChange?: (taskId: string, status: TaskStatusValue) => void;
  canEdit?: boolean;
  focusTaskId?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (focusTaskId) setOpenId(focusTaskId);
  }, [focusTaskId]);

  const teams = useMemo(() => {
    const set = new Set(nodes.map((n) => n.team));
    return Array.from(set);
  }, [nodes]);

  const columns = useMemo(() => topologicalColumns(nodes), [nodes]);

  const laneHeights = useMemo(() => {
    const maxSlots = new Map<string, number>();
    for (const team of teams) maxSlots.set(team, 1);
    columns.forEach((colNodes) => {
      const counts = new Map<string, number>();
      for (const node of colNodes) {
        counts.set(node.team, (counts.get(node.team) ?? 0) + 1);
      }
      for (const [team, count] of counts) {
        maxSlots.set(team, Math.max(maxSlots.get(team) ?? 1, count));
      }
    });
    return teams.map((team) => {
      const slots = maxSlots.get(team) ?? 1;
      return Math.max(120, LANE_PAD_Y * 2 + slots * NODE_H + (slots - 1) * NODE_GAP_Y);
    });
  }, [columns, teams]);

  const laneTops = useMemo(() => {
    const tops: number[] = [];
    let y = 16;
    for (const h of laneHeights) {
      tops.push(y);
      y += h;
    }
    return tops;
  }, [laneHeights]);

  const positions = useMemo(() => {
    const map = new Map<
      string,
      { x: number; y: number; teamIndex: number; col: number; laneBottom: number }
    >();
    columns.forEach((colNodes, col) => {
      const usedInLane = new Map<string, number>();
      for (const node of colNodes) {
        const teamIndex = Math.max(0, teams.indexOf(node.team));
        const laneSlot = usedInLane.get(node.team) ?? 0;
        usedInLane.set(node.team, laneSlot + 1);
        const laneTop = laneTops[teamIndex] ?? 16;
        const laneH = laneHeights[teamIndex] ?? 120;
        map.set(node.id, {
          // Keep tiles clear of the sticky lane title column
          x: LANE_W + 20 + col * COL_W,
          y: laneTop + LANE_PAD_Y + laneSlot * (NODE_H + NODE_GAP_Y),
          teamIndex,
          col,
          laneBottom: laneTop + laneH,
        });
      }
    });
    return map;
  }, [columns, teams, laneTops, laneHeights]);

  const contentBottom = laneTops.length
    ? laneTops[laneTops.length - 1] + laneHeights[laneHeights.length - 1]
    : 420;
  const width = Math.max(960, LANE_W + 40 + columns.length * COL_W + 40);
  const openPos = openId ? positions.get(openId) : undefined;
  const height = contentBottom + 24 + (openPos ? DROPDOWN_H : 40);

  const edges = useMemo(() => {
    const list: { from: string; to: string }[] = [];
    for (const n of nodes) {
      for (const dep of n.dependsOnIds) {
        if (positions.has(dep) && positions.has(n.id)) list.push({ from: dep, to: n.id });
      }
    }
    return list;
  }, [nodes, positions]);

  const openNode = nodes.find((n) => n.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        {(Object.keys(STATUS_LABEL) as TaskStatusValue[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2 py-1">
            <span className={cn("h-2 w-2 rounded-full", STATUS_BAR[s])} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-rose-100">
          Vibrating ring = most downtime waste
        </span>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#020617_55%)]">
        <div className="relative" style={{ width, height }}>
          {/* swimlane bands */}
          {teams.map((team, i) => (
            <div
              key={team}
              className="absolute border-b border-slate-700/50"
              style={{
                top: laneTops[i],
                left: LANE_W,
                right: 0,
                height: laneHeights[i],
                background:
                  i % 2 === 0 ? "rgba(15,23,42,0.35)" : "rgba(2,6,23,0.15)",
              }}
            />
          ))}

          {/* sticky lane titles — always above flowchart tiles */}
          <div
            className="sticky left-0 z-40 border-r border-slate-700/80 bg-slate-950/95 shadow-[8px_0_18px_rgba(2,6,23,0.55)] backdrop-blur"
            style={{ width: LANE_W, height }}
          >
            {teams.map((team, i) => (
              <div
                key={team}
                className="absolute flex items-center border-b border-slate-700/50 px-3"
                style={{ top: laneTops[i], height: laneHeights[i], width: LANE_W }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200/95">
                  {team}
                </span>
              </div>
            ))}
          </div>

          <svg
            className="pointer-events-none absolute inset-0 z-10"
            width={width}
            height={height}
          >
            {edges.map((e) => {
              const a = positions.get(e.from)!;
              const b = positions.get(e.to)!;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke="rgba(148,163,184,0.55)"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrow)"
                />
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(148,163,184,0.8)" />
              </marker>
            </defs>
          </svg>

          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const open = openId === node.id;
            const spaceBelow = height - (pos.y + NODE_H);
            const openUpward = open && spaceBelow < DROPDOWN_H - 20;
            const nearRight = pos.x + 280 > width - 16;

            return (
              <div
                key={node.id}
                className={cn("absolute", open ? "z-50" : "z-20")}
                style={{ left: pos.x, top: pos.y, width: NODE_W }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : node.id)}
                  className={cn(
                    "relative z-[1] w-full rounded-xl border px-3 py-2 text-left shadow-lg transition",
                    node.isDecision
                      ? "border-emerald-400/40 bg-slate-100 text-slate-900"
                      : node.isTerminal
                        ? "border-sky-300/50 bg-sky-500/20 text-white"
                        : "border-violet-400/40 bg-violet-700/80 text-white",
                    open && "ring-2 ring-cyan-300",
                    node.isWasteHotspot && "waste-hotspot"
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-[12px] font-semibold leading-snug">{node.title}</div>
                    <ChevronDown
                      className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 transition", open && "rotate-180")}
                    />
                  </div>
                  <div
                    className={cn("mt-1 text-[10px]", node.isDecision ? "text-slate-600" : "text-white/80")}
                  >
                    {STATUS_LABEL[node.status]} · {node.owner}
                  </div>
                  {node.wasteMinutes > 0 ? (
                    <div
                      className={cn(
                        "mt-1 text-[10px] font-semibold",
                        node.isWasteHotspot
                          ? node.isDecision
                            ? "text-rose-700"
                            : "text-rose-200"
                          : node.isDecision
                            ? "text-amber-700"
                            : "text-amber-200"
                      )}
                    >
                      {node.isWasteHotspot ? "⚠ Most downtime · " : "Downtime "}
                      {formatHours(node.wasteMinutes)}
                    </div>
                  ) : null}
                  <div className={cn("mt-2 h-1.5 w-full rounded-full", STATUS_BAR[node.status])} />
                </button>

                {open ? (
                  <div
                    className={cn(
                      "absolute z-[60] w-[280px] rounded-xl border border-slate-600 bg-slate-950 p-3 shadow-2xl ring-1 ring-cyan-400/20",
                      openUpward ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
                      nearRight ? "right-0" : "left-0"
                    )}
                  >
                    <DropdownDetails node={node} />
                    {canEdit && onStatusChange ? (
                      <div className="mt-3 border-t border-slate-800 pt-3">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Move status (updates Overview + Kanban + Gantt)
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                          value={node.status}
                          onChange={(e) => onStatusChange(node.id, e.target.value as TaskStatusValue)}
                        >
                          {(Object.keys(STATUS_LABEL) as TaskStatusValue[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {openNode ? (
        <p className="text-xs text-slate-500">
          Open dropdown for <span className="text-slate-300">{openNode.title}</span> — click the node again to
          close.
        </p>
      ) : (
        <p className="text-xs text-slate-500">Click any node for an instant dropdown of ownership and impact.</p>
      )}
    </div>
  );
}

function DropdownDetails({ node }: { node: LinkedTaskNode }) {
  return (
    <div className="space-y-2 text-xs text-slate-300">
      <Row icon={UserRound} label="Owner" value={`${node.owner} · ${node.team}`} />
      <Row icon={CalendarClock} label="Deadline" value={formatDate(node.deadline)} />
      <Row
        icon={AlertTriangle}
        label="Blockers"
        value={node.blockers.length ? node.blockers.join("; ") : "None"}
      />
      <Row
        icon={AlertTriangle}
        label="Downtime / breaks"
        value={
          node.wasteMinutes > 0
            ? `${formatHours(node.wasteMinutes)} attributed${node.isWasteHotspot ? " · PRIMARY WASTE HOTSPOT" : ""}`
            : "None logged"
        }
      />
      <Row
        icon={Wallet}
        label="Budget consumed"
        value={`${formatCurrency(node.budgetConsumed)} / ${formatCurrency(node.budgetAllocated)}`}
      />
      <Row
        icon={GitBranch}
        label="Downstream impact"
        value={node.downstreamImpact.length ? node.downstreamImpact.join("; ") : "None"}
      />
      <Row icon={FileText} label="Linked documents" value={node.linkedDocuments.join("; ")} />
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <Flag className="h-3 w-3" /> Linked risks
        </div>
        {node.linkedRisks.length ? (
          <ul className="space-y-1">
            {node.linkedRisks.map((r) => (
              <li key={r.id} className="rounded bg-slate-900 px-2 py-1">
                {r.title} <span className="text-amber-300">({r.severity})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">None</p>
        )}
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <Milestone className="h-3 w-3" /> Linked milestones
        </div>
        {node.linkedMilestones.length ? (
          <ul className="space-y-1">
            {node.linkedMilestones.map((m) => (
              <li key={m.id} className="rounded bg-slate-900 px-2 py-1">
                {m.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">None</p>
        )}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p>{value}</p>
    </div>
  );
}
