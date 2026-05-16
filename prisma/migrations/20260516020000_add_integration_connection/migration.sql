CREATE TABLE "IntegrationConnection" (
  "id"             TEXT      NOT NULL,
  "organizationId" TEXT      NOT NULL,
  "providerId"     TEXT      NOT NULL,
  "accessToken"    TEXT      NOT NULL,
  "refreshToken"   TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "scope"          TEXT,
  "accountId"      TEXT,
  "accountLogin"   TEXT,
  "accountName"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_organizationId_providerId_accountId_key"
  ON "IntegrationConnection" ("organizationId", "providerId", "accountId");

CREATE INDEX "IntegrationConnection_organizationId_idx"
  ON "IntegrationConnection" ("organizationId");
