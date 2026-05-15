import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"

import { AgentLogsView } from "./logs-view"

export default async function AgentLogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agentId = Number(id)

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true },
  })

  if (!agent) notFound()

  const logs = await prisma.log.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, level: true, message: true, durationMs: true, createdAt: true },
  })

  return <AgentLogsView agent={agent} logs={logs} />
}
