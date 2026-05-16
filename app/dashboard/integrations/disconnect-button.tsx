"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { disconnectIntegration } from "./actions"

export function DisconnectButton({
  connectionId,
  providerName,
  className,
}: {
  connectionId: string
  providerName: string
  className?: string
}) {
  const [isPending, startTransition] = React.useTransition()

  return (
    <Button
      size="sm"
      variant="outline"
      className={className ?? "w-full"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await disconnectIntegration(connectionId)
            toast.success(`${providerName} disconnected`)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to disconnect.")
          }
        })
      }
    >
      {isPending ? "Disconnecting..." : "Disconnect"}
    </Button>
  )
}
