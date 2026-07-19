import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { createChangeRequestAction, createIssueAction, createRiskAction } from "@/app/actions";
import { ProjectTabs } from "@/components/project-tabs";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      risks: { include: { owner: true }, orderBy: { updatedAt: "desc" } },
      issues: { include: { owner: true }, orderBy: { updatedAt: "desc" } },
      changes: { include: { owner: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!project) notFound();
  const canEdit = can(session.user.role, "risk:edit");

  return (
    <div>
      <PageHeader
        title={`${project.name} · Risks, issues & changes`}
        subtitle="Track what threatens delivery and what should change before it ships."
      />
      <ProjectTabs projectId={project.id} current="risks" />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h3 className="text-lg font-medium text-white">Risks</h3>
          <div className="mt-3 space-y-3">
            {project.risks.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-100">{r.title}</div>
                  <Badge className="bg-amber-500/15 text-amber-200">{r.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">{r.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {r.status} · {r.owner?.name ?? "Unowned"}
                </p>
              </div>
            ))}
          </div>
          {canEdit ? (
            <form action={createRiskAction} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
              <input type="hidden" name="projectId" value={project.id} />
              <Input name="title" placeholder="Risk title" required />
              <Textarea name="description" rows={2} placeholder="Description" />
              <Select name="severity" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
              <Button type="submit" className="w-full">
                Add risk
              </Button>
            </form>
          ) : null}
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-white">Issues</h3>
          <div className="mt-3 space-y-3">
            {project.issues.map((i) => (
              <div key={i.id} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-100">{i.title}</div>
                  <Badge className="bg-rose-500/15 text-rose-200">{i.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">{i.description}</p>
              </div>
            ))}
          </div>
          {canEdit ? (
            <form action={createIssueAction} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
              <input type="hidden" name="projectId" value={project.id} />
              <Input name="title" placeholder="Issue title" required />
              <Textarea name="description" rows={2} />
              <Select name="priority" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
              <Button type="submit" className="w-full">
                Add issue
              </Button>
            </form>
          ) : null}
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-white">Change requests</h3>
          <div className="mt-3 space-y-3">
            {project.changes.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-100">{c.title}</div>
                  <Badge className="bg-violet-500/15 text-violet-200">{c.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">{c.description}</p>
                <p className="mt-2 text-xs text-slate-500">Impact: {c.impact || "—"}</p>
              </div>
            ))}
          </div>
          {canEdit ? (
            <form action={createChangeRequestAction} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
              <input type="hidden" name="projectId" value={project.id} />
              <Input name="title" placeholder="Change title" required />
              <Textarea name="description" rows={2} />
              <Input name="impact" placeholder="Impact summary" />
              <Button type="submit" className="w-full">
                Request change
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
