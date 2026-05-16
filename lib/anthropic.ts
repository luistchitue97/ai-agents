import "server-only"

import Anthropic from "@anthropic-ai/sdk"

/**
 * Maps the human-readable model name we store on Agent.model to the API model ID.
 * Falls back to claude-sonnet-4-6 if we don't recognize the value.
 */
export function apiModelId(displayName: string): string {
  switch (displayName) {
    case "Claude Opus 4.7":
      return "claude-opus-4-7"
    case "Claude Sonnet 4.6":
      return "claude-sonnet-4-6"
    case "Claude Haiku 4.5":
      return "claude-haiku-4-5-20251001"
    default:
      return "claude-sonnet-4-6"
  }
}

let cachedClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env and restart the dev server."
    )
  }
  cachedClient = new Anthropic({ apiKey })
  return cachedClient
}

export type AnthropicCallResult = {
  text: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

/**
 * Single-shot message to Claude. The system block is marked as a cache breakpoint
 * so subsequent runs of the same agent reuse the cached prefix (the system prompt
 * tends to be the longest stable part of a manual run).
 */
export async function sendOneShot(params: {
  modelDisplayName: string
  system: string
  userPrompt: string
  maxTokens?: number
}): Promise<AnthropicCallResult> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: apiModelId(params.modelDisplayName),
    max_tokens: params.maxTokens ?? 4096,
    system: [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: params.userPrompt }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("\n")

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  }
}
