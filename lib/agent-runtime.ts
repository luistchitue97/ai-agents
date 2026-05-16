import "server-only"

import type Anthropic from "@anthropic-ai/sdk"
import type { Prisma } from "@prisma/client"

import { buildToolsForAgent, type ToolDefinition } from "@/lib/agent-tools"
import { apiModelId, getAnthropicClient } from "@/lib/anthropic"
import { prisma } from "@/lib/prisma"

export type RunActor = {
  id: string
  name: string
  email: string
}

const MAX_ITERATIONS = 10
const MAX_TOKENS_PER_TURN = 4096

/**
 * Phase 3 agent runtime: multi-turn tool-use loop. Claude picks tools, we
 * execute them, feed results back, and persist every step. Returns the
 * AgentRun id and final status (succeeded | failed).
 */
export async function runAgent(
  agentId: number,
  organizationId: string,
  actor: RunActor
): Promise<{ runId: string; status: "succeeded" | "failed" }> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      model: true,
      capabilities: true,
    },
  })
  if (!agent) {
    throw new Error("Agent not found in this organization.")
  }

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

  let sequence = 0
  const nextSeq = () => sequence++

  try {
    const { tools, unwiredProviders } = await buildToolsForAgent(
      agent.id,
      organizationId
    )

    const systemPrompt = buildSystemPrompt(agent, tools, unwiredProviders)
    const userPrompt = buildInitialUserPrompt(agent, tools.length)

    // Persist the prompt as the first step.
    await prisma.agentRunStep.create({
      data: {
        runId: run.id,
        sequence: nextSeq(),
        kind: "prompt",
        content: userPrompt,
        toolOutput: {
          system: systemPrompt,
          toolNames: tools.map((t) => t.name),
        },
      },
    })

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ]

    const client = getAnthropicClient()
    const toolByName = new Map(tools.map((t) => [t.name, t]))

    let finalText: string | null = null
    let totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    }

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await client.messages.create({
        model: apiModelId(agent.model),
        max_tokens: MAX_TOKENS_PER_TURN,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: tools.length > 0 ? toAnthropicTools(tools) : undefined,
        messages,
      })

      totalUsage.inputTokens += response.usage.input_tokens
      totalUsage.outputTokens += response.usage.output_tokens
      totalUsage.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0
      totalUsage.cacheCreationTokens +=
        response.usage.cache_creation_input_tokens ?? 0

      // Extract text portion of this assistant turn (may be empty when the model is
      // purely calling tools).
      const turnText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim()

      // Persist the assistant turn's text as a response step (we keep it even when
      // empty so the run timeline shows the model's narration between tool calls).
      await prisma.agentRunStep.create({
        data: {
          runId: run.id,
          sequence: nextSeq(),
          kind: "response",
          content: turnText || null,
        },
      })

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      )

      if (response.stop_reason === "end_turn" || toolUses.length === 0) {
        finalText = turnText
        break
      }

      // The model wants to call tools. Execute each in order, feed results back.
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const use of toolUses) {
        await prisma.agentRunStep.create({
          data: {
            runId: run.id,
            sequence: nextSeq(),
            kind: "tool_call",
            toolName: use.name,
            toolInput: use.input as unknown as Prisma.InputJsonValue,
          },
        })

        const tool = toolByName.get(use.name)
        let resultPayload: unknown
        let isError = false

        if (!tool) {
          resultPayload = { error: `Unknown tool: ${use.name}` }
          isError = true
        } else {
          try {
            resultPayload = await tool.handler(
              (use.input ?? {}) as Record<string, unknown>,
              { organizationId }
            )
          } catch (err) {
            resultPayload = {
              error: err instanceof Error ? err.message : "Tool execution failed.",
            }
            isError = true
          }
        }

        const resultJson = JSON.stringify(resultPayload)

        await prisma.agentRunStep.create({
          data: {
            runId: run.id,
            sequence: nextSeq(),
            kind: "tool_result",
            toolName: use.name,
            toolOutput: resultPayload as unknown as Prisma.InputJsonValue,
          },
        })

        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: resultJson,
          is_error: isError || undefined,
        })
      }

      messages.push({ role: "assistant", content: response.content })
      messages.push({ role: "user", content: toolResults })
    }

    if (finalText === null) {
      throw new Error(
        `Run hit the max iteration cap (${MAX_ITERATIONS}) without finishing.`
      )
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        summary: finalText,
        finishedAt: new Date(),
      },
    })

    // Stash final token usage on the very last step so the detail page can show it
    // (we already persisted that step, so update by id).
    await prisma.agentRunStep.updateMany({
      where: { runId: run.id, kind: "response" },
      data: { toolOutput: totalUsage as Prisma.InputJsonValue },
    })

    return { runId: run.id, status: "succeeded" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    await prisma.agentRunStep.create({
      data: {
        runId: run.id,
        sequence: nextSeq(),
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

function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  // Mark the last tool as a cache breakpoint so the tool definitions are cached
  // across iterations within the same run — and across runs of the same agent
  // for the duration of the cache TTL.
  return tools.map((t, i) => {
    const base: Anthropic.Tool = {
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }
    if (i === tools.length - 1) {
      return { ...base, cache_control: { type: "ephemeral" } }
    }
    return base
  })
}

function buildSystemPrompt(
  agent: {
    name: string
    description: string
    capabilities: string[]
  },
  tools: { name: string }[],
  unwired: { providerName: string }[]
): string {
  const lines = [
    `You are ${agent.name}, an autonomous agent.`,
    `Your job: ${agent.description}`,
  ]
  if (agent.capabilities.length > 0) {
    lines.push("", `Your declared capabilities: ${agent.capabilities.join(", ")}.`)
  }
  if (tools.length > 0) {
    lines.push(
      "",
      "You have access to the following tools:",
      ...tools.map((t) => `- ${t.name}`),
      "",
      "Use them to gather the information you need before producing your final answer.",
      "Be deliberate: list/search first, then fetch specific items only if they look important.",
      "Don't call the same tool with the same arguments twice."
    )
  }
  if (unwired.length > 0) {
    lines.push(
      "",
      `Note: these integrations are connected but don't expose tools yet: ${unwired
        .map((p) => p.providerName)
        .join(", ")}.`
    )
  }
  lines.push(
    "",
    "When you have enough information, stop calling tools and write your final answer.",
    "Format your final answer as concise Markdown with clear headings.",
    "If nothing useful turned up, say so plainly."
  )
  return lines.join("\n")
}

function buildInitialUserPrompt(
  agent: { name: string; description: string },
  toolCount: number
): string {
  if (toolCount === 0) {
    return [
      `Run yourself, ${agent.name}, against the current state.`,
      "",
      "You have no tools connected. Write a brief note explaining that nothing can be inspected until an integration is wired to this agent.",
    ].join("\n")
  }
  return [
    `Run yourself, ${agent.name}, against the current state of the user's connected tools.`,
    "",
    `Start by gathering what you need with your tools, then deliver on your stated job: ${agent.description}`,
  ].join("\n")
}
