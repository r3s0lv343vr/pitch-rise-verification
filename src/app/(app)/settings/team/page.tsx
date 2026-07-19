import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { roleLabel } from "@/lib/permissions";
import { Card, PageHeader, Badge } from "@/components/ui/card";

export default async function TeamPage() {
  await requireSession();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      _count: { select: { assignedTasks: true, memberships: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Team & roles"
        subtitle="Multi-user roster with role-based access. Open signup supports the full cohort."
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-3">Name</th>
              <th className="px-2 py-3">Username</th>
              <th className="px-2 py-3">Email</th>
              <th className="px-2 py-3">Role</th>
              <th className="px-2 py-3">Projects</th>
              <th className="px-2 py-3">Assignments</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-900/80">
                <td className="px-2 py-3 text-slate-100">{u.name}</td>
                <td className="px-2 py-3 text-slate-400">{u.username}</td>
                <td className="px-2 py-3 text-slate-400">{u.email}</td>
                <td className="px-2 py-3">
                  <Badge className="bg-slate-800 text-cyan-200">{roleLabel(u.role)}</Badge>
                </td>
                <td className="px-2 py-3 text-slate-300">{u._count.memberships}</td>
                <td className="px-2 py-3 text-slate-300">{u._count.assignedTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-slate-500">{users.length} accounts currently in the system.</p>
      </Card>
    </div>
  );
}
