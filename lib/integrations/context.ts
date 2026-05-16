import "server-only"

import { fetchRecentMessages, GmailReconnectRequired } from "@/lib/integrations/gmail"

export type ContextBlock = {
  providerId: string
  providerName: string
  /** Markdown-formatted body suitable for inlining into a prompt. */
  body: string
  /** When true, the body is a graceful "no data" or "reconnect required" notice. */
  isFallback: boolean
}

/**
 * For each AgentConnection an agent is linked to, pull a short, freshness-bounded
 * slice of data and return it as a Markdown context block. Phase-2 stuffs these
 * directly into the user prompt; Phase 3 will swap this for MCP tool calls.
 */
export async function buildContextBlocks(
  organizationId: string,
  connections: { providerId: string; providerName: string }[]
): Promise<ContextBlock[]> {
  const blocks: ContextBlock[] = []

  // Dedupe by providerId — multiple connections to the same provider (e.g. two GitHub
  // accounts) are out of scope for Phase 2; we use the first connection per provider.
  const seen = new Set<string>()
  for (const c of connections) {
    if (seen.has(c.providerId)) continue
    seen.add(c.providerId)

    if (c.providerId === "gmail") {
      blocks.push(await gmailBlock(organizationId, c.providerName))
    } else {
      blocks.push({
        providerId: c.providerId,
        providerName: c.providerName,
        body: `_Context fetch for ${c.providerName} is not wired yet. The agent has access to this integration but Phase 2 only pulls Gmail._`,
        isFallback: true,
      })
    }
  }
  return blocks
}

async function gmailBlock(
  organizationId: string,
  providerName: string
): Promise<ContextBlock> {
  try {
    const messages = await fetchRecentMessages(organizationId, { maxResults: 10 })
    if (messages.length === 0) {
      return {
        providerId: "gmail",
        providerName,
        body: "_The inbox is empty._",
        isFallback: true,
      }
    }
    const lines = messages.map((m, i) => {
      const from = m.from ?? "Unknown sender"
      const subject = m.subject ?? "(no subject)"
      const date = m.date ?? ""
      const snippet = (m.snippet ?? "").trim()
      return [
        `### ${i + 1}. ${subject}`,
        `**From:** ${from}`,
        date ? `**Date:** ${date}` : "",
        snippet ? `\n${snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    })
    return {
      providerId: "gmail",
      providerName,
      body: lines.join("\n\n"),
      isFallback: false,
    }
  } catch (err) {
    const reconnect = err instanceof GmailReconnectRequired
    return {
      providerId: "gmail",
      providerName,
      body: reconnect
        ? "_The Gmail connection needs to be reconnected — no data available._"
        : `_Failed to fetch Gmail messages: ${err instanceof Error ? err.message : "unknown error"}._`,
      isFallback: true,
    }
  }
}
