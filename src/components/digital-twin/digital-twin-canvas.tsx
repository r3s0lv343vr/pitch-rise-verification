"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TwinNode } from "@/lib/digital-twin";
import { STATUS_BAR, STATUS_LABEL } from "@/lib/command-center-types";
import { cn } from "@/lib/utils";

const NODE_W = 188;
const NODE_H = 86;

export function DigitalTwinCanvas({
  nodes,
  selectedId,
  connectFromId,
  onSelect,
  onMove,
  onDoubleClickNode,
  onCanvasClick,
}: {
  nodes: TwinNode[];
  selectedId: string | null;
  connectFromId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDoubleClickNode: (id: string) => void;
  onCanvasClick: () => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const bounds = useMemo(() => {
    const maxX = Math.max(900, ...nodes.map((n) => n.x + NODE_W + 80));
    const maxY = Math.max(520, ...nodes.map((n) => n.y + NODE_H + 80));
    return { width: maxX, height: maxY };
  }, [nodes]);

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const edges = useMemo(() => {
    const list: { from: TwinNode; to: TwinNode }[] = [];
    for (const n of nodes) {
      for (const dep of n.dependsOnIds) {
        const from = byId[dep];
        if (from) list.push({ from, to: n });
      }
    }
    return list;
  }, [nodes, byId]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const node = byId[id];
      if (!node || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      dragRef.current = {
        id,
        ox: e.clientX - rect.left - node.x,
        oy: e.clientY - rect.top - node.y,
      };
      setDragId(id);
      onSelect(id);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [byId, onSelect]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.max(8, e.clientX - rect.left - dragRef.current.ox);
      const y = Math.max(8, e.clientY - rect.top - dragRef.current.oy);
      onMove(dragRef.current.id, x, y);
    },
    [onMove]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setDragId(null);
  }, []);

  return (
    <div
      ref={boardRef}
      className="relative overflow-auto rounded-2xl border border-violet-400/30 bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#020617_55%)]"
      style={{ minHeight: 520 }}
      onClick={() => onCanvasClick()}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="relative" style={{ width: bounds.width, height: bounds.height }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {edges.map(({ from, to }) => {
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`${from.id}-${to.id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke="rgba(167,139,250,0.7)"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#twin-arrow)"
              />
            );
          })}
          <defs>
            <marker id="twin-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(167,139,250,0.9)" />
            </marker>
          </defs>
        </svg>

        {nodes.map((node) => {
          const selected = selectedId === node.id;
          const connecting = connectFromId === node.id;
          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => onPointerDown(e, node.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClickNode(node.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute select-none rounded-xl border px-2.5 py-2 shadow-lg backdrop-blur transition",
                dragId === node.id ? "cursor-grabbing" : "cursor-grab",
                selected ? "ring-2 ring-white/80" : "",
                connecting ? "ring-2 ring-amber-300" : "",
                node.isSynthetic ? "border-violet-300/80" : "border-slate-600"
              )}
              style={{
                left: node.x,
                top: node.y,
                width: NODE_W,
                minHeight: NODE_H,
                background: `linear-gradient(160deg, ${node.color}33, rgba(2,6,23,0.92))`,
              }}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", STATUS_BAR[node.status])} />
                <span className="truncate text-[11px] font-semibold text-white">{node.title}</span>
              </div>
              <div className="text-[10px] text-slate-300">
                {node.team} · {node.owner}
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                <span>{STATUS_LABEL[node.status]}</span>
                <span>· {node.estimateDays}d</span>
                {node.isSynthetic ? (
                  <span className="rounded bg-violet-500/30 px-1 text-violet-100">twin</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
