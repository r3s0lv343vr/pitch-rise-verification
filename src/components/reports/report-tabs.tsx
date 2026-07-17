import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { slug: "trend-analysis", label: "Trend Analysis" },
  { slug: "", label: "Insights" },
] as const;

export function ReportTabs({
  reportId,
  current,
}: {
  reportId: string;
  current: "" | "trend-analysis";
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
      {tabs.map((tab) => {
        const href = tab.slug ? `/reports/${reportId}/${tab.slug}` : `/reports/${reportId}`;
        const active = current === tab.slug;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
