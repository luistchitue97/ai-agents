-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "AgentRunStepKind" AS ENUM ('prompt', 'response', 'error', 'tool_call', 'tool_result');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'pending',
    "triggeredById" TEXT NOT NULL,
    "triggeredByName" TEXT NOT NULL,
    "triggeredByEmail" TEXT NOT NULL,
    "summary" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "AgentRunStepKind" NOT NULL,
    "content" TEXT,
    "toolName" TEXT,
    "toolInput" JSONB,
    "toolOutput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_agentId_createdAt_idx" ON "AgentRun"("agentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AgentRun_organizationId_createdAt_idx" ON "AgentRun"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AgentRunStep_runId_sequence_idx" ON "AgentRunStep"("runId", "sequence");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRunStep" ADD CONSTRAINT "AgentRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
