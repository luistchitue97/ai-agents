import "server-only"

import type { IntegrationConnection } from "@prisma/client"

import { decryptSecret, encryptSecret } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

export type GmailMessageSummary = {
  id: string
  from: string | null
  subject: string | null
  date: string | null
  snippet: string | null
}

export type GmailMessageDetail = GmailMessageSummary & {
  to: string | null
  body: string | null
  bodyTruncated: boolean
}

type MessagePart = {
  mimeType?: string
  body?: { data?: string; size?: number }
  parts?: MessagePart[]
}

export class GmailReconnectRequired extends Error {
  constructor(message = "This Gmail connection needs to be reconnected.") {
    super(message)
    this.name = "GmailReconnectRequired"
  }
}

async function refreshAccessToken(connection: IntegrationConnection): Promise<string> {
  if (!connection.refreshToken) {
    throw new GmailReconnectRequired("No refresh token on file. Disconnect and reconnect Gmail.")
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).")
  }

  const refreshToken = decryptSecret(connection.refreshToken)
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    error?: string
  } | null
  if (!res.ok || !json?.access_token) {
    if (json?.error === "invalid_grant") {
      throw new GmailReconnectRequired("Google revoked the refresh token. Reconnect Gmail.")
    }
    throw new Error(`Failed to refresh Gmail token: ${json?.error ?? res.status}`)
  }

  const tokenExpiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000)
    : null
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptSecret(json.access_token),
      tokenExpiresAt,
    },
  })
  return json.access_token
}

async function callGmail<T>(
  connection: IntegrationConnection,
  path: string,
  init?: { method?: string; body?: string; contentType?: string }
): Promise<T> {
  const tryFetch = async (token: string) =>
    fetch(`${GMAIL_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.contentType ? { "Content-Type": init.contentType } : {}),
      },
      body: init?.body,
    })

  let token = decryptSecret(connection.accessToken)
  let res = await tryFetch(token)
  if (res.status === 401) {
    token = await refreshAccessToken(connection)
    res = await tryFetch(token)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Gmail API ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as T
}

export async function fetchRecentMessages(
  organizationId: string,
  options: { maxResults?: number; query?: string } = {}
): Promise<GmailMessageSummary[]> {
  const maxResults = Math.min(50, Math.max(1, options.maxResults ?? 10))

  const connection = await prisma.integrationConnection.findFirst({
    where: { organizationId, providerId: "gmail" },
  })
  if (!connection) {
    throw new GmailReconnectRequired("Gmail is not connected for this organization.")
  }

  const queryParam = options.query?.trim()
    ? `&q=${encodeURIComponent(options.query.trim())}`
    : ""

  type ListResponse = { messages?: { id: string }[] }
  const list = await callGmail<ListResponse>(
    connection,
    `/messages?maxResults=${maxResults}${queryParam}`
  )
  const ids = list.messages?.map((m) => m.id) ?? []
  if (ids.length === 0) return []

  // Fetch metadata for each message in parallel. Each one is a separate API call
  // but we only ask for the Subject/From/Date headers, so the payload is tiny.
  type MessageResponse = {
    id: string
    snippet?: string
    payload?: { headers?: { name: string; value: string }[] }
  }
  const messages = await Promise.all(
    ids.map((id) =>
      callGmail<MessageResponse>(
        connection,
        `/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
      )
    )
  )

  return messages.map((m) => {
    const headers = new Map(
      (m.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
    )
    return {
      id: m.id,
      from: headers.get("from") ?? null,
      subject: headers.get("subject") ?? null,
      date: headers.get("date") ?? null,
      snippet: m.snippet ?? null,
    }
  })
}

// Cap how much body text we hand back to the model. Long marketing emails would
// otherwise burn through context for almost no signal.
const MAX_BODY_CHARS = 8000

