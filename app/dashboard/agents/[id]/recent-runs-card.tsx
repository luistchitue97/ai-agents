import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2Icon, CircleDashedIcon, CircleXIcon, Loader2Icon, PlayIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RunRow = {
  id: string
  status: "pending" | "running" | "succeeded" | "failed"
  startedAt: Date
  finishedAt: Date | null
  summary: string | null
  triggeredByName: string
}

const statusMeta: Record<
  RunRow["status"],
  { label: string; tone: "default" | "secondary" | "destructive"; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    tone: "secondary",
    icon: <CircleDashedIcon className="size-3" />,
  },
  running: {
    label: "Running",
    tone: "secondary",
    icon: <Loader2Icon className="size-3 animate-spin" />,
  },
  succeeded: {
    label: "Succeeded",
    tone: "default",
    icon: <CheckCircle2Icon className="size-3" />,
  },
  failed: {
    label: "Failed",
    tone: "destructive",
    icon: <CircleXIcon className="size-3" />,
  },
}

export function RecentRunsCard({
  agentId,
  runs,
}: {
  agentId: number
  runs: RunRow[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent runs</CardTitle>
        <CardDescription className="text-xs">
          The last {runs.length === 0 ? "" : runs.length} {runs.length === 1 ? "run" : "runs"} of this agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-6 text-center">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <PlayIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              No runs yet. Click <span className="font-medium">Run now</span> above.
            </p>
          </div>
        ) : (
          runs.map((run) => {
            const meta = statusMeta[run.status]
            const finished = run.finishedAt ?? run.startedAt
            return (
              <Link
                key={run.id}
                href={`/dashboard/agents/${agentId}/runs/${run.id}`}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={meta.tone} className="gap-1 text-[10px]">
                    {meta.icon}
                    {meta.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(finished, { addSuffix: true })}
                  </span>
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {run.summary ?? "—"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  by {run.triggeredByName}
                </span>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
