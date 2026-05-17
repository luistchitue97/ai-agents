import "server-only"

import { prisma } from "@/lib/prisma"

import { githubToolModule } from "./github"
import { gmailToolModule } from "./gmail"
import type { ProviderToolModule, ToolDefinition } from "./types"

export type { ToolDefinition } from "./types"

const providerToolModules: Record<string, ProviderToolModule> = {
  [githubToolModule.providerId]: githubToolModule,
  [gmailToolModule.providerId]: gmailToolModule,
}

export type AssembledTools = {
  tools: ToolDefinition[]
  /**
   * Providers the agent has access to that don't ship any tool definitions yet.
   * The agent runtime can mention these in the prompt so Claude knows what's
   * connected even if it can't call anything.
   */
  unwiredProviders: { providerId: string; providerName: string }[]
}

/**
 * Returns the tool set this agent is allowed to use, based on its configured
 * integration connections. Tools from unconfigured providers are silently
 * skipped — only providers we've shipped tool modules for show up here.
 */
export async function buildToolsForAgent(
  agentId: number,
  organizationId: string
): Promise<AssembledTools> {
  const connections = await prisma.agentConnection.findMany({
    where: { agentId },
    include: {
      connection: {
        select: { providerId: true, organizationId: true },
      },
    },
  })

  // Belt-and-braces: skip any connection that doesn't belong to the running org.
  const sameOrg = connections.filter(
    (c) => c.connection.organizationId === organizationId
  )

  const tools: ToolDefinition[] = []
  const unwiredProviders: AssembledTools["unwiredProviders"] = []
  const seenProviders = new Set<string>()

  for (const c of sameOrg) {
    const pid = c.connection.providerId
    if (seenProviders.has(pid)) continue
    seenProviders.add(pid)

    const mod = providerToolModules[pid]
    if (mod) {
      tools.push(...mod.buildTools())
    } else {
      unwiredProviders.push({ providerId: pid, providerName: pid })
    }
  }

  return { tools, unwiredProviders }
}
