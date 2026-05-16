"use server"

import { revalidatePath } from "next/cache"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

export async function disconnectIntegration(connectionId: string) {
  const { organizationId } = await withAuth({ ensureSignedIn: true })
  if (!organizationId) {
    throw new Error("You must belong to an organization.")
  }
  const result = await prisma.integrationConnection.deleteMany({
    where: { id: connectionId, organizationId },
  })
  revalidatePath("/dashboard/integrations")
  return { deleted: result.count }
}
