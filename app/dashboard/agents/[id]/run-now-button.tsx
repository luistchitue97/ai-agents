"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon, PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { runAgentNow } from "../actions"

export function RunNowButton({ agentId }: { agentId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function onClick() {
    startTransition(async () => {
      try {
        const { runId, status } = await runAgentNow(agentId)
        if (status === "succeeded") {
          toast.success("Run complete")
        } else {
          toast.error("Run failed — see details")
        }
        router.push(`/dashboard/agents/${agentId}/runs/${runId}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to run agent.")
      }
    })
  }

  return (
    <Button size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2Icon className="animate-spin" />
          Running...
        </>
      ) : (
        <>
          <PlayIcon />
          Run now
        </>
      )}
    </Button>
  )
}
