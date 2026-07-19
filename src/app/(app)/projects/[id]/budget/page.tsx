import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { updateBudgetAction, updateMilestoneBudgetAction } from "@/app/actions";
import { ProjectTabs } from "@/components/project-tabs";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { formatCurrency } from "@/lib/utils";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      allocations: { include: { resource: true, user: true } },
    },
  });
  if (!project) notFound();

  const allocated = project.milestones.reduce((sum, m) => sum + m.subBudget, 0);
  const remaining = project.overallBudget - allocated;
  const canEdit = can(session.user.role, "budget:edit");

  return (
    <div>
      <PageHeader
        title={`${project.name} · Budget & resources`}
        subtitle="Overall budget with milestone sub-budgets and resource allocations."
      />
      <ProjectTabs projectId={project.id} current="budget" />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase text-slate-500">Overall budget</div>
          <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(project.overallBudget)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Milestone allocated</div>
          <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(allocated)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-slate-500">Remaining</div>
          <div className={`mt-2 text-2xl font-semibold ${remaining < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {formatCurrency(remaining)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-medium text-white">Overall budget</h3>
          {canEdit ? (
            <form action={updateBudgetAction} className="flex gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <Input name="overallBudget" type="number" defaultValue={project.overallBudget} />
              <Button type="submit">Save</Button>
            </form>
          ) : (
            <p className="text-sm text-slate-400">View only for your role.</p>
          )}

          <h3 className="mb-3 mt-6 text-lg font-medium text-white">Milestone sub-budgets</h3>
          <div className="space-y-3">
            {project.milestones.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-100">{m.name}</div>
                  <Badge className="bg-slate-800 text-slate-300">{formatCurrency(m.subBudget)}</Badge>
                </div>
                {canEdit ? (
                  <form action={updateMilestoneBudgetAction} className="flex gap-2">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <Input id={`mb-${m.id}`} name="subBudget" type="number" defaultValue={m.subBudget} aria-label="Sub-budget" />
                    <Button type="submit" variant="secondary" size="sm">
                      Update
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-medium text-white">Resource allocations</h3>
          <div className="space-y-3">
            {project.allocations.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-800 p-3 text-sm">
                <div className="font-medium text-white">{a.resource.name}</div>
                <div className="text-slate-400">
                  {a.hours}h · {a.user?.name ?? "Pool"} · {a.notes || "No notes"}
                </div>
              </div>
            ))}
            {project.allocations.length === 0 ? (
              <p className="text-sm text-slate-500">No allocations yet. Seed data or add via admin ops later.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
