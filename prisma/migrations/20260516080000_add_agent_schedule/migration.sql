-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "cron" TEXT;
ALTER TABLE "Agent" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Agent" ADD COLUMN "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agent" ADD COLUMN "nextRunAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Agent_scheduleEnabled_nextRunAt_idx" ON "Agent"("scheduleEnabled", "nextRunAt");
