"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BotIcon, Loader2Icon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { listAgents } from "@/app/dashboard/agents/actions"

type AgentResult = Awaited<ReturnType<typeof listAgents>>[number]

const statusDot: Record<AgentResult["status"], string> = {
  active: "bg-green-500",
  idle: "bg-yellow-500",
  paused: "bg-muted-foreground/40",
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [agents, setAgents] = React.useState<AgentResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const handleOpen = () => setOpen(true)

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("command-menu:open", handleOpen)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("command-menu:open", handleOpen)
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    listAgents()
      .then((rows) => {
        if (!cancelled) setAgents(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const navigate = React.useCallback(
    (id: number) => {
      setOpen(false)
      router.push(`/dashboard/agents/${id}`)
    },
    [router]
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search agents by name, description, or model..." />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading agents...
          </div>
        ) : (
          <>
            <CommandEmpty>No agents match your search.</CommandEmpty>
            {agents.length > 0 && (
              <CommandGroup heading="Agents">
                {agents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    value={`${agent.name} ${agent.description} ${agent.model}`}
                    onSelect={() => navigate(agent.id)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <BotIcon className="size-3.5 text-primary" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {agent.description}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`size-1.5 rounded-full ${statusDot[agent.status]}`} />
                      {agent.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
