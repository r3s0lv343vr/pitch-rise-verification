"use server";

import { revalidatePath } from "next/cache";
import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";

/**
 * UI-only stub: flips the local `connected` flag.
 * No OAuth, webhooks, or third-party API calls are performed.
 */
export async function toggleIntegrationAction(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role, "integration:toggle")) return;
  const id = String(formData.get("id") || "");
  const connected = String(formData.get("connected") || "") === "true";
  await prisma.integration.update({ where: { id }, data: { connected: !connected } });
  revalidatePath("/settings/integrations");
}

export async function ensureIntegrationsAction() {
  const org = await prisma.organization.findFirst();
  if (!org) return;
  const providers = [
    IntegrationProvider.SLACK,
    IntegrationProvider.EMAIL,
    IntegrationProvider.CALENDAR,
    IntegrationProvider.GITHUB,
  ];
  for (const provider of providers) {
    await prisma.integration.upsert({
      where: { organizationId_provider: { organizationId: org.id, provider } },
      update: {},
      create: { organizationId: org.id, provider, connected: false },
    });
  }
}
