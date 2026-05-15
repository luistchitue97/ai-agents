import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000)
}

const agents = [
  {
    name: "Research Agent",
    description: "Searches the web and delivers structured summaries on demand.",
    model: "Claude Opus 4.7",
    status: "active" as const,
    tasksCompleted: 142,
    lastActive: minutesAgo(0),
    capabilities: ["Web search", "Summarisation", "Citation"],
  },
  {
    name: "Data Analyst",
    description: "Queries datasets, runs statistical analysis, and generates reports.",
    model: "Claude Sonnet 4.6",
    status: "active" as const,
    tasksCompleted: 87,
    lastActive: minutesAgo(2),
    capabilities: ["SQL", "Charting", "Forecasting"],
  },
  {
    name: "Code Reviewer",
    description: "Reviews pull requests for bugs, security issues, and style compliance.",
    model: "Claude Sonnet 4.6",
    status: "idle" as const,
    tasksCompleted: 214,
    lastActive: minutesAgo(60),
    capabilities: ["Code review", "Security scan", "Suggestions"],
  },
  {
    name: "Customer Support",
    description: "Handles first-line inquiries, routes complex cases, and drafts responses.",
    model: "Claude Haiku 4.5",
    status: "active" as const,
    tasksCompleted: 1038,
    lastActive: minutesAgo(0),
    capabilities: ["Triage", "Drafting", "Escalation"],
  },
  {
    name: "Content Writer",
    description: "Drafts blog posts, documentation, and marketing copy from briefs.",
    model: "Claude Sonnet 4.6",
    status: "paused" as const,
    tasksCompleted: 56,
    lastActive: minutesAgo(60 * 24 * 3),
    capabilities: ["Copywriting", "SEO", "Editing"],
  },
  {
    name: "Email Assistant",
    description: "Monitors your inbox, drafts replies, and flags priority threads.",
    model: "Claude Haiku 4.5",
    status: "paused" as const,
    tasksCompleted: 329,
    lastActive: minutesAgo(60 * 24 * 2),
    capabilities: ["Inbox triage", "Drafting", "Scheduling"],
  },
]

async function main() {
  await prisma.agent.deleteMany()
  for (const a of agents) {
    await prisma.agent.create({ data: a })
  }
  console.log(`Seeded ${agents.length} agents.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
