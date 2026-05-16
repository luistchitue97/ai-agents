"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  BotIcon,
  CalendarIcon,
  MailIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type OperationKind = "create" | "update" | "delete"

type ActionMeta = {
  label: string
  icon: React.ReactNode
  tone: "default" | "destructive" | "secondary"
  kind: OperationKind
}

const actionMeta: Record<string, ActionMeta> = {
  "agent.created": {
    label: "Created agent",
    icon: <BotIcon className="size-3.5" />,
    tone: "default",
    kind: "create",
  },
  "agent.deleted": {
    label: "Deleted agent",
    icon: <BotIcon className="size-3.5" />,
    tone: "destructive",
    kind: "delete",
  },
  "integration.connected": {
    label: "Connected integration",
    icon: <PlugZapIcon className="size-3.5" />,
    tone: "default",
    kind: "create",
  },
  "integration.disconnected": {
    label: "Disconnected integration",
    icon: <PlugZapIcon className="size-3.5" />,
    tone: "secondary",
    kind: "delete",
  },
  "member.invited": {
    label: "Invited member",
    icon: <MailIcon className="size-3.5" />,
    tone: "default",
    kind: "create",
  },
  "member.invite_revoked": {
    label: "Revoked invitation",
    icon: <XIcon className="size-3.5" />,
    tone: "secondary",
    kind: "delete",
  },
  "member.invite_resent": {
    label: "Resent invitation",
    icon: <MailIcon className="size-3.5" />,
    tone: "secondary",
    kind: "update",
  },
  "member.role_changed": {
    label: "Changed role",
    icon: <ShieldCheckIcon className="size-3.5" />,
    tone: "default",
    kind: "update",
  },
  "member.removed": {
    label: "Removed member",
    icon: <UserMinusIcon className="size-3.5" />,
    tone: "destructive",
    kind: "delete",
  },
}

function fallbackMeta(action: string): ActionMeta {
  return {
    label: action,
    icon: <UserPlusIcon className="size-3.5" />,
    tone: "secondary",
    kind: "update",
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

export type AuditEventRow = {
  id: string
  action: string
  actorName: string
  actorEmail: string
  targetLabel: string | null
  metadata: unknown
  createdAt: Date | string
}

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

const KINDS: Array<OperationKind | "all"> = ["all", "create", "update", "delete"]
const KIND_DOT: Record<OperationKind, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
}

export function AuditLogView({ events }: { events: AuditEventRow[] }) {
  const [kindFilter, setKindFilter] = React.useState<OperationKind | "all">("all")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)

  const decorated = React.useMemo(
    () =>
      events.map((e) => ({
        ...e,
        when: asDate(e.createdAt),
        meta: actionMeta[e.action] ?? fallbackMeta(e.action),
      })),
    [events]
  )

  const filtered = decorated.filter((event) => {
    if (kindFilter !== "all" && event.meta.kind !== kindFilter) return false
    if (dateRange?.from) {
      const start = new Date(dateRange.from)
      start.setHours(0, 0, 0, 0)
      if (event.when < start) return false
    }
    if (dateRange?.to) {
      const end = new Date(dateRange.to)
      end.setHours(23, 59, 59, 999)
      if (event.when > end) return false
    }
    return true
  })

  const countByKind = (kind: OperationKind) =>
    decorated.filter((e) => e.meta.kind === kind).length

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

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((kind) => {
              const isActive = kindFilter === kind
              const count =
                kind === "all" ? decorated.length : countByKind(kind)
              return (
                <button
                  key={kind}
                  onClick={() => setKindFilter(kind)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {kind !== "all" && (
                    <span className={`size-1.5 rounded-full ${KIND_DOT[kind]}`} />
                  )}
                  <span className="capitalize">{kind}</span>
                  <span
                    className={
                      isActive ? "text-background/70" : "text-muted-foreground"
                    }
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start gap-2 text-xs font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="size-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} –{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Pick a date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-xs font-medium">Filter by date</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setDateRange(undefined)}
                  disabled={!dateRange}
                >
                  Clear
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                defaultMonth={dateRange?.from}
              />
            </PopoverContent>
          </Popover>
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No events match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((event) => {
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
                            variant={
                              event.meta.tone === "destructive"
                                ? "destructive"
                                : event.meta.tone === "default"
                                ? "default"
                                : "secondary"
                            }
                            className="gap-1"
                          >
                            {event.meta.icon}
                            {event.meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {event.targetLabel ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            {details && (
                              <span className="text-xs text-muted-foreground">
                                {details}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatWhen(event.when)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {events.length} entries
        </p>
      </div>
    </div>
  )
}
