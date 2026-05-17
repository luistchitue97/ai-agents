import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { computeNextRunAfter } from "@/lib/scheduling"

const STALE_RUN_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes
const MAX_DISPATCHES_PER_TICK = 50

function checkAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    )
  }
  // Vercel Cron sends the secret as `Authorization: Bearer <secret>`.
  const header = request.headers.get("authorization")
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  return null
}

async function handle(request: NextRequest) {
  const authError = checkAuth(request)
  if (authError) return authError

  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STALE_RUN_THRESHOLD_MS)

  // 1. Reap stale runs (crash recovery): anything still "running" past the
  //    threshold is marked failed so the agent can be picked up again.
  const reapResult = await prisma.agentRun.updateMany({
    where: {
      status: { in: ["pending", "running"] },
      startedAt: { lt: staleCutoff },
    },
    data: {
      status: "failed",
      errorMessage: `Run exceeded the ${STALE_RUN_THRESHOLD_MS / 60_000}-minute timeout.`,
      finishedAt: now,
    },
  })

  // 2. Find due agents.
  const due = await prisma.agent.findMany({
    where: {
      scheduleEnabled: true,
      nextRunAt: { lte: now },
      cron: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      cron: true,
      timezone: true,
    },
    take: MAX_DISPATCHES_PER_TICK,
  })

  // 3. For each: advance nextRunAt and fire-and-forget the run endpoint.
  //    We advance the clock first so a slow run endpoint doesn't make this
  //    agent re-dispatch on the next tick.
  const origin = new URL(request.url).origin
  const secret = process.env.CRON_SECRET!
  const dispatched: { agentId: number; nextRunAt: string | null }[] = []

  for (const agent of due) {
    if (!agent.cron) continue
    const next = computeNextRunAfter(agent.cron, agent.timezone, now)
    await prisma.agent.update({
      where: { id: agent.id },
      data: { nextRunAt: next },
    })

    // Fire-and-forget. We don't await the body — the run endpoint uses `after()`
    // to do the actual work in the background, so this call returns fast.
    fetch(`${origin}/api/agents/${agent.id}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      console.error(`[cron] dispatch to agent ${agent.id} failed:`, err)
    })

    dispatched.push({ agentId: agent.id, nextRunAt: next?.toISOString() ?? null })
  }

  return NextResponse.json({
    now: now.toISOString(),
    reapedStaleRuns: reapResult.count,
    dispatched: dispatched.length,
    agents: dispatched,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
