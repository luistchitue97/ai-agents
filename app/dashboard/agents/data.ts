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

export const MODELS = [
  "Claude Opus 4.7",
  "Claude Sonnet 4.6",
  "Claude Haiku 4.5",
] as const

export function formatLastActive(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
}
