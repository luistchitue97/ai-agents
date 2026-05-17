import "server-only"

import {
  fetchMessageBody,
  fetchRecentMessages,
  sendMessage,
} from "@/lib/integrations/gmail"

import type { ProviderToolModule, ToolDefinition } from "./types"

const gmailListMessages: ToolDefinition = {
  name: "gmail_list_messages",
  description:
    "List recent Gmail messages, optionally filtered by a Gmail search query. " +
    "Returns id, from, subject, date, and a short snippet for each message. " +
    "Use this first to scan what's in the inbox; then call gmail_get_message_body " +
    "to read the full text of any message that looks important. " +
    "The query supports Gmail's normal search operators (e.g. 'from:alice', " +
    "'subject:invoice', 'newer_than:7d', 'is:unread').",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "Number of messages to return (1-50). Default 10.",
      },
      query: {
        type: "string",
        description: "Optional Gmail search query. Leave empty to get the latest messages.",
      },
    },
  },
  handler: async (input, ctx) => {
    const maxResults =
      typeof input.maxResults === "number" ? input.maxResults : 10
    const query = typeof input.query === "string" ? input.query : undefined
    return await fetchRecentMessages(ctx.organizationId, { maxResults, query })
  },
}

const gmailGetMessageBody: ToolDefinition = {
  name: "gmail_get_message_body",
  description:
    "Fetch the full text body of a single Gmail message by its id. " +
    "Use after gmail_list_messages to read the contents of a message that " +
    "looks important. Returns headers (from, to, subject, date), the snippet, " +
    "and the message body as plain text (HTML is stripped). Long bodies are " +
    "truncated and bodyTruncated will be true.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The Gmail message id returned by gmail_list_messages.",
      },
    },
    required: ["id"],
  },
  handler: async (input, ctx) => {
    const id = String(input.id ?? "").trim()
    if (!id) throw new Error("gmail_get_message_body requires an id.")
    return await fetchMessageBody(ctx.organizationId, id)
  },
}

const gmailSendMessage: ToolDefinition = {
  name: "gmail_send_message",
  description:
    "Send an email from the connected Gmail account. The From address is always " +
    "the connected user — you cannot send as anyone else. Returns the new message id " +
    "and thread id on success. Use sparingly: every call to this tool actually delivers " +
    "an email. Compose the full body before calling — there's no draft or undo.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description:
          "Recipient email address. For multiple recipients, separate with commas.",
      },
      subject: {
        type: "string",
        description: "Subject line. UTF-8 is supported.",
      },
      body: {
        type: "string",
        description: "Plain-text body of the email.",
      },
      cc: {
        type: "string",
        description: "Optional CC addresses, comma-separated.",
      },
      bcc: {
        type: "string",
        description: "Optional BCC addresses, comma-separated.",
      },
    },
    required: ["to", "subject", "body"],
  },
  handler: async (input, ctx) => {
    return await sendMessage(ctx.organizationId, {
      to: String(input.to ?? ""),
      subject: String(input.subject ?? ""),
      body: String(input.body ?? ""),
      cc: typeof input.cc === "string" ? input.cc : undefined,
      bcc: typeof input.bcc === "string" ? input.bcc : undefined,
    })
  },
}

export const gmailToolModule: ProviderToolModule = {
  providerId: "gmail",
  buildTools: () => [gmailListMessages, gmailGetMessageBody, gmailSendMessage],
}
