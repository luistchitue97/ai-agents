-- Add a normalized key column for case- and whitespace-insensitive uniqueness.

ALTER TABLE "Agent" ADD COLUMN "nameKey" TEXT;

UPDATE "Agent" SET "nameKey" = lower(regexp_replace("name", '\s+', '', 'g'));

ALTER TABLE "Agent" ALTER COLUMN "nameKey" SET NOT NULL;

CREATE UNIQUE INDEX "Agent_nameKey_key" ON "Agent" ("nameKey");
