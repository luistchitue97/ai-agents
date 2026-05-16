import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { withAuth } from "@workos-inc/authkit-nextjs"
import {
  ArrowLeftIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleXIcon,
  Loader2Icon,
  MessageSquareIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

const statusMeta = {
  pending: {
    label: "Pending",
    tone: "secondary" as const,
    icon: <CircleDashedIcon className="size-3.5" />,
  },
  running: {
    label: "Running",
    tone: "secondary" as const,
    icon: <Loader2Icon className="size-3.5 animate-spin" />,
  },
  succeeded: {
    label: "Succeeded",
    tone: "default" as const,
    icon: <CheckCircle2Icon className="size-3.5" />,
  },
  failed: {
    label: "Failed",
    tone: "destructive" as const,
    icon: <CircleXIcon className="size-3.5" />,
  },
}

function formatDuration(start: Date, end: Date | null): string {
  const e = end ?? new Date()
  const ms = e.getTime() - start.getTime()
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.floor((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default async function AgentRunPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>
}) {
  const { id, runId } = await params
  const { organizationId } = await withAuth({ ensureSignedIn: true })

  const run = organizationId
    ? await prisma.agentRun.findFirst({
        where: {
          id: runId,
          organizationId,
          agentId: Number(id),
        },
        include: {
          agent: { select: { id: true, name: true, model: true } },
          steps: { orderBy: { sequence: "asc" } },
        },
      })
    : null

  if (!run) notFound()

  const meta = statusMeta[run.status]
  const errorStep = run.steps.find((s) => s.kind === "error")

  // Token usage is stashed on any of the response steps (we updateMany at the end).
  const responseSteps = run.steps.filter((s) => s.kind === "response")
  const lastResponseWithUsage = [...responseSteps].reverse().find(
    (s) =>
      s.toolOutput &&
      typeof s.toolOutput === "object" &&
      !Array.isArray(s.toolOutput) &&
      "inputTokens" in (s.toolOutput as Record<string, unknown>)
  )
  const usage = lastResponseWithUsage?.toolOutput as
    | Record<string, number>
    | undefined

  // Pair up tool_call + tool_result for the timeline (same toolName, adjacent sequences).
  const timeline: TimelineRow[] = []
  for (let i = 0; i < run.steps.length; i++) {
    const step = run.steps[i]
    if (step.kind === "prompt") {
      timeline.push({ kind: "prompt", content: step.content })
    } else if (step.kind === "response") {
      if (step.content && step.content.trim().length > 0) {
        timeline.push({ kind: "response", content: step.content })
      }
    } else if (step.kind === "tool_call") {
      // Look ahead for the matching tool_result.
      const next = run.steps[i + 1]
      const paired =
        next && next.kind === "tool_result" && next.toolName === step.toolName
          ? next
          : null
      timeline.push({
        kind: "tool",
        toolName: step.toolName ?? "(unknown)",
        input: step.toolInput,
        output: paired?.toolOutput ?? null,
        hasResult: Boolean(paired),
      })
      if (paired) i += 1 // skip the result; we consumed it
    } else if (step.kind === "tool_result") {
      // Orphan tool_result (no preceding call). Render as a row anyway.
      timeline.push({
        kind: "tool",
        toolName: step.toolName ?? "(unknown)",
        input: null,
        output: step.toolOutput,
        hasResult: true,
      })
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        {/* Back */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            asChild
          >
            <Link href={`/dashboard/agents/${run.agent.id}`}>
              <ArrowLeftIcon />
              {run.agent.name}
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BotIcon className="size-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Run</h1>
                <Badge variant={meta.tone} className="gap-1">
                  {meta.icon}
                  {meta.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {run.agent.name} · {run.agent.model} ·{" "}
                {format(run.startedAt, "MMM d, yyyy 'at' h:mm a")} ·{" "}
                {formatDuration(run.startedAt, run.finishedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {run.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>
                The model&apos;s final answer for this run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                {run.summary}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {errorStep && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Error</CardTitle>
              <CardDescription>
                {run.errorMessage ?? "The run did not complete."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs text-destructive">
                {errorStep.content}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
              <CardDescription>
                What the model thought and which tools it called, in order.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {timeline.map((row, i) => (
                <TimelineEntry key={i} row={row} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Triggered by" value={run.triggeredByName} />
            <Row label="Email" value={run.triggeredByEmail} />
            <Row
              label="Started"
              value={format(run.startedAt, "MMM d, yyyy 'at' h:mm:ss a")}
            />
            <Row
              label="Finished"
              value={
                run.finishedAt
                  ? format(run.finishedAt, "MMM d, yyyy 'at' h:mm:ss a")
                  : "—"
              }
            />
            {usage && (
              <>
                <Row
                  label="Total input tokens"
                  value={String(usage.inputTokens ?? "—")}
                />
                <Row
                  label="Total output tokens"
                  value={String(usage.outputTokens ?? "—")}
                />
                {Number(usage.cacheReadTokens ?? 0) > 0 && (
                  <Row
                    label="Cached tokens read"
                    value={String(usage.cacheReadTokens)}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type TimelineRow =
  | { kind: "prompt"; content: string | null }
  | { kind: "response"; content: string }
  | {
      kind: "tool"
      toolName: string
      input: unknown
      output: unknown
      hasResult: boolean
    }

function TimelineEntry({ row }: { row: TimelineRow }) {
  if (row.kind === "prompt") {
    return (
      <details className="group rounded-md border bg-muted/30">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
          <MessageSquareIcon className="size-3.5 text-muted-foreground" />
          Initial prompt
          <span className="ml-auto text-[10px] text-muted-foreground group-open:hidden">
            Click to expand
          </span>
        </summary>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-t px-3 py-2 font-mono text-[11px] leading-relaxed">
          {row.content}
        </pre>
      </details>
    )
  }

  if (row.kind === "response") {
    return (
      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
        <div className="flex items-center gap-2 pb-1.5 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          Assistant
        </div>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
          {row.content}
        </pre>
      </div>
    )
  }

  // tool
  return (
    <details className="group rounded-md border">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
        <WrenchIcon className="size-3.5 text-muted-foreground" />
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
          {row.toolName}
        </code>
        {!row.hasResult && (
          <Badge variant="destructive" className="text-[10px]">
            no result
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground group-open:hidden">
          Click to expand
        </span>
      </summary>
      <div className="grid gap-2 border-t px-3 py-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Input
          </span>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted px-2 py-1.5 font-mono text-[10px] leading-relaxed">
            {row.input ? safeStringify(row.input) : "—"}
          </pre>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Output
          </span>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted px-2 py-1.5 font-mono text-[10px] leading-relaxed">
            {row.output ? safeStringify(row.output) : "—"}
          </pre>
        </div>
      </div>
    </details>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
