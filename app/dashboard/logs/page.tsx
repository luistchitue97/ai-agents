import { notFound } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

import { AuditLogView } from "./logs-view"

export default async function AuditLogPage() {
  const { organizationId, role } = await withAuth({ ensureSignedIn: true })
  if (role !== "admin") {
    notFound()
  }

  const events = await prisma.auditEvent.findMany({
    where: { organizationId: organizationId! },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      actorName: true,
      actorEmail: true,
      targetLabel: true,
      metadata: true,
      createdAt: true,
    },
  })

  return <AuditLogView events={events} />
}
