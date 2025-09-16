# T12 Query Performance Guide

## Overview
This document provides EXPLAIN hints and optimization strategies for heavy queries in the EduRPG system, based on the new indexes and constraints added in T12.

## Heavy Query Patterns & Optimizations

### 1. Job Management Queries

#### Query: Find open jobs for a teacher
```sql
-- Heavy query pattern
SELECT j.*, s.name as subject_name 
FROM "Job" j 
JOIN "Subject" s ON j."subjectId" = s.id 
WHERE j."teacherId" = $1 AND j."status" = 'OPEN' 
ORDER BY j."createdAt" DESC;

-- EXPLAIN hint: Use composite index
-- Index: Job_teacherId_status_idx
-- Expected: Index Scan on Job_teacherId_status_idx
```

#### Query: Find jobs by subject and status
```sql
-- Heavy query pattern
SELECT j.*, u.name as teacher_name 
FROM "Job" j 
JOIN "User" u ON j."teacherId" = u.id 
WHERE j."subjectId" = $1 AND j."status" = 'OPEN' 
ORDER BY j."createdAt" DESC;

-- EXPLAIN hint: Use composite index
-- Index: Job_subjectId_status_idx
-- Expected: Index Scan on Job_subjectId_status_idx
```

#### Query: Recent job activity
```sql
-- Heavy query pattern
SELECT * FROM "Job" 
WHERE "createdAt" >= $1 
ORDER BY "createdAt" DESC 
LIMIT 50;

-- EXPLAIN hint: Use timestamp index
-- Index: Job_createdAt_idx
-- Expected: Index Scan on Job_createdAt_idx
```

### 2. Student Progress Queries

#### Query: Student's XP history
```sql
-- Heavy query pattern
SELECT * FROM "XPAudit" 
WHERE "userId" = $1 
ORDER BY "createdAt" DESC 
LIMIT 100;

-- EXPLAIN hint: Use composite index
-- Index: XPAudit_userId_createdAt_idx
-- Expected: Index Scan on XPAudit_userId_createdAt_idx
```

#### Query: Student's money transactions
```sql
-- Heavy query pattern
SELECT * FROM "MoneyTx" 
WHERE "userId" = $1 AND "type" = 'EARNED' 
ORDER BY "createdAt" DESC;

-- EXPLAIN hint: Use composite index
-- Index: MoneyTx_userId_type_idx
-- Expected: Index Scan on MoneyTx_userId_type_idx
```

#### Query: Student's job assignments
```sql
-- Heavy query pattern
SELECT ja.*, j.title, j."xpReward" 
FROM "JobAssignment" ja 
JOIN "Job" j ON ja."jobId" = j.id 
WHERE ja."studentId" = $1 AND ja."status" = 'COMPLETED' 
ORDER BY ja."completedAt" DESC;

-- EXPLAIN hint: Use composite index
-- Index: JobAssignment_studentId_status_idx
-- Expected: Index Scan on JobAssignment_studentId_status_idx
```

### 3. Teacher Dashboard Queries

#### Query: Teacher's daily budget usage
```sql
-- Heavy query pattern
SELECT tdb.*, s.name as subject_name 
FROM "TeacherDailyBudget" tdb 
JOIN "Subject" s ON tdb."subjectId" = s.id 
WHERE tdb."teacherId" = $1 AND tdb."date" = $2;

-- EXPLAIN hint: Use composite index
-- Index: TeacherDailyBudget_teacherId_date_idx
-- Expected: Index Scan on TeacherDailyBudget_teacherId_date_idx
```

#### Query: Teacher's job history
```sql
-- Heavy query pattern
SELECT j.*, s.name as subject_name, 
       COUNT(ja.id) as assignment_count 
FROM "Job" j 
JOIN "Subject" s ON j."subjectId" = s.id 
LEFT JOIN "JobAssignment" ja ON j.id = ja."jobId" 
WHERE j."teacherId" = $1 
GROUP BY j.id, s.name 
ORDER BY j."createdAt" DESC;

-- EXPLAIN hint: Use teacherId index with join optimization
-- Index: Job_teacherId_idx
-- Expected: Index Scan on Job_teacherId_idx + Hash Join
```

### 4. Shop & Items Queries

