import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ProjectTabs } from "@/components/project-tabs";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { taskStatusColors, taskStatusLabel } from "@/lib/utils";

export default async function ProjectMapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          milestones: {
            orderBy: { order: "asc" },
            include: { tasks: { include: { assignee: true } } },
          },
        },
      },
      milestones: {
        where: { phaseId: null },
        include: { tasks: true },
      },
      tasks: { where: { milestoneId: null } },
    },
  });
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title={`${project.name} · Project map`}
        subtitle="Phases → milestones → tasks → completion. The whole path to done, laid out."
      />
      <ProjectTabs projectId={project.id} current="map" />

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
                        <div key={t.id} className="flex items-start justify-between gap-2 text-sm">
                          <span className="text-slate-300">{t.title}</span>
                          <Badge className={taskStatusColors[t.status]}>{taskStatusLabel[t.status]}</Badge>
                        </div>
                      ))}
                      {m.tasks.length === 0 ? <p className="text-xs text-slate-500">No tasks linked</p> : null}
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

        {(project.milestones.length > 0 || project.tasks.length > 0) && (
          <Card>
            <h3 className="mb-3 text-lg font-medium text-white">Unmapped work</h3>
            <div className="space-y-2 text-sm text-slate-300">
              {project.milestones.map((m) => (
                <div key={m.id}>Milestone: {m.name}</div>
              ))}
              {project.tasks.map((t) => (
                <div key={t.id}>Task: {t.title}</div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
