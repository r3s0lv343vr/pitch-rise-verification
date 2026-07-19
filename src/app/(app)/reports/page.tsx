import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  await requireSession();
  const projects = await prisma.project.findMany({
    where: { archived: false },
    include: {
      tasks: true,
      risks: true,
      milestones: true,
      owner: true,
    },
    orderBy: { name: "asc" },
  });

  const rows = projects.map((p) => {
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const blocked = p.tasks.filter((t) => t.status === "BLOCKED").length;
    const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
    return { p, done, blocked, pct };
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Portfolio health for standups, staff smoke-tests, and operator handoff. Click a row for owner, team, budget, time, and risk review."
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-3">Project</th>
              <th className="px-2 py-3">Owner</th>
              <th className="px-2 py-3">Budget</th>
              <th className="px-2 py-3">Tasks</th>
              <th className="px-2 py-3">Blocked</th>
              <th className="px-2 py-3">Risks</th>
              <th className="px-2 py-3">Progress</th>
              <th className="px-2 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, done, blocked, pct }) => (
              <tr key={p.id} className="border-b border-slate-900/80 hover:bg-slate-900/60">
                <td className="px-2 py-3 font-medium text-slate-100">
                  <Link href={`/reports/${p.id}`} className="hover:text-cyan-200 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-2 py-3 text-slate-400">{p.owner.name}</td>
                <td className="px-2 py-3 text-slate-300">{formatCurrency(p.overallBudget)}</td>
                <td className="px-2 py-3 text-slate-300">
                  {done}/{p.tasks.length}
                </td>
                <td className="px-2 py-3 text-slate-300">{blocked}</td>
                <td className="px-2 py-3 text-slate-300">{p.risks.length}</td>
                <td className="px-2 py-3">
                  <Badge className="bg-cyan-500/15 text-cyan-200">{pct}%</Badge>
                </td>
                <td className="px-2 py-3 text-right">
                  <Link
                    href={`/reports/${p.id}`}
                    className="inline-flex rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  >
                    View report →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-500">No active projects to report on.</p>
        ) : null}
      </Card>
    </div>
  );
}
