import { NextResponse, type NextRequest } from "next/server"
import { after } from "next/server"

import { runAgent } from "@/lib/agent-runtime"
import { prisma } from "@/lib/prisma"

// Give the agent loop room to breathe (default Vercel function timeout is 60s).
export const maxDuration = 300

const SYSTEM_ACTOR = {
  id: "system",
  name: "Scheduler",
  email: "scheduler@local",
}

function checkAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    )
  }
  const header = request.headers.get("authorization")
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkAuth(request)
  if (authError) return authError

  const { id } = await params
  const agentId = Number(id)
  if (!Number.isInteger(agentId) || agentId <= 0) {
    return NextResponse.json({ error: "Invalid agent id." }, { status: 400 })
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, organizationId: true },
  })
  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 })
  }

  // Overlap protection: skip if a run for this agent is already in flight.
  const inFlight = await prisma.agentRun.findFirst({
    where: {
      agentId: agent.id,
      status: { in: ["pending", "running"] },
    },
    select: { id: true },
  })
  if (inFlight) {
    return NextResponse.json({
      skipped: "overlap",
      existingRunId: inFlight.id,
    })
  }

  // Do the actual work after the response so the caller (the cron tick) can move on.
  // `after()` queues the callback to run after this handler returns its response;
  // Vercel keeps the function alive long enough to complete it.
  after(async () => {
    try {
      await runAgent(agent.id, agent.organizationId, SYSTEM_ACTOR)
    } catch (err) {
      console.error(`[scheduler] runAgent threw for agent ${agent.id}:`, err)
    }
  })

  return NextResponse.json({ accepted: true, agentId: agent.id })
}
