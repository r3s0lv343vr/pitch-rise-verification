"use client";

import { useEffect, useMemo, useState } from "react";
import type { LinkedTaskNode, TaskStatusValue } from "@/lib/command-center-types";
import { STATUS_LABEL } from "@/lib/command-center-types";
import {
  cloneLiveNodesToTwin,
  computeTwinImpact,
  connectTwinNodes,
  createTwinNode,
  parseTwin,
  removeTwinNode,
  serializeTwin,
  twinStorageKey,
  type TwinNode,
} from "@/lib/digital-twin";
import { DigitalTwinCanvas } from "@/components/digital-twin/digital-twin-canvas";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, FlaskConical, GitBranch, RefreshCw, Trash2, Users } from "lucide-react";

const TEAMS = ["Team A", "Team Alpha", "Team Cascade", "Team North", "Delivery Lead", "Platform Ops"];

export function DigitalTwinPanel({
  projectId,
  projectName,
  liveNodes,
  overallBudget,
}: {
  projectId: string;
  projectName: string;
  liveNodes: LinkedTaskNode[];
  overallBudget: number;
}) {
  const [baseline, setBaseline] = useState<TwinNode[]>(() => cloneLiveNodesToTwin(liveNodes));
  const [nodes, setNodes] = useState<TwinNode[]>(() => cloneLiveNodesToTwin(liveNodes));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [hint, setHint] = useState("Sandbox only — changes never write to the live Process Workflow Map.");

  // Add-task form
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState(TEAMS[0]);
  const [customTeam, setCustomTeam] = useState("");
  const [leader, setLeader] = useState("");
  const [estimateDays, setEstimateDays] = useState("3");
  const [budget, setBudget] = useState("1500");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const saved = parseTwin(window.localStorage.getItem(twinStorageKey(projectId)));
    const fresh = cloneLiveNodesToTwin(liveNodes);
    setBaseline(fresh);
    if (saved && saved.length) {
      setNodes(saved);
      setHint("Restored your saved twin scenario for this project (still sandbox-only).");
    } else {
      setNodes(fresh);
    }
    setSelectedId(null);
    setConnectFromId(null);
    // Intentionally only when project changes — do not wipe sandbox on live refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    // Keep baseline synced to live for delta math without overwriting twin edits.
    setBaseline(cloneLiveNodesToTwin(liveNodes));
  }, [liveNodes]);

  useEffect(() => {
    window.localStorage.setItem(twinStorageKey(projectId), serializeTwin(nodes));
  }, [nodes, projectId]);

  const impact = useMemo(() => computeTwinImpact(baseline, nodes), [baseline, nodes]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const existingTeams = useMemo(
    () => Array.from(new Set([...TEAMS, ...nodes.map((n) => n.team)])),
    [nodes]
  );

  function resetToLive() {
    const fresh = cloneLiveNodesToTwin(liveNodes);
    setBaseline(fresh);
    setNodes(fresh);
    setSelectedId(null);
    setConnectFromId(null);
    setHint("Twin reset to the live project snapshot. Live map is untouched.");
  }

  function addNode() {
    if (!title.trim()) {
      setHint("Enter a task title before adding a twin node.");
      return;
    }
    const teamName = customTeam.trim() || team;
    const node = createTwinNode({
      projectId,
      projectName,
      title,
      team: teamName,
      leader: leader || "Twin lead",
      description,
      estimateDays: Number(estimateDays) || 3,
      budgetAllocated: Number(budget) || 0,
    });
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
    setTitle("");
    setDescription("");
    setCustomTeam("");
    setHint(`Added twin node “${node.title}” on ${teamName}. Drag it, then double-click to link.`);
  }

  function onDoubleClickNode(id: string) {
    if (!connectFromId) {
      setConnectFromId(id);
      setSelectedId(id);
      setHint("Connection armed. Double-click another node to create a dependency link.");
      return;
    }
    if (connectFromId === id) {
      setConnectFromId(null);
      setHint("Connection cancelled.");
      return;
    }
    setNodes((prev) => connectTwinNodes(prev, connectFromId, id));
    setConnectFromId(null);
    setHint("Linked nodes in the twin. Feasibility metrics updated.");
  }

  function updateSelected(patch: Partial<TwinNode>) {
    if (!selectedId) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)));
  }

  const feasibilityTone =
    impact.feasibility === "favorable"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : impact.feasibility === "caution"
        ? "border-amber-400/40 bg-amber-500/10 text-amber-50"
        : "border-rose-400/40 bg-rose-500/10 text-rose-50";

  return (
    <div className="space-y-4">
      <Card className="border-violet-400/30 bg-violet-500/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-violet-200">
              <FlaskConical className="h-4 w-4" />
              <h2 className="text-lg font-semibold text-white">Live Digital Twin</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-300">
              Sandbox copy of <span className="text-cyan-200">{projectName}</span>. Add/remove tasks,
              invent teams, drag nodes, and double-click to connect relationships — without changing
              the real Process Workflow Map.
            </p>
            <p className="mt-2 text-xs text-slate-500">{hint}</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={resetToLive}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reset to live project
          </Button>
        </div>
      </Card>

      <div className={`rounded-xl border px-3 py-2 text-sm ${feasibilityTone}`}>
        <span className="font-semibold uppercase tracking-wide">{impact.feasibility}</span>
        <span className="mx-2 text-white/40">·</span>
        {impact.summary}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="Timeline (critical path)"
          value={`${impact.twinDays}d`}
          delta={impact.timelineDeltaDays}
          suffix="d vs live"
        />
        <Metric
          label="Allocated budget"
          value={formatCurrency(impact.twinBudget)}
          delta={impact.budgetDelta}
          money
        />
        <Metric
          label="Risk pressure"
          value={`${impact.twinRisk}/100`}
          delta={impact.riskDelta}
          suffix=" vs live"
        />
        <Metric
          label="Project budget ceiling"
          value={formatCurrency(overallBudget)}
          delta={impact.twinBudget - overallBudget}
          money
          deltaLabel="twin alloc vs ceiling"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 xl:col-span-1">
          <h3 className="text-sm font-semibold text-white">Create twin task node</h3>
          <div>
            <Label htmlFor="twin-title">Task</Label>
            <Input
              id="twin-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Extra QA pass"
            />
          </div>
          <div>
            <Label htmlFor="twin-team">Team lane</Label>
            <Select id="twin-team" value={team} onChange={(e) => setTeam(e.target.value)}>
              {existingTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="twin-new-team">Or introduce a fresh team</Label>
            <Input
              id="twin-new-team"
              value={customTeam}
              onChange={(e) => setCustomTeam(e.target.value)}
              placeholder="New team name (sandbox only)"
            />
          </div>
          <div>
            <Label htmlFor="twin-leader">Task leader</Label>
            <Input
              id="twin-leader"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="Leader name"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="twin-days">Est. days</Label>
              <Input
                id="twin-days"
                type="number"
                min={0.5}
                step={0.5}
                value={estimateDays}
                onChange={(e) => setEstimateDays(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="twin-budget">Budget $</Label>
              <Input
                id="twin-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="twin-desc">Notes</Label>
            <Textarea
              id="twin-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="button" onClick={addNode} className="w-full">
            Add coloured node to twin map
          </Button>

          {selected ? (
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected node
              </div>
              <div className="text-sm font-medium text-white">{selected.title}</div>
              <div>
                <Label htmlFor="sel-status">Status</Label>
                <Select
                  id="sel-status"
                  value={selected.status}
                  onChange={(e) => updateSelected({ status: e.target.value as TaskStatusValue })}
                >
                  {Object.keys(STATUS_LABEL).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s as TaskStatusValue]}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  setNodes((prev) => removeTwinNode(prev, selected.id));
                  setSelectedId(null);
                  setHint(`Removed “${selected.title}” from the twin sandbox.`);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from twin
              </Button>
            </div>
          ) : null}
        </Card>

        <div className="space-y-3 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Badge className="bg-violet-500/20 text-violet-100">
              <GitBranch className="mr-1 inline h-3 w-3" />
              Double-click node A, then node B to link
            </Badge>
            <Badge className="bg-slate-800 text-slate-300">Drag nodes anywhere</Badge>
            {connectFromId ? (
              <Badge className="bg-amber-500/20 text-amber-100">Connection armed…</Badge>
            ) : null}
          </div>
          <DigitalTwinCanvas
            nodes={nodes}
            selectedId={selectedId}
            connectFromId={connectFromId}
            onSelect={setSelectedId}
            onMove={(id, x, y) =>
              setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
            }
            onDoubleClickNode={onDoubleClickNode}
            onCanvasClick={() => {
              setConnectFromId(null);
              setSelectedId(null);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2 text-white">
            <Users className="h-4 w-4 text-cyan-300" />
            <h3 className="font-semibold">Team workload (sandbox)</h3>
          </div>
          <div className="space-y-2">
            {impact.teamLoads.map((t) => (
              <div
                key={t.team}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  t.overloaded
                    ? "border-rose-400/40 bg-rose-500/10 text-rose-50"
                    : "border-slate-800 bg-slate-950/50 text-slate-200"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{t.team}</span>
                  <span>
                    {t.openTasks}/{t.capacity} open · {t.pressure}
                  </span>
                </div>
                {t.overloaded ? (
                  <p className="mt-1 text-xs text-rose-100/90">
                    May overwhelm this lane as twin workload increases.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Within soft capacity — efficiency looks sustainable in this scenario.
                  </p>
                )}
              </div>
            ))}
            {impact.teamLoads.length === 0 ? (
              <p className="text-sm text-slate-500">No teams on the twin map yet.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h3 className="font-semibold">Downstream bottlenecks vs cleared paths</h3>
          </div>
          <div className="space-y-2">
            {impact.bottlenecks.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">{b.title}</span>
                  <Badge
                    className={
                      b.effect === "bottleneck"
                        ? "bg-rose-500/20 text-rose-100"
                        : b.effect === "cleared_faster"
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "bg-slate-800 text-slate-300"
                    }
                  >
                    {b.effect === "bottleneck"
                      ? "Bottleneck risk"
                      : b.effect === "cleared_faster"
                        ? "Clears faster"
                        : "Stable"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {b.waitingDownstream} downstream open task(s) · status {STATUS_LABEL[b.status]}
                </p>
              </div>
            ))}
            {impact.bottlenecks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No strong bottleneck signals in this twin scenario.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  suffix,
  money,
  deltaLabel,
}: {
  label: string;
  value: string;
  delta: number;
  suffix?: string;
  money?: boolean;
  deltaLabel?: string;
}) {
  const positiveBad = delta > 0;
  const text =
    delta === 0
      ? "no change"
      : money
        ? `${delta > 0 ? "+" : ""}${formatCurrency(delta)}`
        : `${delta > 0 ? "+" : ""}${delta}${suffix || ""}`;
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
      <div className={`mt-1 text-xs ${positiveBad ? "text-rose-300" : delta < 0 ? "text-emerald-300" : "text-slate-500"}`}>
        {deltaLabel ? `${deltaLabel}: ` : ""}
        {text}
      </div>
    </Card>
  );
}
