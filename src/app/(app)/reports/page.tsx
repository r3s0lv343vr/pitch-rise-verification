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
        subtitle="Portfolio health for standups, staff smoke-tests, and operator handoff."
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
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, done, blocked, pct }) => (
              <tr key={p.id} className="border-b border-slate-900/80">
                <td className="px-2 py-3 font-medium text-slate-100">{p.name}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
