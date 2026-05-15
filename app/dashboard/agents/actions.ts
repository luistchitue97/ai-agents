"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { normalizeAgentName } from "./data"

export async function deleteAgents(ids: number[]) {
  const validIds = ids.filter((id) => Number.isInteger(id) && id > 0)
  if (validIds.length === 0) {
    throw new Error("No valid agents selected.")
  }
  const result = await prisma.agent.deleteMany({
    where: { id: { in: validIds } },
  })
  revalidatePath("/dashboard/agents")
  return { deleted: result.count }
}

export async function listAgents() {
  return prisma.agent.findMany({
    select: { id: true, name: true, description: true, status: true, model: true },
    orderBy: { name: "asc" },
  })
}

const newAgentSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(200),
})

export async function createAgent(input: z.infer<typeof newAgentSchema>) {
  const data = newAgentSchema.parse(input)
  const nameKey = normalizeAgentName(data.name)

  if (!nameKey) {
    throw new Error("Name must contain at least one non-whitespace character.")
  }

  const existing = await prisma.agent.findUnique({
    where: { nameKey },
    select: { id: true },
  })
  if (existing) {
    throw new Error("An agent with this name already exists.")
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        nameKey,
        description: data.description,
        model: "Claude Sonnet 4.6",
        capabilities: [],
      },
    })
    revalidatePath("/dashboard/agents")
    return agent
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("An agent with this name already exists.")
    }
    throw err
  }
}
