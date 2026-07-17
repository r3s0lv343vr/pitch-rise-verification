import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/card";
import { ReportTabsActive } from "@/components/reports/report-tabs-active";

export default async function ReportDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, archived: true },
  });

  if (!project || project.archived) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        subtitle={`Project report · ${project.status.replaceAll("_", " ")} · click-through from portfolio listings.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              ← All reports
            </Link>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center rounded-xl bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30"
            >
              Open project
            </Link>
          </div>
        }
      />

      <ReportTabsActive reportId={project.id} />

      {children}
    </div>
  );
}
