"use client";

import { usePathname } from "next/navigation";
import { ReportTabs } from "@/components/reports/report-tabs";

export function ReportTabsActive({ reportId }: { reportId: string }) {
  const pathname = usePathname();
  const current = pathname?.includes(`/reports/${reportId}/insights`) ? "insights" : "";
  return <ReportTabs reportId={reportId} current={current} />;
}
