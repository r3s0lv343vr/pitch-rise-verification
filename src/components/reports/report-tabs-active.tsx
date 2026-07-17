"use client";

import { usePathname } from "next/navigation";
import { ReportTabs } from "@/components/reports/report-tabs";

export function ReportTabsActive({ reportId }: { reportId: string }) {
  const pathname = usePathname();
  const current =
    pathname?.includes(`/reports/${reportId}/trend-analysis`) ||
    pathname?.includes(`/reports/${reportId}/insights`)
      ? "trend-analysis"
      : "";
  return <ReportTabs reportId={reportId} current={current} />;
}
