import { redirect } from "next/navigation";

/** Keep old Insights URL working — now Trend Analysis */
export default async function ReportInsightsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/reports/${id}/trend-analysis`);
}
