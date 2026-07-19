"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatHours } from "@/lib/time-tracking";

const COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#60a5fa"];

type StageRow = {
  stage: string;
  budget: number;
  timeMinutes: number;
  riskScore: number;
};

function ShortAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  const short = label.length > 16 ? `${label.slice(0, 14)}…` : label;
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="#94a3b8" fontSize={11}>
      {short}
    </text>
  );
}

export function BudgetBreakdownCharts({ stages }: { stages: StageRow[] }) {
  const data = stages.map((s) => ({ name: s.stage, value: Math.round(s.budget) }));
  const top = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <Card className="p-4">
      <h3 className="font-display text-base font-semibold text-white">Budget Breakdown</h3>
      <p className="mt-1 text-xs text-slate-400">
        Which part of the work process carries the most cost
        {top ? (
          <>
            {" "}
            — currently <span className="text-cyan-200">{top.name}</span> ({formatCurrency(top.value)})
          </>
        ) : null}
        .
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={<ShortAxisTick />} interval={0} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
              <Bar dataKey="value" name="Budget" radius={[8, 8, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

export function TimeChart({ stages }: { stages: StageRow[] }) {
  const data = stages.map((s) => ({
    name: s.stage,
    hours: Math.round((s.timeMinutes / 60) * 10) / 10,
  }));
  const top = [...data].sort((a, b) => b.hours - a.hours)[0];

  return (
    <Card className="p-4">
      <h3 className="font-display text-base font-semibold text-white">Time Chart</h3>
      <p className="mt-1 text-xs text-slate-400">
        Which part of the project carried the most time
        {top ? (
          <>
            {" "}
            — peak in <span className="text-cyan-200">{top.name}</span> ({formatHours(top.hours * 60)})
          </>
        ) : null}
        .
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={<ShortAxisTick />} interval={0} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} unit="h" />
            <Tooltip
              contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }}
              formatter={(value) => [`${value}h`, "Time"]}
            />
            <Bar dataKey="hours" name="Hours" fill="#22d3ee" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RisksChart({ stages }: { stages: StageRow[] }) {
  const data = stages.map((s) => ({ name: s.stage, score: Math.round(s.riskScore) }));
  const top = [...data].sort((a, b) => b.score - a.score)[0];

  return (
    <Card className="p-4">
      <h3 className="font-display text-base font-semibold text-white">Risks by Process Stage</h3>
      <p className="mt-1 text-xs text-slate-400">
        Pinpoint which part of the work process carried the greatest risk
        {top ? (
          <>
            {" "}
            — highest pressure in <span className="text-rose-200">{top.name}</span>
          </>
        ) : null}
        .
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={<ShortAxisTick />} interval={0} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }}
              formatter={(value) => [value, "Risk score"]}
            />
            <Bar dataKey="score" name="Risk score" fill="#f87171" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
