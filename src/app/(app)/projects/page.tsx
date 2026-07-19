import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { createProjectAction } from "@/app/actions";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { formatCurrency } from "@/lib/utils";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; showArchived?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const showArchived = sp.showArchived === "1";

  const projects = await prisma.project.findMany({
    where: {
      archived: showArchived ? undefined : false,
      ...(sp.status ? { status: sp.status as never } : {}),
      ...(sp.q
        ? {
            OR: [
              { name: { contains: sp.q, mode: "insensitive" } },
              { description: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      owner: true,
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const canCreate = can(session.user.role, "project:create");

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Create a project and a process-map flowchart is shaped automatically (gates, team lanes, dependencies) for the Command Center."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form className="flex flex-col gap-3 sm:flex-row">
            <Input name="q" placeholder="Search projects…" defaultValue={sp.q} />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            <Link href={showArchived ? "/projects" : "/projects?showArchived=1"}>
              <Button type="button" variant="ghost">
                {showArchived ? "Hide archived" : "Show archived"}
              </Button>
            </Link>
          </form>
          <div className="mt-4 space-y-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-cyan-500/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-white">{p.name}</div>
                  <Badge className="bg-slate-800 text-slate-300">{p.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.description || "No description"}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{formatCurrency(p.overallBudget)} budget</span>
                  <span>{p._count.tasks} tasks</span>
                  <span>{p._count.members} members</span>
                  <span>Owner {p.owner.name}</span>
                </div>
              </Link>
            ))}
            {projects.length === 0 ? <p className="text-sm text-slate-500">No projects yet.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-white">New project</h2>
          <p className="mt-1 text-xs text-slate-500">
            Seeds Discover → Evaluate → Approve process nodes with Team A / Alpha / Randall-style ownership.
          </p>
          {canCreate ? (
            <form action={createProjectAction} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Project 2 Comms" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={4} />
              </div>
              <div>
                <Label htmlFor="overallBudget">Overall budget (USD)</Label>
                <Input id="overallBudget" name="overallBudget" type="number" min={0} defaultValue={10000} />
              </div>
              <Button type="submit" className="w-full">
                Create project + process map
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Your role can view projects but not create them.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
