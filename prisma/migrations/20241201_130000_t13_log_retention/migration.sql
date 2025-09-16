-- T13: Add log retention fields to SystemLog
-- Add fields to track log retention status and visibility

ALTER TABLE "SystemLog" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemLog" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "SystemLog" ADD COLUMN "retentionStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Add indexes for retention queries
CREATE INDEX "SystemLog_retentionStatus_createdAt_idx" ON "SystemLog"("retentionStatus", "createdAt");
CREATE INDEX "SystemLog_isArchived_createdAt_idx" ON "SystemLog"("isArchived", "createdAt");

-- Add comment explaining retention policy
COMMENT ON COLUMN "SystemLog"."retentionStatus" IS 'ACTIVE: visible to all, ARCHIVED: 1+ years old, RESTRICTED: 2+ years old (operators only)';
COMMENT ON COLUMN "SystemLog"."isArchived" IS 'True if log has been moved to archive storage';
COMMENT ON COLUMN "SystemLog"."archivedAt" IS 'Timestamp when log was archived';
