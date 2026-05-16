import "server-only"

import { sendOneShot } from "@/lib/anthropic"
import { integrationProviders } from "@/lib/integrations/providers"
import { buildContextBlocks } from "@/lib/integrations/context"
import { prisma } from "@/lib/prisma"

export type RunActor = {
  id: string
  name: string
  email: string
}

/**
 * Phase 2 agent runtime: build a single Claude prompt from the agent's configured
 * tools (no real MCP tool use yet), record the prompt + response as run steps,
 * and persist a summary on the AgentRun row.
 *
 * Returns the AgentRun id whether it succeeded or failed — the caller is expected
 * to navigate the user to the run detail page either way.
 */
export async function runAgent(
  agentId: number,
  organizationId: string,
  actor: RunActor
): Promise<{ runId: string; status: "succeeded" | "failed" }> {
  // Load the agent and the integrations it has access to.
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, organizationId },
    include: {
      connections: {
        include: {
          connection: {
            select: {
              id: true,
              providerId: true,
              accountLogin: true,
            },
          },
        },
      },
    },
  })
  if (!agent) {
    throw new Error("Agent not found in this organization.")
  }

  // Create the run row in pending → running.
  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      organizationId,
      status: "running",
      triggeredById: actor.id,
      triggeredByName: actor.name,
      triggeredByEmail: actor.email,
    },
    select: { id: true },
  })

  try {
    // Decorate connections with the friendly provider name from the catalog.
    const decoratedConnections = agent.connections.map((ac) => {
      const provider = integrationProviders[ac.connection.providerId]
      return {
        providerId: ac.connection.providerId,
        providerName: provider?.name ?? ac.connection.providerId,
      }
    })

    const contextBlocks = await buildContextBlocks(organizationId, decoratedConnections)

    const systemPrompt = buildSystemPrompt(agent)
    const userPrompt = buildUserPrompt(agent, contextBlocks)

    await prisma.agentRunStep.create({
      data: {
        runId: run.id,
        sequence: 0,
        kind: "prompt",
        content: userPrompt,
      },
    })

    const result = await sendOneShot({
      modelDisplayName: agent.model,
      system: systemPrompt,
      userPrompt,
      maxTokens: 4096,
    })

    await prisma.agentRunStep.create({
      data: {
        runId: run.id,
        sequence: 1,
        kind: "response",
        content: result.text,
        toolOutput: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cacheReadTokens: result.cacheReadTokens,
          cacheCreationTokens: result.cacheCreationTokens,
        },
      },
    })

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        summary: result.text,
        finishedAt: new Date(),
      },
    })

    return { runId: run.id, status: "succeeded" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    await prisma.agentRunStep.create({
      data: {
        runId: run.id,
        sequence: 99,
        kind: "error",
        content: message,
      },
    })
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: message,
        finishedAt: new Date(),
      },
    })
    return { runId: run.id, status: "failed" }
  }
}

function buildSystemPrompt(agent: {
  name: string
  description: string
  capabilities: string[]
}): string {
  const lines = [
    `You are ${agent.name}, an autonomous agent.`,
    `Your job: ${agent.description}`,
  ]
  if (agent.capabilities.length > 0) {
    lines.push(
      "",
      `Your declared capabilities: ${agent.capabilities.join(", ")}.`
    )
  }
  lines.push(
    "",
    "When given context from the user's connected tools, do exactly what your job description says.",
    "Be concise. If there is nothing useful to report, say so plainly.",
    "Format your output as short Markdown with clear headings."
  )
  return lines.join("\n")
}

function buildUserPrompt(
  agent: { name: string; description: string },
  blocks: Awaited<ReturnType<typeof buildContextBlocks>>
): string {
  if (blocks.length === 0) {
    return [
      `Run yourself, ${agent.name}, against the current state.`,
      "",
      "No tools are connected — produce a brief note explaining that nothing can be inspected until an integration is connected.",
    ].join("\n")
  }
  const sections = blocks.map(
    (b) => `## ${b.providerName}\n\n${b.body}`
  )
  return [
    `Run yourself, ${agent.name}, against the data below.`,
    "",
    ...sections,
  ].join("\n\n")
}
