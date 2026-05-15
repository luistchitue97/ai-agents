import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ActivityIcon,
  ArrowLeftIcon,
  BotIcon,
  ScrollTextIcon,
  PauseIcon,
  PlayIcon,
  SaveIcon,
  Trash2Icon,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { prisma } from "@/lib/prisma"

import { formatLastActive, MODELS, type AgentStatus } from "../data"

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  idle: { label: "Idle", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
}

export default async function AgentConfigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const row = await prisma.agent.findUnique({ where: { id: Number(id) } })

  if (!row) notFound()

  const agent = {
    ...row,
    lastActive: formatLastActive(row.lastActive),
  }

  const status = statusConfig[agent.status]

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

        {/* Breadcrumb / back */}
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
            <Link href="/dashboard/agents">
              <ArrowLeftIcon />
              Agents
            </Link>
          </Button>
        </div>

        {/* Agent header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BotIcon className="size-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{agent.name}</h1>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {agent.model} &middot;{" "}
                <span className="inline-flex items-center gap-1">
                  <ActivityIcon className="size-3" />
                  {agent.tasksCompleted.toLocaleString()} tasks
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/agents/${agent.id}/logs`}>
                <ScrollTextIcon />
                View logs
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              {agent.status === "paused" ? (
                <><PlayIcon />Resume</>
              ) : (
                <><PauseIcon />Pause</>
              )}
            </Button>
            <Button size="sm">
              <SaveIcon />
              Save changes
            </Button>
          </div>
        </div>

        <Separator />

        {/* Config sections */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">

            {/* General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">General</CardTitle>
                <CardDescription className="text-xs">
                  Basic identity and description of this agent.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-sm">Name</Label>
                  <Input id="name" defaultValue={agent.name} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <Input id="description" defaultValue={agent.description} />
                </div>
              </CardContent>
            </Card>

            {/* Model */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Model</CardTitle>
                <CardDescription className="text-xs">
                  The Claude model powering this agent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="model" className="text-sm">Model</Label>
                  <Select defaultValue={agent.model}>
                    <SelectTrigger id="model" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {MODELS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capabilities</CardTitle>
                <CardDescription className="text-xs">
                  Skills this agent is allowed to use.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
                    {cap}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  + Add capability
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Sidebar info + danger */}
          <div className="flex flex-col gap-6">

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Stats</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks completed</span>
                  <span className="font-medium tabular-nums">
                    {agent.tasksCompleted.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last active</span>
                  <span className="font-medium">{agent.lastActive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={`${status.className} text-xs`}>
                    {status.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
                <CardDescription className="text-xs">
                  Permanently delete this agent and all its data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2Icon />
                  Delete agent
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
