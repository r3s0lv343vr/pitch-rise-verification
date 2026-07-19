import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { buildTrendAnalysis } from "@/lib/trend-analytics";
import { TrendAnalysisPanels } from "@/components/reports/trend-analysis-panels";

/** Tab: Trend Analysis — schedule, burn rate, and cost-by-phase trends */
export default async function ReportTrendAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          estimateHours: true,
          startDate: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          milestone: {
            select: {
              name: true,
              subBudget: true,
              dueDate: true,
              phase: { select: { name: true, order: true } },
            },
          },
        },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project || project.archived) {
    notFound();
  }

  const trend = buildTrendAnalysis({
    overallBudget: project.overallBudget,
    startDate: project.startDate,
    endDate: project.endDate,
    tasks: project.tasks,
  });

  return <TrendAnalysisPanels trend={trend} />;
}
