# T12 Zero-Downtime Migration Plan

## Overview
This document outlines the zero-downtime migration strategy for implementing T12 Data Model Migrations, focusing on adding indexes, constraints, and performance optimizations without service interruption.

## Migration Strategy

### Phase 1: Index Creation (Non-Blocking)
All new indexes will be created using `CONCURRENTLY` to avoid table locks:

```sql
-- Job model indexes
CREATE INDEX CONCURRENTLY "Job_teacherId_status_idx" ON "Job"("teacherId", "status");
CREATE INDEX CONCURRENTLY "Job_subjectId_status_idx" ON "Job"("subjectId", "status");
CREATE INDEX CONCURRENTLY "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX CONCURRENTLY "Job_closedAt_idx" ON "Job"("closedAt");

-- JobAssignment model indexes
CREATE INDEX CONCURRENTLY "JobAssignment_studentId_status_idx" ON "JobAssignment"("studentId", "status");
CREATE INDEX CONCURRENTLY "JobAssignment_createdAt_idx" ON "JobAssignment"("createdAt");
CREATE INDEX CONCURRENTLY "JobAssignment_completedAt_idx" ON "JobAssignment"("completedAt");

-- TeacherDailyBudget model indexes
CREATE INDEX CONCURRENTLY "TeacherDailyBudget_teacherId_date_idx" ON "TeacherDailyBudget"("teacherId", "date");
CREATE INDEX CONCURRENTLY "TeacherDailyBudget_subjectId_date_idx" ON "TeacherDailyBudget"("subjectId", "date");

-- XPAudit model indexes
CREATE INDEX CONCURRENTLY "XPAudit_userId_createdAt_idx" ON "XPAudit"("userId", "createdAt");
CREATE INDEX CONCURRENTLY "XPAudit_createdAt_idx" ON "XPAudit"("createdAt");

-- MoneyTx model indexes
CREATE INDEX CONCURRENTLY "MoneyTx_userId_type_idx" ON "MoneyTx"("userId", "type");
CREATE INDEX CONCURRENTLY "MoneyTx_userId_createdAt_idx" ON "MoneyTx"("userId", "createdAt");
CREATE INDEX CONCURRENTLY "MoneyTx_createdAt_idx" ON "MoneyTx"("createdAt");

-- Purchase model indexes
CREATE INDEX CONCURRENTLY "Purchase_userId_createdAt_idx" ON "Purchase"("userId", "createdAt");
CREATE INDEX CONCURRENTLY "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- AchievementAward model indexes
CREATE INDEX CONCURRENTLY "AchievementAward_userId_createdAt_idx" ON "AchievementAward"("userId", "createdAt");
CREATE INDEX CONCURRENTLY "AchievementAward_createdAt_idx" ON "AchievementAward"("createdAt");

-- EventParticipation model indexes
CREATE INDEX CONCURRENTLY "EventParticipation_userId_createdAt_idx" ON "EventParticipation"("userId", "createdAt");
CREATE INDEX CONCURRENTLY "EventParticipation_createdAt_idx" ON "EventParticipation"("createdAt");

-- Item model indexes
CREATE INDEX CONCURRENTLY "Item_type_rarity_idx" ON "Item"("type", "rarity");
CREATE INDEX CONCURRENTLY "Item_isActive_type_idx" ON "Item"("isActive", "type");

-- Event model indexes
CREATE INDEX CONCURRENTLY "Event_isActive_startsAt_idx" ON "Event"("isActive", "startsAt");
CREATE INDEX CONCURRENTLY "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");

-- SystemLog model indexes
CREATE INDEX CONCURRENTLY "SystemLog_level_createdAt_idx" ON "SystemLog"("level", "createdAt");
CREATE INDEX CONCURRENTLY "SystemLog_userId_level_idx" ON "SystemLog"("userId", "level");
```

### Phase 2: Unique Constraint Addition (Requires Validation)
The unique constraint on Class(name, grade) requires data validation first:

```sql
-- Step 1: Check for existing duplicates
SELECT name, grade, COUNT(*) 
FROM "Class" 
GROUP BY name, grade 
HAVING COUNT(*) > 1;

-- Step 2: If duplicates exist, resolve them first
-- Step 3: Add unique constraint
ALTER TABLE "Class" ADD CONSTRAINT "Class_name_grade_key" UNIQUE ("name", "grade");
```

## Rollback Strategy

### Index Rollback
All indexes can be safely dropped without data loss:

```sql
-- Drop all new indexes (in reverse order)
DROP INDEX CONCURRENTLY IF EXISTS "SystemLog_userId_level_idx";
DROP INDEX CONCURRENTLY IF EXISTS "SystemLog_level_createdAt_idx";
-- ... (continue for all indexes)
```

### Constraint Rollback
```sql
-- Drop unique constraint
ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_name_grade_key";
```

## Performance Monitoring

### Pre-Migration Baseline
```sql
-- Record current query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Job" WHERE "teacherId" = 'xxx' AND "status" = 'OPEN';
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "XPAudit" WHERE "userId" = 'xxx' ORDER BY "createdAt" DESC LIMIT 10;
```

### Post-Migration Validation
```sql
-- Verify index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%_idx' 
ORDER BY idx_scan DESC;
```

## Deployment Steps

1. **Pre-deployment**
   - Backup database
   - Run performance baseline queries
   - Validate no duplicate Class(name, grade) records

2. **Deployment**
   - Apply migration using `prisma migrate deploy`
   - Monitor application performance
   - Verify index creation completion

3. **Post-deployment**
   - Run performance validation queries
   - Monitor query execution plans
   - Check index usage statistics

## Risk Mitigation

- **Index Creation Time**: Use `CONCURRENTLY` to avoid blocking
- **Disk Space**: Monitor disk usage during index creation
- **Query Performance**: Temporary performance impact during index creation
- **Data Integrity**: Validate unique constraints before applying

## Success Criteria

- [ ] All indexes created successfully
- [ ] No service downtime during migration
- [ ] Query performance improved or maintained
- [ ] No data integrity issues
- [ ] Rollback plan tested and ready
