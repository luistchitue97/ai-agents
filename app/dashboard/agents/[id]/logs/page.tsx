import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"

import { AgentLogsView } from "./logs-view"

export default async function AgentLogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await prisma.agent.findUnique({
    where: { id: Number(id) },
    select: { id: true, name: true },
  })

  if (!agent) notFound()

  return <AgentLogsView agent={agent} />
}
