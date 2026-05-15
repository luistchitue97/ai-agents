import { notFound } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

import { AgentLogsView } from "./logs-view"

export default async function AgentLogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agentId = Number(id)
  const { organizationId } = await withAuth({ ensureSignedIn: true })

  const agent = organizationId
    ? await prisma.agent.findFirst({
        where: { id: agentId, organizationId },
        select: { id: true, name: true },
      })
    : null

  if (!agent) notFound()

  const logs = await prisma.log.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, level: true, message: true, durationMs: true, createdAt: true },
  })

  return <AgentLogsView agent={agent} logs={logs} />
}
