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
  const promptStep = run.steps.find((s) => s.kind === "prompt")
  const responseStep = run.steps.find((s) => s.kind === "response")
  const errorStep = run.steps.find((s) => s.kind === "error")
  const usage =
    responseStep?.toolOutput &&
    typeof responseStep.toolOutput === "object" &&
    !Array.isArray(responseStep.toolOutput)
      ? (responseStep.toolOutput as Record<string, unknown>)
      : null

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
                The model&apos;s final output for this run.
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

        {/* Prompt */}
        {promptStep && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt sent to the model</CardTitle>
              <CardDescription>
                What this agent saw when it ran. Phase 2 stuffs context inline;
                Phase 3 will swap this for tool calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">
                {promptStep.content}
              </pre>
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
                  label="Input tokens"
                  value={String(usage.inputTokens ?? "—")}
                />
                <Row
                  label="Output tokens"
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
