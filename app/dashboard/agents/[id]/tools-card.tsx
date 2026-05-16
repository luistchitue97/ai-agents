"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { CheckIcon, PlugZapIcon, SaveIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { setAgentConnections } from "../actions"

export type ToolOption = {
  connectionId: string
  providerId: string
  providerName: string
  iconPath: string
  accountLabel: string
}

export function ToolsCard({
  agentId,
  options,
  initialSelected,
  isAdmin,
}: {
  agentId: number
  options: ToolOption[]
  initialSelected: string[]
  isAdmin: boolean
}) {
  const initialSet = React.useMemo(() => new Set(initialSelected), [initialSelected])
  const [selected, setSelected] = React.useState<Set<string>>(initialSet)
  const [isPending, startTransition] = React.useTransition()

  const dirty = React.useMemo(() => {
    if (selected.size !== initialSet.size) return true
    for (const id of selected) if (!initialSet.has(id)) return true
    return false
  }, [selected, initialSet])

  function toggle(connectionId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(connectionId)) next.delete(connectionId)
      else next.add(connectionId)
      return next
    })
  }

  function onSave() {
    startTransition(async () => {
      try {
        const ids = Array.from(selected)
        await setAgentConnections({ agentId, connectionIds: ids })
        toast.success(
          ids.length === 0
            ? "No tools connected"
            : `${ids.length} tool${ids.length === 1 ? "" : "s"} saved`
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save tools.")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm">Tools</CardTitle>
          <CardDescription className="text-xs">
            Integrations this agent is allowed to use when it runs.
            {!isAdmin && " Only org admins can change this."}
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={onSave} disabled={!dirty || isPending}>
            <SaveIcon />
            {isPending ? "Saving..." : "Save tools"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {options.length === 0 ? (
          <EmptyState />
        ) : (
          options.map((opt) => (
            <ToolRow
              key={opt.connectionId}
              option={opt}
              checked={selected.has(opt.connectionId)}
              disabled={!isAdmin || isPending}
              onToggle={() => toggle(opt.connectionId)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ToolRow({
  option,
  checked,
  disabled,
  onToggle,
}: {
  option: ToolOption
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:bg-muted/40"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      aria-pressed={checked}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-white p-1 dark:bg-white/5">
        <Image
          src={option.iconPath}
          alt={option.providerName}
          width={20}
          height={20}
          className="object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{option.providerName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {option.accountLabel}
        </span>
      </div>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input"
        }`}
        aria-hidden
      >
        {checked && <CheckIcon className="size-3.5" />}
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-md bg-muted">
        <PlugZapIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="mx-auto text-[10px]">
          No tools yet
        </Badge>
        <p className="text-xs text-muted-foreground">
          Connect an integration to give this agent access to data.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/integrations">Browse integrations</Link>
      </Button>
    </div>
  )
}
