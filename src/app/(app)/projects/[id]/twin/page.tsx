import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ProjectTabs } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui/card";
import { DigitalTwinPanel } from "@/components/digital-twin/digital-twin-panel";
import { buildLinkedTaskNodes } from "@/lib/build-linked-task-nodes";

export default async function ProjectDigitalTwinPage({
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

  const nodes = buildLinkedTaskNodes(project.tasks);

  return (
    <div>
      <PageHeader
        title={`${project.name} · Digital Twin`}
        subtitle="Sandbox Process Workflow Map — explore schedule, budget, team load, and risk impact without changing the live project."
      />
      <ProjectTabs projectId={project.id} current="twin" />
      <DigitalTwinPanel
        projectId={project.id}
        projectName={project.name}
        liveNodes={nodes}
        overallBudget={project.overallBudget}
      />
    </div>
  );
}
