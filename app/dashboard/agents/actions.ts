"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { runAgent } from "@/lib/agent-runtime"
import { logAudit } from "@/lib/audit"
import { requireAdminContext, requireOrgContext } from "@/lib/auth"
import { notifyOrg } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { normalizeAgentName } from "./data"

export async function deleteAgents(ids: number[]) {
  const { organizationId } = await requireAdminContext()
  const validIds = ids.filter((id) => Number.isInteger(id) && id > 0)
  if (validIds.length === 0) {
    throw new Error("No valid agents selected.")
  }
  const targets = await prisma.agent.findMany({
    where: { id: { in: validIds }, organizationId },
    select: { id: true, name: true },
  })
  const result = await prisma.agent.deleteMany({
    where: { id: { in: validIds }, organizationId },
  })
  for (const t of targets) {
    await logAudit({
      action: "agent.deleted",
      targetType: "agent",
      targetId: String(t.id),
      targetLabel: t.name,
    })
  }
  revalidatePath("/dashboard/agents")
  return { deleted: result.count }
}

export async function listAgents() {
  const { organizationId } = await requireOrgContext()
  return prisma.agent.findMany({
    where: { organizationId },
    select: { id: true, name: true, description: true, status: true, model: true },
    orderBy: { name: "asc" },
  })
}

const newAgentSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(200),
  capabilities: z.array(z.string().min(1).max(40)).max(3).optional(),
})

export async function createAgent(input: z.infer<typeof newAgentSchema>) {
  const { user, organizationId } = await requireOrgContext()
  const data = newAgentSchema.parse(input)
  const nameKey = normalizeAgentName(data.name)

  if (!nameKey) {
    throw new Error("Name must contain at least one non-whitespace character.")
  }

  const existing = await prisma.agent.findUnique({
    where: { organizationId_nameKey: { organizationId, nameKey } },
    select: { id: true },
  })
  if (existing) {
    throw new Error("An agent with this name already exists.")
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        organizationId,
        name: data.name,
        nameKey,
        description: data.description,
        model: "Claude Sonnet 4.6",
        capabilities: data.capabilities ?? [],
      },
    })
    await logAudit({
      action: "agent.created",
      targetType: "agent",
      targetId: String(agent.id),
      targetLabel: agent.name,
    })
    await notifyOrg(
      organizationId,
      {
        type: "agent.created",
        title: `New agent: ${agent.name}`,
        body: agent.description,
        link: `/dashboard/agents/${agent.id}`,
      },
      { exceptUserId: user.id }
    )
    revalidatePath("/dashboard/agents")
    return agent
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("An agent with this name already exists.")
    }
    throw err
  }
}

const setAgentConnectionsSchema = z.object({
  agentId: z.number().int().positive(),
  connectionIds: z.array(z.string().min(1)).max(50),
})

/**
 * Replaces the full set of integration connections linked to an agent.
 * Admin-only. All connection IDs must belong to the caller's organization,
 * and the agent must also belong to that organization.
 */
export async function setAgentConnections(
  input: z.infer<typeof setAgentConnectionsSchema>
) {
  const { agentId, connectionIds } = setAgentConnectionsSchema.parse(input)
  const { organizationId } = await requireAdminContext()

  // Validate the agent belongs to this org.
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, organizationId },
    select: { id: true, name: true },
  })
  if (!agent) throw new Error("Agent not found in this organization.")

  // Validate every connection ID also belongs to this org.
  const valid = await prisma.integrationConnection.findMany({
    where: { id: { in: connectionIds }, organizationId },
    select: { id: true },
  })
  if (valid.length !== connectionIds.length) {
    throw new Error("One or more integrations don't belong to this organization.")
  }

  await prisma.$transaction([
    prisma.agentConnection.deleteMany({ where: { agentId } }),
    ...(connectionIds.length > 0
      ? [
          prisma.agentConnection.createMany({
            data: connectionIds.map((id) => ({
              agentId,
              integrationConnectionId: id,
            })),
          }),
        ]
      : []),
  ])

  await logAudit({
    action: "agent.configured",
    targetType: "agent",
    targetId: String(agent.id),
    targetLabel: agent.name,
    metadata: { connectionIds },
  })

  revalidatePath(`/dashboard/agents/${agent.id}`)
  return { connected: connectionIds.length }
}

/**
 * Trigger a manual run of an agent. Any org member can run agents — the
 * authorization for what the run can SEE comes from which connections the
 * agent was wired to (admin decision, Phase 1).
 *
 * This call is synchronous: the action waits for Anthropic to respond before
 * returning. Locally that's fine; in production we'd queue it.
 */
export async function runAgentNow(agentId: number) {
  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new Error("Invalid agent id.")
  }
  const { user, organizationId } = await requireOrgContext()

  const actorName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email.split("@")[0]

  const result = await runAgent(agentId, organizationId, {
    id: user.id,
    name: actorName,
    email: user.email,
  })

  // Bump the agent's lastActive + tasksCompleted on success so the listing reflects it.
  if (result.status === "succeeded") {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        lastActive: new Date(),
        tasksCompleted: { increment: 1 },
      },
    })
  }

  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath("/dashboard/agents")
  return result
}
