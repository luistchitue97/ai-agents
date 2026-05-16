"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  ArrowLeftIcon,
  BotIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  DownloadIcon,
  InfoIcon,
  SearchIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type LogLevel = "info" | "success" | "warning" | "error"

type LogEntry = {
  id: number
  level: LogLevel
  message: string
  durationMs: number | null
  createdAt: Date | string
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

const levelConfig: Record<
  LogLevel,
  { label: string; icon: React.ElementType; rowClass: string; badgeClass: string }
> = {
  info: {
    label: "Info",
    icon: InfoIcon,
    rowClass: "border-l-blue-400/50",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  success: {
    label: "Success",
    icon: CircleCheckIcon,
    rowClass: "border-l-green-400/50",
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  warning: {
    label: "Warning",
    icon: CircleAlertIcon,
    rowClass: "border-l-yellow-400/50",
    badgeClass: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  error: {
    label: "Error",
    icon: CircleXIcon,
    rowClass: "border-l-red-400/50",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20",
  },
}

const LEVELS: Array<LogLevel | "all"> = ["all", "info", "success", "warning", "error"]

const PAGE_SIZE = 10

export function AgentLogsView({
  agent,
  logs: allLogs,
}: {
  agent: { id: number; name: string }
  logs: LogEntry[]
}) {
  const [levelFilter, setLevelFilter] = React.useState<LogLevel | "all">("all")
  const [search, setSearch] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
  const [pageIndex, setPageIndex] = React.useState(0)

  React.useEffect(() => {
    setPageIndex(0)
  }, [levelFilter, search, dateRange])

  const filtered = allLogs.filter((log) => {
    const matchesLevel = levelFilter === "all" || log.level === levelFilter
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase())
    let matchesDate = true
    const logDate = asDate(log.createdAt)
    if (dateRange?.from) {
      const start = new Date(dateRange.from)
      start.setHours(0, 0, 0, 0)
      matchesDate = logDate >= start
    }
    if (matchesDate && dateRange?.to) {
      const end = new Date(dateRange.to)
      end.setHours(23, 59, 59, 999)
      matchesDate = logDate <= end
    }
    return matchesLevel && matchesSearch && matchesDate
  })

  const countByLevel = (level: LogLevel) => allLogs.filter((l) => l.level === level).length

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  if (safePageIndex !== pageIndex) {
    queueMicrotask(() => setPageIndex(safePageIndex))
  }
  const pageStart = safePageIndex * PAGE_SIZE
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const canPrev = safePageIndex > 0
  const canNext = safePageIndex < pageCount - 1

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

        {/* Back */}
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
            <Link href={`/dashboard/agents/${agent.id}`}>
              <ArrowLeftIcon />
              {agent.name}
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BotIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Logs</h1>
              <p className="text-sm text-muted-foreground">{agent.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <DownloadIcon />
            Download logs
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Level filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((level) => {
              const isActive = levelFilter === level
              const count = level === "all" ? allLogs.length : countByLevel(level)
              return (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {level !== "all" && (
                    <span
                      className={`size-1.5 rounded-full ${
                        level === "info" ? "bg-blue-500" :
                        level === "success" ? "bg-green-500" :
                        level === "warning" ? "bg-yellow-500" :
                        "bg-red-500"
                      }`}
                    />
                  )}
                  <span className="capitalize">{level}</span>
                  <span className={`${isActive ? "text-background/70" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Date range + Search */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                        {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}
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

            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
          </div>
        </div>

        {/* Log list */}
        <div className="overflow-hidden rounded-lg border">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <InfoIcon className="size-5" />
              No log entries match your filter.
            </div>
          ) : (
            <div className="divide-y">
              {paged.map((log) => {
                const cfg = levelConfig[log.level]
                const Icon = cfg.icon
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-4 border-l-2 px-4 py-3 ${cfg.rowClass}`}
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
                      {format(asDate(log.createdAt), "HH:mm:ss")}
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 gap-1 text-[10px] ${cfg.badgeClass}`}
                    >
                      <Icon className="size-2.5" />
                      {cfg.label}
                    </Badge>
                    <span className="flex-1 text-sm leading-relaxed">
                      {log.message}
                    </span>
                    {log.durationMs !== null && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {formatDuration(log.durationMs)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "No entries"
              : `Showing ${pageStart + 1}–${pageStart + paged.length} of ${filtered.length}${
                  filtered.length !== allLogs.length ? ` (filtered from ${allLogs.length})` : ""
                }`}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium">
              Page {safePageIndex + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => setPageIndex(0)}
                disabled={!canPrev}
                aria-label="Go to first page"
              >
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={!canPrev}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() =>
                  setPageIndex((i) => Math.min(pageCount - 1, i + 1))
                }
                disabled={!canNext}
                aria-label="Go to next page"
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={!canNext}
                aria-label="Go to last page"
              >
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
