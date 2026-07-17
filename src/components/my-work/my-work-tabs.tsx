"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Personal Overview" },
  { id: "assignments", label: "Assignments" },
] as const;

export type MyWorkTabId = (typeof tabs)[number]["id"];

export function MyWorkTabs({
  overview,
  assignments,
  initialTab = "overview",
}: {
  overview: React.ReactNode;
  assignments: React.ReactNode;
  initialTab?: MyWorkTabId;
}) {
  const [tab, setTab] = useState<MyWorkTabId>(initialTab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? overview : assignments}
    </div>
  );
}
