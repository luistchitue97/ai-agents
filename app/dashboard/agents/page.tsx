import { prisma } from "@/lib/prisma"

import { AgentsTable } from "./agents-table"
import { formatLastActive, type Agent } from "./data"

export default async function AgentsPage() {
  const rows = await prisma.agent.findMany({ orderBy: { id: "asc" } })
  const agents: Agent[] = rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    model: a.model,
    status: a.status,
    tasksCompleted: a.tasksCompleted,
    lastActive: formatLastActive(a.lastActive),
    capabilities: a.capabilities,
  }))
  return <AgentsTable initialData={agents} />
}
