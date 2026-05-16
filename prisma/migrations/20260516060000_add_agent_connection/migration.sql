-- CreateTable
CREATE TABLE "AgentConnection" (
    "agentId" INTEGER NOT NULL,
    "integrationConnectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConnection_pkey" PRIMARY KEY ("agentId", "integrationConnectionId")
);

-- CreateIndex
CREATE INDEX "AgentConnection_integrationConnectionId_idx" ON "AgentConnection"("integrationConnectionId");

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
