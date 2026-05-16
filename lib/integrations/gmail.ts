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
  path: string
): Promise<T> {
  const tryFetch = async (token: string) =>
    fetch(`${GMAIL_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
  options: { maxResults?: number } = {}
): Promise<GmailMessageSummary[]> {
  const maxResults = Math.min(50, Math.max(1, options.maxResults ?? 10))

  const connection = await prisma.integrationConnection.findFirst({
    where: { organizationId, providerId: "gmail" },
  })
  if (!connection) {
    throw new GmailReconnectRequired("Gmail is not connected for this organization.")
  }

  type ListResponse = { messages?: { id: string }[] }
  const list = await callGmail<ListResponse>(
    connection,
    `/messages?maxResults=${maxResults}`
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
