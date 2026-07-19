import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ensureIntegrationsAction, toggleIntegrationAction } from "@/app/actions";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function IntegrationsPage() {
  const session = await requireSession();
  await ensureIntegrationsAction();
  const integrations = await prisma.integration.findMany({ orderBy: { provider: "asc" } });
  const canToggle = can(session.user.role, "integration:toggle");

  const copy: Record<string, string> = {
    SLACK: "Announce deadlines and assignment pings. Phase 1 stub — Connect only flips local UI state.",
    EMAIL: "Digest and assignment mailers. Phase 1 stub — no outbound email is sent.",
    CALENDAR: "Sync milestone due dates. Phase 1 stub — no calendar provider is called.",
    GITHUB: "Link tasks to issues/PRs. Phase 1 stub — reserved for Phase 2+ OAuth.",
  };

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Non-functional stubs for the cohort demo. Toggles persist a local Connected flag only — no OAuth or third-party sync."
      />
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <strong className="font-medium">Stub notice:</strong> Slack, Email, Calendar, and GitHub
        connectors are disclosed as UI-only. They do not authenticate with external services in
        Phase 1.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => (
          <Card key={i.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-white">{i.provider}</h3>
                <p className="mt-1 text-sm text-slate-400">{copy[i.provider]}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-amber-500/15 text-amber-100">UI stub</Badge>
                <Badge className={i.connected ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800 text-slate-400"}>
                  {i.connected ? "Stub · Connected" : "Stub · Not connected"}
                </Badge>
              </div>
            </div>
            {canToggle ? (
              <form action={toggleIntegrationAction} className="mt-4">
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="connected" value={String(i.connected)} />
                <Button type="submit" variant={i.connected ? "secondary" : "primary"}>
                  {i.connected ? "Disconnect (stub)" : "Connect (stub)"}
                </Button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Only Admin can toggle integration stubs.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
