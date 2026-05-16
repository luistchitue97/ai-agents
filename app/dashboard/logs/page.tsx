import { notFound } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import {
  BotIcon,
  MailIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { prisma } from "@/lib/prisma"

type ActionMeta = {
  label: string
  icon: React.ReactNode
  tone: "default" | "destructive" | "secondary"
}

const actionMeta: Record<string, ActionMeta> = {
  "agent.created": {
    label: "Created agent",
    icon: <BotIcon className="size-3.5" />,
    tone: "default",
  },
  "agent.deleted": {
    label: "Deleted agent",
    icon: <BotIcon className="size-3.5" />,
    tone: "destructive",
  },
  "integration.connected": {
    label: "Connected integration",
    icon: <PlugZapIcon className="size-3.5" />,
    tone: "default",
  },
  "integration.disconnected": {
    label: "Disconnected integration",
    icon: <PlugZapIcon className="size-3.5" />,
    tone: "secondary",
  },
  "member.invited": {
    label: "Invited member",
    icon: <MailIcon className="size-3.5" />,
    tone: "default",
  },
  "member.invite_revoked": {
    label: "Revoked invitation",
    icon: <XIcon className="size-3.5" />,
    tone: "secondary",
  },
  "member.invite_resent": {
    label: "Resent invitation",
    icon: <MailIcon className="size-3.5" />,
    tone: "secondary",
  },
  "member.role_changed": {
    label: "Changed role",
    icon: <ShieldCheckIcon className="size-3.5" />,
    tone: "default",
  },
  "member.removed": {
    label: "Removed member",
    icon: <UserMinusIcon className="size-3.5" />,
    tone: "destructive",
  },
}

function fallbackMeta(action: string): ActionMeta {
  return {
    label: action,
    icon: <UserPlusIcon className="size-3.5" />,
    tone: "secondary",
  }
}

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function formatWhen(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function renderDetails(action: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const m = metadata as Record<string, unknown>
  if (action === "member.role_changed" && m.previousRole && m.newRole) {
    return `${m.previousRole} → ${m.newRole}`
  }
  if (action === "member.invited" && m.roleSlug) {
    return `as ${m.roleSlug}`
  }
  return null
}

export default async function AuditLogPage() {
  const { organizationId, role } = await withAuth({ ensureSignedIn: true })
  if (role !== "admin") {
    notFound()
  }

  const events = await prisma.auditEvent.findMany({
    where: { organizationId: organizationId! },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Every mutation in your organization — who did what, and when.
            Showing the most recent {events.length} {events.length === 1 ? "event" : "events"}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              Records cover agents, integrations, and team membership.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => {
                    const meta = actionMeta[event.action] ?? fallbackMeta(event.action)
                    const details = renderDetails(event.action, event.metadata)
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-7">
                              <AvatarFallback className="text-[10px]">
                                {initialsFrom(event.actorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">
                                {event.actorName}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {event.actorEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={meta.tone === "destructive" ? "destructive" : meta.tone === "default" ? "default" : "secondary"}
                            className="gap-1"
                          >
                            {meta.icon}
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {event.targetLabel ?? <span className="text-muted-foreground">—</span>}
                            </span>
                            {details && (
                              <span className="text-xs text-muted-foreground">{details}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatWhen(event.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
