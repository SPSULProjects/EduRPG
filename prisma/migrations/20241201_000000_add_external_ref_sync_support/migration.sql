-- CreateTable
CREATE TABLE IF NOT EXISTS "ExternalRef" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExternalRef_type_idx" ON "ExternalRef"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExternalRef_internalId_idx" ON "ExternalRef"("internalId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalRef_type_externalId_key" ON "ExternalRef"("type", "externalId");
