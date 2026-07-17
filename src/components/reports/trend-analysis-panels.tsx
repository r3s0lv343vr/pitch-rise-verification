"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Badge } from "@/components/ui/card";
import type { TrendAnalysis } from "@/lib/trend-analytics";
import { formatCurrency, cn } from "@/lib/utils";
import { CalendarClock, Flame, Layers3 } from "lucide-react";

function ChartTooltipStyle() {
  return {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 12,
  } as const;
}

export function ScheduleTrendChart({ trend }: { trend: TrendAnalysis["schedule"] }) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-cyan-300" />
        <h3 className="font-display text-base font-semibold text-white">Schedule Trend Analysis</h3>
      </div>
      <p className="text-xs text-slate-400">
        How has schedule performance evolved? Planned vs actual completion from the Gantt plan.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="bg-slate-800 text-slate-200">
          Planned complete {trend.plannedDonePct}%
        </Badge>
        <Badge className="bg-cyan-500/15 text-cyan-200">Actual complete {trend.actualDonePct}%</Badge>
        <Badge
          className={
            trend.slipDays > 0 ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"
          }
        >
          {trend.slipDays > 0 ? `~${trend.slipDays}d behind plan` : "On / ahead of plan"}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-slate-300">{trend.narrative}</p>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={ChartTooltipStyle()}
              formatter={(value, name) => [
                `${value}%`,
                name === "plannedPct" ? "Planned completion" : "Actual completion",
              ]}
            />
            <Legend
              wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
              formatter={(value) =>
                value === "plannedPct" ? "Planned (Gantt)" : "Actual"
              }
            />
            <Line
              type="monotone"
              dataKey="plannedPct"
              name="plannedPct"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualPct"
              name="actualPct"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={{ r: 3, fill: "#22d3ee" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Planned curve follows Gantt due dates; actual curve follows tasks marked Done over the same
        window.
      </p>
    </Card>
  );
}

export function BudgetBurnPanel({ burn }: { burn: TrendAnalysis["burn"] }) {
  const over = burn.varianceAmount > 0;
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-300" />
        <h3 className="font-display text-base font-semibold text-white">Budget Burn Rate</h3>
      </div>
      <p className="text-xs text-slate-400">Cost forecast based on the current spend trend.</p>

      {/* Easy-to-consume forecast strip */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Original budget
          </div>
          <div className="mt-2 font-display text-2xl font-semibold text-white">
            {formatCurrency(burn.originalBudget)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Baseline approved amount</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200/80">
            Current forecast
          </div>
          <div className="mt-2 font-display text-2xl font-semibold text-cyan-100">
            {formatCurrency(burn.currentForecast)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Spent {formatCurrency(burn.spentToDate)} so far
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4",
            over ? "border-rose-500/40 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"
          )}
        >
          <div
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              over ? "text-rose-200/80" : "text-emerald-200/80"
            )}
          >
            Variance
          </div>
          <div
            className={cn(
              "mt-2 font-display text-2xl font-semibold",
              over ? "text-rose-100" : "text-emerald-100"
            )}
          >
            {over ? "+" : ""}
            {burn.variancePct}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {over ? "+" : ""}
            {formatCurrency(burn.varianceAmount)} vs original
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{burn.narrative}</p>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={burn.points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              contentStyle={ChartTooltipStyle()}
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "planned"
                  ? "Planned burn"
                  : name === "actual"
                    ? "Actual spend"
                    : "Forecast",
              ]}
            />
            <Legend
              wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
              formatter={(value) =>
                value === "planned" ? "Planned" : value === "actual" ? "Actual" : "Forecast"
              }
            />
            <Line
              type="monotone"
              dataKey="planned"
              name="planned"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#f97316"
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 3, fill: "#f97316" }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CostByPhaseChart({ phaseCosts }: { phaseCosts: TrendAnalysis["phaseCosts"] }) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-violet-300" />
        <h3 className="font-display text-base font-semibold text-white">Cost by Phase</h3>
      </div>
      <p className="text-xs text-slate-400">
        Discovery → Build → Testing → Deployment — planned vs actual side-by-side.
      </p>

      {/* Compact phase flow chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        {phaseCosts.rows.map((row, i) => (
          <span key={row.phase} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-slate-600">→</span> : null}
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200">
              {row.phase}
            </span>
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-300">{phaseCosts.narrative}</p>

      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={phaseCosts.rows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="phase" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              contentStyle={ChartTooltipStyle()}
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "planned" ? "Planned cost" : "Actual cost",
              ]}
            />
            <Legend
              wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
              formatter={(value) => (value === "planned" ? "Planned" : "Actual")}
            />
            <Bar dataKey="planned" name="planned" fill="#64748b" radius={[8, 8, 0, 0]} />
            <Bar dataKey="actual" name="actual" fill="#22d3ee" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Grouped histogram: slate = planned allocation, cyan = realized cost to date (by task burn).
      </p>
    </Card>
  );
}

export function TrendAnalysisPanels({ trend }: { trend: TrendAnalysis }) {
  return (
    <div className="space-y-6">
      <ScheduleTrendChart trend={trend.schedule} />
      <BudgetBurnPanel burn={trend.burn} />
      <CostByPhaseChart phaseCosts={trend.phaseCosts} />
    </div>
  );
}