function extractBody(part: MessagePart, mimeType: string): string | null {
  if (part.mimeType === mimeType && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf8")
  }
  if (part.parts) {
    for (const child of part.parts) {
      const found = extractBody(child, mimeType)
      if (found) return found
    }
  }
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export type SendMessageInput = {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}

export type SendMessageResult = {
  id: string
  threadId: string
}

const EMAIL_REGEX = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/

function validateAddresses(field: string, raw: string): string {
  // Allow comma-separated lists; trim each entry and validate independently.
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    throw new Error(`${field} is required.`)
  }
  for (const p of parts) {
    if (!EMAIL_REGEX.test(p)) {
      throw new Error(`${field} contains an invalid address: ${p}`)
    }
  }
  return parts.join(", ")
}

/**
 * Construct an RFC 2822 message. Subject is MIME-encoded so non-ASCII characters
 * (accents, emojis) survive transit, and the body is base64-encoded so we don't
 * have to think about line endings or 8-bit cleanliness.
 */
function buildRfc2822(args: {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}): string {
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(args.subject, "utf8").toString("base64")}?=`
  const headerLines = [
    `To: ${args.to}`,
    args.cc ? `Cc: ${args.cc}` : null,
    args.bcc ? `Bcc: ${args.bcc}` : null,
    `Subject: ${subjectEncoded}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter((l): l is string => l !== null)

  const encodedBody = Buffer.from(args.body, "utf8").toString("base64")
  // RFC 2045 caps base64 lines at 76 chars.
  const wrappedBody = encodedBody.match(/.{1,76}/g)?.join("\r\n") ?? encodedBody

  return `${headerLines.join("\r\n")}\r\n\r\n${wrappedBody}`
}

/**
 * Send an email via the connected Gmail account. The authenticated user is the
 * From address — Gmail rejects sends that try to spoof another sender.
 */
export async function sendMessage(
  organizationId: string,
  input: SendMessageInput
): Promise<SendMessageResult> {
  if (!input.subject?.trim()) {
    throw new Error("subject is required.")
  }
  if (!input.body?.trim()) {
    throw new Error("body is required.")
  }
  const to = validateAddresses("to", input.to ?? "")
  const cc = input.cc?.trim() ? validateAddresses("cc", input.cc) : undefined
  const bcc = input.bcc?.trim() ? validateAddresses("bcc", input.bcc) : undefined

  const connection = await prisma.integrationConnection.findFirst({
    where: { organizationId, providerId: "gmail" },
  })
  if (!connection) {
    throw new GmailReconnectRequired("Gmail is not connected for this organization.")
  }

  const rfc2822 = buildRfc2822({ to, subject: input.subject, body: input.body, cc, bcc })
  // Gmail wants base64url, not standard base64.
  const raw = Buffer.from(rfc2822, "utf8").toString("base64url")

  type SendResponse = { id: string; threadId: string }
  return await callGmail<SendResponse>(connection, "/messages/send", {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ raw }),
  })
}

export async function fetchMessageBody(
  organizationId: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { organizationId, providerId: "gmail" },
  })
  if (!connection) {
    throw new GmailReconnectRequired("Gmail is not connected for this organization.")
  }

  type MessageResponse = {
    id: string
    snippet?: string
    payload?: MessagePart & { headers?: { name: string; value: string }[] }
  }
  const m = await callGmail<MessageResponse>(
    connection,
    `/messages/${encodeURIComponent(messageId)}?format=full`
  )

  const headers = new Map(
    (m.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
  )

  let body: string | null = null
  if (m.payload) {
    const plain = extractBody(m.payload, "text/plain")
    if (plain) {
      body = plain.trim()
    } else {
      const html = extractBody(m.payload, "text/html")
      if (html) body = stripHtml(html)
    }
  }

  let truncated = false
  if (body && body.length > MAX_BODY_CHARS) {
    body = body.slice(0, MAX_BODY_CHARS)
    truncated = true
  }

  return {
    id: m.id,
    from: headers.get("from") ?? null,
    to: headers.get("to") ?? null,
    subject: headers.get("subject") ?? null,
    date: headers.get("date") ?? null,
    snippet: m.snippet ?? null,
    body,
    bodyTruncated: truncated,
  }
}
