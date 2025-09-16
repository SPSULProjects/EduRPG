-- T12 Performance Indexes Migration
-- This migration adds performance indexes and constraints for better query performance

-- Job model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_teacherId_status_idx" ON "Job"("teacherId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_subjectId_status_idx" ON "Job"("subjectId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_closedAt_idx" ON "Job"("closedAt");

-- JobAssignment model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "JobAssignment_studentId_status_idx" ON "JobAssignment"("studentId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "JobAssignment_createdAt_idx" ON "JobAssignment"("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "JobAssignment_completedAt_idx" ON "JobAssignment"("completedAt");

-- TeacherDailyBudget model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TeacherDailyBudget_teacherId_date_idx" ON "TeacherDailyBudget"("teacherId", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TeacherDailyBudget_subjectId_date_idx" ON "TeacherDailyBudget"("subjectId", "date");

-- XPAudit model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "XPAudit_userId_createdAt_idx" ON "XPAudit"("userId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "XPAudit_createdAt_idx" ON "XPAudit"("createdAt");

-- MoneyTx model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MoneyTx_userId_type_idx" ON "MoneyTx"("userId", "type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MoneyTx_userId_createdAt_idx" ON "MoneyTx"("userId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MoneyTx_createdAt_idx" ON "MoneyTx"("createdAt");

-- Purchase model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Purchase_userId_createdAt_idx" ON "Purchase"("userId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- AchievementAward model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AchievementAward_userId_createdAt_idx" ON "AchievementAward"("userId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AchievementAward_createdAt_idx" ON "AchievementAward"("createdAt");

-- EventParticipation model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EventParticipation_userId_createdAt_idx" ON "EventParticipation"("userId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EventParticipation_createdAt_idx" ON "EventParticipation"("createdAt");

-- Item model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Item_type_rarity_idx" ON "Item"("type", "rarity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Item_isActive_type_idx" ON "Item"("isActive", "type");

-- Event model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Event_isActive_startsAt_idx" ON "Event"("isActive", "startsAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");

-- SystemLog model performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_level_createdAt_idx" ON "SystemLog"("level", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SystemLog_userId_level_idx" ON "SystemLog"("userId", "level");

-- Class model unique constraint
-- Note: This requires data validation first to ensure no duplicates exist
-- Step 1: Check for existing duplicates before applying
-- SELECT name, grade, COUNT(*) FROM "Class" GROUP BY name, grade HAVING COUNT(*) > 1;
-- Step 2: If no duplicates, apply the constraint
ALTER TABLE "Class" ADD CONSTRAINT "Class_name_grade_key" UNIQUE ("name", "grade");
