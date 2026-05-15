"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  ArrowLeftIcon,
  BotIcon,
  CalendarIcon,
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
  timestamp: string
  level: LogLevel
  message: string
  duration?: string
  date: Date
}

type RawLogEntry = Omit<LogEntry, "date">

function distributeDates(logs: RawLogEntry[]): LogEntry[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return logs.map((log, i) => {
    const daysAgo = Math.floor(i / 2)
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    const [h, m, s] = log.timestamp.split(":").map(Number)
    d.setHours(h, m, s, 0)
    return { ...log, date: d }
  })
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

function buildLogs(agentId: number): LogEntry[] {
  const logSets: Record<number, RawLogEntry[]> = {
    1: [
      { id: 1, timestamp: "14:23:12", level: "success", message: "Summary generated and delivered to user.", duration: "4.1s" },
      { id: 2, timestamp: "14:23:08", level: "info", message: "Summarising top 5 results from search." },
      { id: 3, timestamp: "14:23:05", level: "info", message: "Filtering and ranking results by relevance." },
      { id: 4, timestamp: "14:23:04", level: "success", message: "Retrieved 12 results from search API.", duration: "3.2s" },
      { id: 5, timestamp: "14:23:01", level: "info", message: 'Starting web search for "AI trends 2025".' },
      { id: 6, timestamp: "14:22:44", level: "warning", message: "Rate limit approaching: 8/10 requests used in current window." },
      { id: 7, timestamp: "14:22:01", level: "error", message: "Connection timeout to search API. Retrying (1/3)." },
      { id: 8, timestamp: "14:21:58", level: "info", message: "New task received from user." },
      { id: 9, timestamp: "14:21:00", level: "success", message: "Previous task completed successfully.", duration: "6.8s" },
      { id: 10, timestamp: "14:20:53", level: "info", message: "Fetching citations for summarised content." },
      { id: 11, timestamp: "14:20:40", level: "info", message: 'Starting web search for "quantum computing breakthroughs".' },
      { id: 12, timestamp: "14:19:30", level: "success", message: "Agent initialised and ready.", duration: "0.4s" },
    ],
    2: [
      { id: 1, timestamp: "15:10:45", level: "success", message: "Forecast report exported to Data Library.", duration: "1.2s" },
      { id: 2, timestamp: "15:10:30", level: "info", message: "Generating 30-day revenue forecast chart." },
      { id: 3, timestamp: "15:10:12", level: "info", message: "Running linear regression on Q1–Q2 dataset." },
      { id: 4, timestamp: "15:09:58", level: "success", message: "SQL query executed: 4,821 rows returned.", duration: "0.9s" },
      { id: 5, timestamp: "15:09:55", level: "info", message: "Connecting to primary data warehouse." },
      { id: 6, timestamp: "15:08:20", level: "warning", message: "Dataset contains 3 null values in 'revenue' column. Interpolating." },
      { id: 7, timestamp: "15:07:44", level: "error", message: "Query timeout after 30s. Optimising and retrying." },
      { id: 8, timestamp: "15:07:40", level: "info", message: "Received analysis request: monthly sales breakdown." },
      { id: 9, timestamp: "15:06:00", level: "success", message: "Pivot table generated for regional performance.", duration: "2.3s" },
      { id: 10, timestamp: "15:05:10", level: "info", message: "Agent initialised and ready.", },
    ],
    3: [
      { id: 1, timestamp: "11:45:02", level: "success", message: "Review comment posted on PR #312.", duration: "0.3s" },
      { id: 2, timestamp: "11:44:50", level: "warning", message: "Potential SQL injection risk detected in src/api/users.ts:48." },
      { id: 3, timestamp: "11:44:35", level: "info", message: "Scanning 6 changed files in PR #312." },
      { id: 4, timestamp: "11:44:30", level: "info", message: "Received review request for PR #312: 'Add user auth endpoint'." },
      { id: 5, timestamp: "11:30:15", level: "success", message: "Style suggestions applied — 4 issues resolved.", duration: "0.2s" },
      { id: 6, timestamp: "11:30:10", level: "info", message: "Checking code style against ESLint ruleset." },
      { id: 7, timestamp: "11:30:05", level: "error", message: "Unhandled promise rejection found in src/jobs/sync.ts:102." },
      { id: 8, timestamp: "11:29:50", level: "info", message: "Scanning diff for PR #311." },
      { id: 9, timestamp: "11:00:00", level: "success", message: "Agent initialised and ready.", duration: "0.5s" },
    ],
    4: [
      { id: 1, timestamp: "16:02:10", level: "success", message: "Reply drafted and queued for review.", duration: "1.8s" },
      { id: 2, timestamp: "16:02:05", level: "info", message: "Composing response for ticket #8841." },
      { id: 3, timestamp: "16:01:58", level: "info", message: "Matched ticket #8841 to FAQ: billing cycle questions." },
      { id: 4, timestamp: "16:01:55", level: "info", message: "New ticket received: 'Subscription charge question'." },
      { id: 5, timestamp: "16:00:40", level: "warning", message: "Ticket #8839 escalated — sentiment score below threshold (0.21)." },
      { id: 6, timestamp: "16:00:20", level: "success", message: "Ticket #8838 resolved and closed.", duration: "3.4s" },
      { id: 7, timestamp: "15:59:50", level: "info", message: "Routing ticket #8837 to billing team." },
      { id: 8, timestamp: "15:59:30", level: "error", message: "CRM API returned 503. Ticket #8836 queued for retry." },
      { id: 9, timestamp: "15:58:00", level: "info", message: "Processing 5 queued tickets." },
      { id: 10, timestamp: "15:55:00", level: "success", message: "Agent initialised and ready.", duration: "0.6s" },
    ],
    5: [
      { id: 1, timestamp: "09:15:30", level: "info", message: "Agent paused by user." },
      { id: 2, timestamp: "09:15:20", level: "success", message: "Blog post draft saved to Word Assistant.", duration: "0.7s" },
      { id: 3, timestamp: "09:15:00", level: "info", message: "Refining tone and SEO keywords in draft." },
      { id: 4, timestamp: "09:14:30", level: "info", message: "Generating outline for 'Top 10 SaaS Trends 2025'." },
      { id: 5, timestamp: "09:14:00", level: "warning", message: "Brief is vague — proceeding with inferred context." },
      { id: 6, timestamp: "09:13:55", level: "info", message: "Received content brief from user." },
      { id: 7, timestamp: "09:00:00", level: "success", message: "Agent initialised and ready.", duration: "0.4s" },
    ],
    6: [
      { id: 1, timestamp: "08:30:05", level: "info", message: "Agent paused by user." },
      { id: 2, timestamp: "08:30:00", level: "success", message: "Draft reply sent to Drafts folder.", duration: "0.5s" },
      { id: 3, timestamp: "08:29:45", level: "info", message: "Drafting reply to Sarah (Re: Q3 Budget Review)." },
      { id: 4, timestamp: "08:29:30", level: "warning", message: "3 emails flagged as high priority and surfaced for review." },
      { id: 5, timestamp: "08:29:00", level: "info", message: "Scanning inbox: 14 new messages." },
      { id: 6, timestamp: "08:28:50", level: "error", message: "OAuth token expired. Re-authenticating with mail provider." },
      { id: 7, timestamp: "08:28:40", level: "info", message: "Connecting to mail provider." },
      { id: 8, timestamp: "08:00:00", level: "success", message: "Agent initialised and ready.", duration: "0.3s" },
    ],
  }

  return distributeDates(logSets[agentId] ?? logSets[1])
}

const LEVELS: Array<LogLevel | "all"> = ["all", "info", "success", "warning", "error"]

export function AgentLogsView({ agent }: { agent: { id: number; name: string } }) {
  const allLogs = React.useMemo(() => buildLogs(agent.id), [agent.id])

  const [levelFilter, setLevelFilter] = React.useState<LogLevel | "all">("all")
  const [search, setSearch] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)

  const filtered = allLogs.filter((log) => {
    const matchesLevel = levelFilter === "all" || log.level === levelFilter
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase())
    let matchesDate = true
    if (dateRange?.from) {
      const start = new Date(dateRange.from)
      start.setHours(0, 0, 0, 0)
      matchesDate = log.date >= start
    }
    if (matchesDate && dateRange?.to) {
      const end = new Date(dateRange.to)
      end.setHours(23, 59, 59, 999)
      matchesDate = log.date <= end
    }
    return matchesLevel && matchesSearch && matchesDate
  })

  const countByLevel = (level: LogLevel) => allLogs.filter((l) => l.level === level).length

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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <InfoIcon className="size-5" />
              No log entries match your filter.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => {
                const cfg = levelConfig[log.level]
                const Icon = cfg.icon
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-4 border-l-2 px-4 py-3 ${cfg.rowClass}`}
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
                      {log.timestamp}
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
                    {log.duration && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {log.duration}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {allLogs.length} entries
        </p>
      </div>
    </div>
  )
}