#### Query: Active items by type and rarity
```sql
-- Heavy query pattern
SELECT * FROM "Item" 
WHERE "isActive" = true AND "type" = $1 AND "rarity" = $2 
ORDER BY "price" ASC;

-- EXPLAIN hint: Use composite index
-- Index: Item_isActive_type_idx
-- Expected: Index Scan on Item_isActive_type_idx
```

#### Query: User's purchase history
```sql
-- Heavy query pattern
SELECT p.*, i.name, i."imageUrl" 
FROM "Purchase" p 
JOIN "Item" i ON p."itemId" = i.id 
WHERE p."userId" = $1 
ORDER BY p."createdAt" DESC 
LIMIT 50;

-- EXPLAIN hint: Use composite index
-- Index: Purchase_userId_createdAt_idx
-- Expected: Index Scan on Purchase_userId_createdAt_idx
```

### 5. Event Management Queries

#### Query: Active events
```sql
-- Heavy query pattern
SELECT * FROM "Event" 
WHERE "isActive" = true AND "startsAt" <= NOW() AND ("endsAt" IS NULL OR "endsAt" >= NOW()) 
ORDER BY "startsAt" ASC;

-- EXPLAIN hint: Use composite index
-- Index: Event_isActive_startsAt_idx
-- Expected: Index Scan on Event_isActive_startsAt_idx
```

#### Query: Event participation
```sql
-- Heavy query pattern
SELECT ep.*, u.name as user_name 
FROM "EventParticipation" ep 
JOIN "User" u ON ep."userId" = u.id 
WHERE ep."eventId" = $1 
ORDER BY ep."createdAt" DESC;

-- EXPLAIN hint: Use eventId index
-- Index: EventParticipation_eventId_idx
-- Expected: Index Scan on EventParticipation_eventId_idx
```

### 6. System Logging Queries

#### Query: Error logs by user
```sql
-- Heavy query pattern
SELECT * FROM "SystemLog" 
WHERE "userId" = $1 AND "level" = 'ERROR' 
ORDER BY "createdAt" DESC 
LIMIT 100;

-- EXPLAIN hint: Use composite index
-- Index: SystemLog_userId_level_idx
-- Expected: Index Scan on SystemLog_userId_level_idx
```

#### Query: Recent system activity
```sql
-- Heavy query pattern
SELECT * FROM "SystemLog" 
WHERE "level" IN ('WARN', 'ERROR') AND "createdAt" >= $1 
ORDER BY "createdAt" DESC;

-- EXPLAIN hint: Use composite index
-- Index: SystemLog_level_createdAt_idx
-- Expected: Index Scan on SystemLog_level_createdAt_idx
```

## Performance Monitoring Queries

### Index Usage Statistics
```sql
-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan::float / NULLIF(idx_tup_read, 0) as efficiency
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%_idx' 
ORDER BY idx_scan DESC;
```

### Slow Query Identification
```sql
-- Find slow queries (requires pg_stat_statements extension)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100  -- queries taking > 100ms on average
ORDER BY mean_time DESC 
LIMIT 20;
```

### Table Size Monitoring
```sql
-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Query Optimization Best Practices

### 1. Use Appropriate Indexes
- Always use the most selective index first
- Prefer composite indexes for multi-column WHERE clauses
- Use partial indexes for frequently filtered data

### 2. Avoid Full Table Scans
- Ensure WHERE clauses use indexed columns
- Use LIMIT clauses for large result sets
- Consider pagination for large datasets

### 3. Optimize JOINs
- Use appropriate JOIN types (INNER vs LEFT)
- Ensure JOIN columns are indexed
- Consider denormalization for frequently joined data

### 4. Monitor Query Performance
- Use EXPLAIN ANALYZE for query plans
- Monitor slow query logs
- Set up performance alerts

## Troubleshooting Common Issues

### Issue: Sequential Scan on Large Tables
**Solution**: Add appropriate indexes or modify query to use existing indexes

### Issue: High Index Maintenance Overhead
**Solution**: Review index usage and remove unused indexes

### Issue: Query Timeout
**Solution**: Add LIMIT clauses, optimize WHERE conditions, or add missing indexes

### Issue: Memory Usage
**Solution**: Use streaming results, implement pagination, or optimize JOIN strategies
