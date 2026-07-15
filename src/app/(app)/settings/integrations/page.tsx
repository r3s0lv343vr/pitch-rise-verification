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
    SLACK: "Announce deadlines and assignment pings (stub — connect toggles UI state).",
    EMAIL: "Digest and assignment mailers (stub).",
    CALENDAR: "Sync milestone due dates (stub).",
    GITHUB: "Link tasks to issues/PRs (stub with roadmap for Phase 2+).",
  };

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Stubbed connectors for the cohort stack. Real OAuth can land after ballot cutover."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => (
          <Card key={i.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-white">{i.provider}</h3>
                <p className="mt-1 text-sm text-slate-400">{copy[i.provider]}</p>
              </div>
              <Badge className={i.connected ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800 text-slate-400"}>
                {i.connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            {canToggle ? (
              <form action={toggleIntegrationAction} className="mt-4">
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="connected" value={String(i.connected)} />
                <Button type="submit" variant={i.connected ? "secondary" : "primary"}>
                  {i.connected ? "Disconnect" : "Connect"}
                </Button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Only Admin can toggle integrations.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
