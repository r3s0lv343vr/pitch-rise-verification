import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate, taskStatusLabel } from "@/lib/utils";
import type { PriorityTask } from "@/lib/time-tracking";
import { cn } from "@/lib/utils";

const columns: {
  key: PriorityTask["bucket"];
  title: string;
  emoji: string;
  hint: string;
  tone: string;
}[] = [
  {
    key: "attention",
    title: "Needs Attention",
    emoji: "🔴",
    hint: "Overdue · Blocked · Critical",
    tone: "border-rose-500/40 bg-rose-500/5",
  },
  {
    key: "today",
    title: "Today",
    emoji: "🟡",
    hint: "Tasks due today",
    tone: "border-amber-500/40 bg-amber-500/5",
  },
  {
    key: "upcoming",
    title: "Upcoming",
    emoji: "🟢",
    hint: "Next few days",
    tone: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    key: "waiting",
    title: "Waiting",
    emoji: "⚪",
    hint: "Waiting on someone else",
    tone: "border-slate-500/40 bg-slate-500/5",
  },
];

export function TaskReminderBoard({ tasks }: { tasks: PriorityTask[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.bucket === col.key);
        return (
          <Card key={col.key} className={cn("p-3", col.tone)}>
            <div className="mb-1 text-sm font-semibold text-white">
              {col.emoji} {col.title}
            </div>
            <div className="mb-3 text-[11px] text-slate-400">{col.hint}</div>
            <div className="space-y-2">
              {items.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}`}
                  className={cn(
                    "block rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 hover:border-cyan-500/30",
                    t.critical && "impact-critical"
                  )}
                >
                  <div className="text-sm font-medium text-white">{t.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {t.projectName} · {taskStatusLabel[t.status] ?? t.status}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">Due {formatDate(t.dueDate)}</div>
                </Link>
              ))}
              {items.length === 0 ? <p className="text-xs text-slate-600">None</p> : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
