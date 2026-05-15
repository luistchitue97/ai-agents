import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000)
}

type SeedLog = {
  level: "info" | "success" | "warning" | "error"
  message: string
  durationMs?: number
  /** Time of day "HH:MM:SS" — paired with daysAgo to build a real DateTime */
  time: string
  daysAgo: number
}

type SeedAgent = {
  name: string
  description: string
  model: string
  status: "active" | "idle" | "paused"
  tasksCompleted: number
  lastActive: Date
  capabilities: string[]
  logs: SeedLog[]
}

function dateAt(daysAgo: number, time: string): Date {
  const [h, m, s] = time.split(":").map(Number)
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, s, 0)
  return d
}

const agents: SeedAgent[] = [
  {
    name: "Research Agent",
    description: "Searches the web and delivers structured summaries on demand.",
    model: "Claude Opus 4.7",
    status: "active",
    tasksCompleted: 142,
    lastActive: minutesAgo(0),
    capabilities: ["Web search", "Summarisation", "Citation"],
    logs: [
      { level: "success", message: "Summary generated and delivered to user.", durationMs: 4100, time: "14:23:12", daysAgo: 0 },
      { level: "info", message: "Summarising top 5 results from search.", time: "14:23:08", daysAgo: 0 },
      { level: "info", message: "Filtering and ranking results by relevance.", time: "14:23:05", daysAgo: 1 },
      { level: "success", message: "Retrieved 12 results from search API.", durationMs: 3200, time: "14:23:04", daysAgo: 1 },
      { level: "info", message: 'Starting web search for "AI trends 2025".', time: "14:23:01", daysAgo: 2 },
      { level: "warning", message: "Rate limit approaching: 8/10 requests used in current window.", time: "14:22:44", daysAgo: 2 },
      { level: "error", message: "Connection timeout to search API. Retrying (1/3).", time: "14:22:01", daysAgo: 3 },
      { level: "info", message: "New task received from user.", time: "14:21:58", daysAgo: 3 },
      { level: "success", message: "Previous task completed successfully.", durationMs: 6800, time: "14:21:00", daysAgo: 4 },
      { level: "info", message: "Fetching citations for summarised content.", time: "14:20:53", daysAgo: 4 },
      { level: "info", message: 'Starting web search for "quantum computing breakthroughs".', time: "14:20:40", daysAgo: 5 },
      { level: "success", message: "Agent initialised and ready.", durationMs: 400, time: "14:19:30", daysAgo: 5 },
    ],
  },
  {
    name: "Data Analyst",
    description: "Queries datasets, runs statistical analysis, and generates reports.",
    model: "Claude Sonnet 4.6",
    status: "active",
    tasksCompleted: 87,
    lastActive: minutesAgo(2),
    capabilities: ["SQL", "Charting", "Forecasting"],
    logs: [
      { level: "success", message: "Forecast report exported to Data Library.", durationMs: 1200, time: "15:10:45", daysAgo: 0 },
      { level: "info", message: "Generating 30-day revenue forecast chart.", time: "15:10:30", daysAgo: 0 },
      { level: "info", message: "Running linear regression on Q1–Q2 dataset.", time: "15:10:12", daysAgo: 1 },
      { level: "success", message: "SQL query executed: 4,821 rows returned.", durationMs: 900, time: "15:09:58", daysAgo: 1 },
      { level: "info", message: "Connecting to primary data warehouse.", time: "15:09:55", daysAgo: 2 },
      { level: "warning", message: "Dataset contains 3 null values in 'revenue' column. Interpolating.", time: "15:08:20", daysAgo: 2 },
      { level: "error", message: "Query timeout after 30s. Optimising and retrying.", time: "15:07:44", daysAgo: 3 },
      { level: "info", message: "Received analysis request: monthly sales breakdown.", time: "15:07:40", daysAgo: 3 },
      { level: "success", message: "Pivot table generated for regional performance.", durationMs: 2300, time: "15:06:00", daysAgo: 4 },
      { level: "success", message: "Agent initialised and ready.", time: "15:05:10", daysAgo: 4 },
    ],
  },
  {
    name: "Code Reviewer",
    description: "Reviews pull requests for bugs, security issues, and style compliance.",
    model: "Claude Sonnet 4.6",
    status: "idle",
    tasksCompleted: 214,
    lastActive: minutesAgo(60),
    capabilities: ["Code review", "Security scan", "Suggestions"],
    logs: [
      { level: "success", message: "Review comment posted on PR #312.", durationMs: 300, time: "11:45:02", daysAgo: 0 },
      { level: "warning", message: "Potential SQL injection risk detected in src/api/users.ts:48.", time: "11:44:50", daysAgo: 0 },
      { level: "info", message: "Scanning 6 changed files in PR #312.", time: "11:44:35", daysAgo: 1 },
      { level: "info", message: "Received review request for PR #312: 'Add user auth endpoint'.", time: "11:44:30", daysAgo: 1 },
      { level: "success", message: "Style suggestions applied — 4 issues resolved.", durationMs: 200, time: "11:30:15", daysAgo: 2 },
      { level: "info", message: "Checking code style against ESLint ruleset.", time: "11:30:10", daysAgo: 2 },
      { level: "error", message: "Unhandled promise rejection found in src/jobs/sync.ts:102.", time: "11:30:05", daysAgo: 3 },
      { level: "info", message: "Scanning diff for PR #311.", time: "11:29:50", daysAgo: 3 },
      { level: "success", message: "Agent initialised and ready.", durationMs: 500, time: "11:00:00", daysAgo: 4 },
    ],
  },
  {
    name: "Customer Support",
    description: "Handles first-line inquiries, routes complex cases, and drafts responses.",
    model: "Claude Haiku 4.5",
    status: "active",
    tasksCompleted: 1038,
    lastActive: minutesAgo(0),
    capabilities: ["Triage", "Drafting", "Escalation"],
    logs: [
      { level: "success", message: "Reply drafted and queued for review.", durationMs: 1800, time: "16:02:10", daysAgo: 0 },
      { level: "info", message: "Composing response for ticket #8841.", time: "16:02:05", daysAgo: 0 },
      { level: "info", message: "Matched ticket #8841 to FAQ: billing cycle questions.", time: "16:01:58", daysAgo: 1 },
      { level: "info", message: "New ticket received: 'Subscription charge question'.", time: "16:01:55", daysAgo: 1 },
      { level: "warning", message: "Ticket #8839 escalated — sentiment score below threshold (0.21).", time: "16:00:40", daysAgo: 2 },
      { level: "success", message: "Ticket #8838 resolved and closed.", durationMs: 3400, time: "16:00:20", daysAgo: 2 },
      { level: "info", message: "Routing ticket #8837 to billing team.", time: "15:59:50", daysAgo: 3 },
      { level: "error", message: "CRM API returned 503. Ticket #8836 queued for retry.", time: "15:59:30", daysAgo: 3 },
      { level: "info", message: "Processing 5 queued tickets.", time: "15:58:00", daysAgo: 4 },
      { level: "success", message: "Agent initialised and ready.", durationMs: 600, time: "15:55:00", daysAgo: 4 },
    ],
  },
  {
    name: "Content Writer",
    description: "Drafts blog posts, documentation, and marketing copy from briefs.",
    model: "Claude Sonnet 4.6",
    status: "paused",
    tasksCompleted: 56,
    lastActive: minutesAgo(60 * 24 * 3),
    capabilities: ["Copywriting", "SEO", "Editing"],
    logs: [
      { level: "info", message: "Agent paused by user.", time: "09:15:30", daysAgo: 0 },
      { level: "success", message: "Blog post draft saved to Word Assistant.", durationMs: 700, time: "09:15:20", daysAgo: 0 },
      { level: "info", message: "Refining tone and SEO keywords in draft.", time: "09:15:00", daysAgo: 1 },
      { level: "info", message: "Generating outline for 'Top 10 SaaS Trends 2025'.", time: "09:14:30", daysAgo: 1 },
      { level: "warning", message: "Brief is vague — proceeding with inferred context.", time: "09:14:00", daysAgo: 2 },
      { level: "info", message: "Received content brief from user.", time: "09:13:55", daysAgo: 2 },
      { level: "success", message: "Agent initialised and ready.", durationMs: 400, time: "09:00:00", daysAgo: 3 },
    ],
  },
  {
    name: "Email Assistant",
    description: "Monitors your inbox, drafts replies, and flags priority threads.",
    model: "Claude Haiku 4.5",
    status: "paused",
    tasksCompleted: 329,
    lastActive: minutesAgo(60 * 24 * 2),
    capabilities: ["Inbox triage", "Drafting", "Scheduling"],
    logs: [
      { level: "info", message: "Agent paused by user.", time: "08:30:05", daysAgo: 0 },
      { level: "success", message: "Draft reply sent to Drafts folder.", durationMs: 500, time: "08:30:00", daysAgo: 0 },
      { level: "info", message: "Drafting reply to Sarah (Re: Q3 Budget Review).", time: "08:29:45", daysAgo: 1 },
      { level: "warning", message: "3 emails flagged as high priority and surfaced for review.", time: "08:29:30", daysAgo: 1 },
      { level: "info", message: "Scanning inbox: 14 new messages.", time: "08:29:00", daysAgo: 2 },
      { level: "error", message: "OAuth token expired. Re-authenticating with mail provider.", time: "08:28:50", daysAgo: 2 },
      { level: "info", message: "Connecting to mail provider.", time: "08:28:40", daysAgo: 3 },
      { level: "success", message: "Agent initialised and ready.", durationMs: 300, time: "08:00:00", daysAgo: 3 },
    ],
  },
]

async function main() {
  await prisma.log.deleteMany()
  await prisma.agent.deleteMany()

  let totalLogs = 0
  for (const a of agents) {
    const { logs, ...agentData } = a
    const created = await prisma.agent.create({ data: agentData })
    if (logs.length > 0) {
      await prisma.log.createMany({
        data: logs.map((l) => ({
          agentId: created.id,
          level: l.level,
          message: l.message,
          durationMs: l.durationMs,
          createdAt: dateAt(l.daysAgo, l.time),
        })),
      })
      totalLogs += logs.length
    }
  }
  console.log(`Seeded ${agents.length} agents and ${totalLogs} logs.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
