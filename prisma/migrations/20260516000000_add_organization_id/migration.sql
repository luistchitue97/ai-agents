-- Multi-tenant data isolation: every Agent belongs to a WorkOS organization.
-- Existing rows are parked under a 'local-dev' placeholder org so they survive
-- the migration. Real signed-in users won't see them unless they belong to
-- that org.

ALTER TABLE "Agent" ADD COLUMN "organizationId" TEXT;

UPDATE "Agent" SET "organizationId" = 'local-dev' WHERE "organizationId" IS NULL;

ALTER TABLE "Agent" ALTER COLUMN "organizationId" SET NOT NULL;

-- Replace the global nameKey unique with a per-org compound unique so the same
-- agent name can exist in different organizations.
DROP INDEX "Agent_nameKey_key";

CREATE UNIQUE INDEX "Agent_organizationId_nameKey_key" ON "Agent" ("organizationId", "nameKey");

CREATE INDEX "Agent_organizationId_idx" ON "Agent" ("organizationId");
