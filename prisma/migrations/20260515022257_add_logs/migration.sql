-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Log_agentId_createdAt_idx" ON "Log"("agentId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
