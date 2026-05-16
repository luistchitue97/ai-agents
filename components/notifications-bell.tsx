"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  BellIcon,
  BotIcon,
  CheckCheckIcon,
  MailIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  UserMinusIcon,
} from "lucide-react"

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type NotificationRow,
} from "@/app/dashboard/notification-actions"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const POLL_INTERVAL_MS = 30_000

const typeIcon: Record<string, React.ReactNode> = {
  "agent.created": <BotIcon className="size-4" />,
  "integration.connected": <PlugZapIcon className="size-4" />,
  "member.role_changed": <ShieldCheckIcon className="size-4" />,
  "member.invited": <MailIcon className="size-4" />,
  "member.removed": <UserMinusIcon className="size-4" />,
}

function iconFor(type: string): React.ReactNode {
  return typeIcon[type] ?? <BellIcon className="size-4" />
}

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationRow[]>([])
  const [unread, setUnread] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [isPending, startTransition] = React.useTransition()

  const refresh = React.useCallback(() => {
    listNotifications()
      .then(({ notifications, unreadCount }) => {
        setItems(notifications)
        setUnread(unreadCount)
      })
      .catch(() => {
        // Best-effort — keep last known state if the fetch fails.
      })
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  function onMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setUnread(0)
      setItems((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date() }))
      )
    })
  }

  function onItemClick(n: NotificationRow) {
    // Optimistically mark this one read.
    if (!n.readAt) {
      setUnread((c) => Math.max(0, c - 1))
      setItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, readAt: new Date() } : p))
      )
      startTransition(async () => {
        await markNotificationsRead([n.id])
      })
    }
    if (n.link) {
      setOpen(false)
      router.push(n.link)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <BellIcon className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {unread} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onMarkAll}
            disabled={unread === 0 || isPending}
          >
            <CheckCheckIcon className="size-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-muted-foreground">
              <BellIcon className="size-6 opacity-40" />
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const unread = !n.readAt
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                        unread ? "bg-muted/30" : ""
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                          unread
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {iconFor(n.type)}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{n.title}</span>
                          {unread && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </span>
                        {n.body && (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
