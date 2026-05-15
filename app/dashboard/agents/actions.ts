"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

const newAgentSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(200),
})

export async function createAgent(input: z.infer<typeof newAgentSchema>) {
  const data = newAgentSchema.parse(input)
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description,
      model: "Claude Sonnet 4.6",
      capabilities: [],
    },
  })
  revalidatePath("/dashboard/agents")
  return agent
}
