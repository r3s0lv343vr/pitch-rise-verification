import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ProjectTabs } from "@/components/project-tabs";
import { ProjectProcessMap } from "@/components/project-process-map";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { buildLinkedTaskNodes } from "@/lib/build-linked-task-nodes";
import { taskStatusColors, taskStatusLabel } from "@/lib/utils";

export default async function ProjectMapPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          milestones: {
            orderBy: { order: "asc" },
            include: {
              tasks: {
                include: {
                  assignee: true,
                  dependencies: { include: { dependsOn: true } },
                  dependents: { include: { task: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
      milestones: {
        where: { phaseId: null },
        include: { tasks: true },
      },
      tasks: {
        include: {
          assignee: true,
          milestone: true,
          project: {
            include: {
              risks: { where: { status: { not: "closed" } }, take: 8 },
              milestones: true,
            },
          },
          dependencies: { include: { dependsOn: true } },
          dependents: { include: { task: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  const canEdit = can(session.user.role, "task:edit");
  const nodes = buildLinkedTaskNodes(project.tasks);
  const linkCount = project.tasks.reduce((sum, t) => sum + t.dependencies.length, 0);

  return (
    <div>
      <PageHeader
        title={`${project.name} · Project map`}
        subtitle="Phase structure plus the linked process flowchart for this project’s tasks (same source as Command Center)."
        actions={
          <Link
            href={`/dashboard?tab=process&project=${project.id}`}
            className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Open in Process Workflow Map
          </Link>
        }
      />
      <ProjectTabs projectId={project.id} current="map" />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium text-white">Linked process flowchart</h2>
            <p className="mt-1 text-xs text-slate-400">
              Shows how each task depends on others for <span className="text-cyan-200">{project.name}</span>{" "}
              only — not other projects. Edit task status here or in Command Center; both stay linked.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <Badge className="bg-slate-800 text-slate-200">{nodes.length} tasks</Badge>
            <Badge className="bg-slate-800 text-slate-200">{linkCount} dependency links</Badge>
          </div>
        </div>
        <div className="mt-4">
          {nodes.length ? (
            <ProjectProcessMap nodes={nodes} canEdit={canEdit} />
          ) : (
            <p className="text-sm text-slate-500">
              No tasks yet. Create tasks on the Overview tab (or create a project with the process
              template) to build this map.
            </p>
          )}
        </div>
      </Card>

      <div className="mb-3 text-sm font-medium text-slate-300">Phase → milestone structure</div>
      <div className="space-y-4">
        {project.phases.map((phase, idx) => {
          const tasks = phase.milestones.flatMap((m) => m.tasks);
          const done = tasks.filter((t) => t.status === "DONE").length;
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          return (
            <Card key={phase.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-cyan-300/80">Phase {idx + 1}</div>
                  <h3 className="text-lg font-medium text-white">{phase.name}</h3>
                  <p className="text-sm text-slate-400">{phase.description}</p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-200">{pct}% complete</Badge>
              </div>
              <div className="mb-4 h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {phase.milestones.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="font-medium text-slate-100">{m.name}</div>
                    <div className="mt-2 space-y-2">
                      {m.tasks.map((t) => (
                        <div key={t.id} className="space-y-1 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-300">{t.title}</span>
                            <Badge className={taskStatusColors[t.status]}>
                              {taskStatusLabel[t.status]}
                            </Badge>
                          </div>
                          {t.dependencies.length ? (
                            <p className="text-[11px] text-slate-500">
                              Depends on: {t.dependencies.map((d) => d.dependsOn.title).join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {m.tasks.length === 0 ? (
                        <p className="text-xs text-slate-500">No tasks linked</p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {phase.milestones.length === 0 ? (
                  <p className="text-sm text-slate-500">No milestones in this phase yet.</p>
                ) : null}
              </div>
            </Card>
          );
        })}

        {(project.milestones.length > 0 ||
          project.tasks.some((t) => !t.milestoneId)) && (
          <Card>
            <h3 className="mb-3 text-lg font-medium text-white">Unmapped work</h3>
            <div className="space-y-2 text-sm text-slate-300">
              {project.milestones.map((m) => (
                <div key={m.id}>Milestone: {m.name}</div>
              ))}
              {project.tasks
                .filter((t) => !t.milestoneId)
                .map((t) => (
                  <div key={t.id}>Task: {t.title}</div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
