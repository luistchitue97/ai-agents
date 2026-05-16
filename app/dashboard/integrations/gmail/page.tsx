import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { ArrowLeftIcon, InboxIcon, MailIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  fetchRecentMessages,
  GmailReconnectRequired,
  type GmailMessageSummary,
} from "@/lib/integrations/gmail"
import { prisma } from "@/lib/prisma"

const MAX_MESSAGES = 10

function fromLabel(raw: string | null): string {
  if (!raw) return "Unknown sender"
  // "Display Name <email@example.com>" → "Display Name", or just the email.
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<.*>\s*$/)
  return (m?.[1] ?? raw).trim()
}

function formatWhen(rawDate: string | null): string {
  if (!rawDate) return ""
  const d = new Date(rawDate)
  if (Number.isNaN(d.getTime())) return rawDate
  return formatDistanceToNow(d, { addSuffix: true })
}

export default async function GmailInboxPage() {
  const { organizationId } = await withAuth({ ensureSignedIn: true })

  const connection = organizationId
    ? await prisma.integrationConnection.findFirst({
        where: { organizationId, providerId: "gmail" },
        select: { id: true, accountLogin: true, accountName: true },
      })
    : null

  let messages: GmailMessageSummary[] = []
  let fetchError: string | null = null
  let needsReconnect = false

  if (connection && organizationId) {
    try {
      messages = await fetchRecentMessages(organizationId, { maxResults: MAX_MESSAGES })
    } catch (err) {
      if (err instanceof GmailReconnectRequired) {
        needsReconnect = true
      }
      fetchError =
        err instanceof Error ? err.message : "Failed to load messages from Gmail."
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            asChild
          >
            <Link href="/dashboard/integrations">
              <ArrowLeftIcon />
              Integrations
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <InboxIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gmail inbox</h1>
              <p className="text-sm text-muted-foreground">
                {connection?.accountLogin
                  ? `Connected as ${connection.accountLogin}`
                  : "Read-only preview of your most recent messages."}
              </p>
            </div>
          </div>
        </div>

        {!connection ? (
          <NoConnectionCard />
        ) : needsReconnect ? (
          <ReconnectCard message={fetchError ?? "Reconnect required."} />
        ) : fetchError ? (
          <ErrorCard message={fetchError} />
        ) : (
          <MessagesList messages={messages} />
        )}
      </div>
    </div>
  )
}

function NoConnectionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gmail isn&apos;t connected yet</CardTitle>
        <CardDescription>
          Connect your Google account to pull recent messages into the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <a href="/api/integrations/gmail/connect">
            <PlusIcon />
            Connect Gmail
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function ReconnectCard({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reconnect required</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <a href="/api/integrations/gmail/connect">
            <PlusIcon />
            Reconnect Gmail
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Couldn&apos;t load messages</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function MessagesList({ messages }: { messages: GmailMessageSummary[] }) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
          <MailIcon className="size-6 opacity-40" />
          No messages found.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent messages</CardTitle>
        <CardDescription>
          The {messages.length} most recent {messages.length === 1 ? "message" : "messages"} in your Gmail account.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {messages.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="flex items-center justify-between gap-2 sm:w-48 sm:shrink-0">
                <span className="truncate text-sm font-medium">{fromLabel(m.from)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground sm:hidden">
                  {formatWhen(m.date)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm">
                  {m.subject ?? <span className="italic text-muted-foreground">(no subject)</span>}
                </span>
                {m.snippet && (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {m.snippet}
                  </span>
                )}
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {formatWhen(m.date)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

