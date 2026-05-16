"use server"

import { revalidatePath } from "next/cache"

import { logAudit } from "@/lib/audit"
import { requireOrgContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function disconnectIntegration(connectionId: string) {
  const { organizationId } = await requireOrgContext()
  const target = await prisma.integrationConnection.findFirst({
    where: { id: connectionId, organizationId },
    select: { id: true, providerId: true, accountLogin: true },
  })
  const result = await prisma.integrationConnection.deleteMany({
    where: { id: connectionId, organizationId },
  })
  if (target) {
    await logAudit({
      action: "integration.disconnected",
      targetType: "integration_connection",
      targetId: target.id,
      targetLabel: target.accountLogin
        ? `${target.providerId} (@${target.accountLogin})`
        : target.providerId,
    })
  }
  revalidatePath("/dashboard/integrations")
  return { deleted: result.count }
}
