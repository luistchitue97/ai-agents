import { withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

import { AgentsTable } from "./agents-table"
import { formatLastActive, type Agent } from "./data"

export default async function AgentsPage() {
  const { organizationId, role } = await withAuth({ ensureSignedIn: true })
  const rows = organizationId
    ? await prisma.agent.findMany({
        where: { organizationId },
        orderBy: { id: "asc" },
      })
    : []
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
  return <AgentsTable initialData={agents} isAdmin={role === "admin"} />
}
