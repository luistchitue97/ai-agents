export type AgentStatus = "active" | "idle" | "paused"

export type Agent = {
  id: number
  name: string
  description: string
  model: string
  status: AgentStatus
  tasksCompleted: number
  lastActive: string
  capabilities: string[]
}

export const agentsData: Agent[] = [
  {
    id: 1,
    name: "Research Agent",
    description: "Searches the web and delivers structured summaries on demand.",
    model: "Claude Opus 4.7",
    status: "active",
    tasksCompleted: 142,
    lastActive: "Just now",
    capabilities: ["Web search", "Summarisation", "Citation"],
  },
  {
    id: 2,
    name: "Data Analyst",
    description: "Queries datasets, runs statistical analysis, and generates reports.",
    model: "Claude Sonnet 4.6",
    status: "active",
    tasksCompleted: 87,
    lastActive: "2 min ago",
    capabilities: ["SQL", "Charting", "Forecasting"],
  },
  {
    id: 3,
    name: "Code Reviewer",
    description: "Reviews pull requests for bugs, security issues, and style compliance.",
    model: "Claude Sonnet 4.6",
    status: "idle",
    tasksCompleted: 214,
    lastActive: "1 hr ago",
    capabilities: ["Code review", "Security scan", "Suggestions"],
  },
  {
    id: 4,
    name: "Customer Support",
    description: "Handles first-line inquiries, routes complex cases, and drafts responses.",
    model: "Claude Haiku 4.5",
    status: "active",
    tasksCompleted: 1038,
    lastActive: "Just now",
    capabilities: ["Triage", "Drafting", "Escalation"],
  },
  {
    id: 5,
    name: "Content Writer",
    description: "Drafts blog posts, documentation, and marketing copy from briefs.",
    model: "Claude Sonnet 4.6",
    status: "paused",
    tasksCompleted: 56,
    lastActive: "3 days ago",
    capabilities: ["Copywriting", "SEO", "Editing"],
  },
  {
    id: 6,
    name: "Email Assistant",
    description: "Monitors your inbox, drafts replies, and flags priority threads.",
    model: "Claude Haiku 4.5",
    status: "paused",
    tasksCompleted: 329,
    lastActive: "2 days ago",
    capabilities: ["Inbox triage", "Drafting", "Scheduling"],
  },
]

export const MODELS = [
  "Claude Opus 4.7",
  "Claude Sonnet 4.6",
  "Claude Haiku 4.5",
] as const
