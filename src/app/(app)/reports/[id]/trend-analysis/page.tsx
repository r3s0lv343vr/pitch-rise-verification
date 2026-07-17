import { Card } from "@/components/ui/card";

/** Tab: Trend Analysis — placeholder for upcoming report content */
export default async function ReportTrendAnalysisPage() {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold text-white">Trend Analysis</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        This tab is ready for the next report view. Content will be added in a follow-up
        instruction — switch back to <span className="text-cyan-200">Insights</span> for the full
        project rollup.
      </p>
    </Card>
  );
}
