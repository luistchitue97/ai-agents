import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BotIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  ActivityIcon,
} from "lucide-react"

type AgentStatus = "active" | "idle" | "paused"

const agents = [
  {
    name: "Research Agent",
    description: "Searches the web, synthesises findings, and delivers structured summaries on demand.",
    model: "Claude Opus 4.7",
    status: "active" as AgentStatus,
    tasksCompleted: 142,
    lastActive: "Just now",
    capabilities: ["Web search", "Summarisation", "Citation"],
  },
  {
    name: "Data Analyst",
    description: "Queries datasets, runs statistical analysis, and generates charts and narrative reports.",
    model: "Claude Sonnet 4.6",
    status: "active" as AgentStatus,
    tasksCompleted: 87,
    lastActive: "2 min ago",
    capabilities: ["SQL", "Charting", "Forecasting"],
  },
  {
    name: "Code Reviewer",
    description: "Reviews pull requests for bugs, security issues, and style compliance before merge.",
    model: "Claude Sonnet 4.6",
    status: "idle" as AgentStatus,
    tasksCompleted: 214,
    lastActive: "1 hr ago",
    capabilities: ["Code review", "Security scan", "Suggestions"],
  },
  {
    name: "Customer Support",
    description: "Handles first-line customer inquiries, routes complex cases, and drafts responses.",
    model: "Claude Haiku 4.5",
    status: "active" as AgentStatus,
    tasksCompleted: 1038,
    lastActive: "Just now",
    capabilities: ["Triage", "Drafting", "Escalation"],
  },
  {
    name: "Content Writer",
    description: "Drafts blog posts, documentation, and marketing copy from briefs or outlines.",
    model: "Claude Sonnet 4.6",
    status: "paused" as AgentStatus,
    tasksCompleted: 56,
    lastActive: "3 days ago",
    capabilities: ["Copywriting", "SEO", "Editing"],
  },
  {
    name: "Email Assistant",
    description: "Monitors your inbox, drafts replies, and flags high-priority threads for review.",
    model: "Claude Haiku 4.5",
    status: "paused" as AgentStatus,
    tasksCompleted: 329,
    lastActive: "2 days ago",
    capabilities: ["Inbox triage", "Drafting", "Scheduling"],
  },
]

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  idle: { label: "Idle", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
}

export default function AgentsPage() {
  const activeCount = agents.filter((a) => a.status === "active").length

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} of {agents.length} agents running
            </p>
          </div>
          <Button>
            <PlusIcon />
            New Agent
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const status = statusConfig[agent.status]
            return (
              <Card key={agent.name} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                        <BotIcon className="size-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm">{agent.name}</CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={status.className}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-relaxed pt-1">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-[10px]">
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1">
                      <ActivityIcon className="size-3" />
                      {agent.tasksCompleted} tasks
                    </span>
                    <span>{agent.lastActive}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>Model:</span>
                    <span className="font-medium text-foreground">{agent.model}</span>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      {agent.status === "paused" ? (
                        <><PlayIcon />Resume</>
                      ) : (
                        <><PauseIcon />Pause</>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <SettingsIcon className="size-4" />
                      <span className="sr-only">Configure {agent.name}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
