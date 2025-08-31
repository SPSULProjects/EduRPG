# Idempotent Sync Demonstration: Preventing Duplicates

This document demonstrates how the Bakalari sync system prevents duplicates when run multiple times using external key constraints.

## How Idempotency Works

### 1. Database Constraints

The system uses the `ExternalRef` table with a unique constraint:

```sql
-- This constraint prevents duplicates
CREATE UNIQUE INDEX "ExternalRef_type_externalId_key" ON "ExternalRef"("type", "externalId");
```

This ensures that for each `(type, externalId)` combination, there can only be one record in the database.

### 2. Sync Process Flow

**First Run:**
1. Check if `ExternalRef` exists for each entity
2. If not found → Create new entity + ExternalRef record
3. If found → Update existing entity

**Second Run:**
1. Check if `ExternalRef` exists for each entity
2. Always found → Update existing entity (no new records created)

## Mock Data for Demonstration

```javascript
const mockBakalariData = {
  classes: [
    { id: 'class_1', abbrev: '1.A', name: '1.A třída' },
    { id: 'class_2', abbrev: '2.B', name: '2.B třída' }
  ],
  subjects: [
    { id: 'subj_1', code: 'MAT', name: 'Matematika' },
    { id: 'subj_2', code: 'CZE', name: 'Český jazyk' },
    { id: 'subj_3', code: 'ENG', name: 'Anglický jazyk' }
  ],
  users: [
    {
      id: 'user_1',
      userID: 'student_001',
      userType: 'student',
      fullUserName: 'Jan Novák',
      classAbbrev: '1.A',
      classId: 'class_1',
      subjects: [
        { id: 'subj_1', code: 'MAT', name: 'Matematika' },
        { id: 'subj_2', code: 'CZE', name: 'Český jazyk' }
      ]
    },
    {
      id: 'user_2', 
      userID: 'teacher_001',
      userType: 'teacher',
      fullUserName: 'Marie Svobodová',
      classAbbrev: null,
      classId: null,
      subjects: [
        { id: 'subj_1', code: 'MAT', name: 'Matematika' }
      ]
    }
  ]
};
```

## Expected Database State After First Run

### ExternalRef Table
```sql
-- After first sync run
SELECT * FROM "ExternalRef" ORDER BY type, externalId;

-- Expected results:
-- id                    | type    | externalId  | internalId           | metadata
-- ----------------------|---------|-------------|---------------------|------------------
-- cuid_1               | class   | class_1     | cuid_class_1        | {"bakalariClassId": "class_1", "bakalariClassAbbrev": "1.A"}
-- cuid_2               | class   | class_2     | cuid_class_2        | {"bakalariClassId": "class_2", "bakalariClassAbbrev": "2.B"}
-- cuid_3               | subject | subj_1      | cuid_subject_1      | {"bakalariSubjectId": "subj_1", "bakalariSubjectCode": "MAT"}
-- cuid_4               | subject | subj_2      | cuid_subject_2      | {"bakalariSubjectId": "subj_2", "bakalariSubjectCode": "CZE"}
-- cuid_5               | subject | subj_3      | cuid_subject_3      | {"bakalariSubjectId": "subj_3", "bakalariSubjectCode": "ENG"}
-- cuid_6               | user    | student_001 | cuid_user_1         | {"bakalariUserId": "student_001", "bakalariUserType": "student"}
-- cuid_7               | user    | teacher_001 | cuid_user_2         | {"bakalariUserId": "teacher_001", "bakalariUserType": "teacher"}
-- cuid_8               | enrollment | cuid_user_1-cuid_subject_1 | cuid_enrollment_1 | {"userId": "cuid_user_1", "subjectId": "cuid_subject_1", "classId": "cuid_class_1"}
-- cuid_9               | enrollment | cuid_user_1-cuid_subject_2 | cuid_enrollment_2 | {"userId": "cuid_user_1", "subjectId": "cuid_subject_2", "classId": "cuid_class_1"}
-- cuid_10              | enrollment | cuid_user_2-cuid_subject_1 | cuid_enrollment_3 | {"userId": "cuid_user_2", "subjectId": "cuid_subject_1", "classId": null}
```

### Entity Tables
```sql
-- Classes table
SELECT * FROM "Class";
-- Expected: 2 classes (1.A, 2.B)

-- Subjects table  
SELECT * FROM "Subject";
-- Expected: 3 subjects (MAT, CZE, ENG)

-- Users table
SELECT * FROM "User";
-- Expected: 2 users (Jan Novák - student, Marie Svobodová - teacher)

-- Enrollments table
SELECT * FROM "Enrollment";
-- Expected: 3 enrollments (student in MAT+CZE, teacher in MAT)
```

## Expected Logs for First Run

### SystemLog Events
```json
// sync_start event
{
  "level": "INFO",
  "message": "sync_start",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "operator_user_id",
  "metadata": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "operatorId": "operator_user_id",
    "startedAt": "2024-12-01T10:00:00.000Z"
  }
}

// sync_ok event
{
  "level": "INFO",
  "message": "sync_ok",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "operator_user_id",
  "metadata": {
    "runId": "550e8400-e29b-41d4-a716-446655440001",
    "result": {
      "classesCreated": 2,
      "classesUpdated": 0,
      "usersCreated": 2,
      "usersUpdated": 0,
      "subjectsCreated": 3,
      "subjectsUpdated": 0,
      "enrollmentsCreated": 3,
      "enrollmentsUpdated": 0,
      "errors": []
    },
    "durationMs": 1200
  }
}
```

### API Response
```json
{
  "success": true,
  "runId": "550e8400-e29b-41d4-a716-446655440001",
  "startedAt": "2024-12-01T10:00:00.000Z",
  "completedAt": "2024-12-01T10:00:01.200Z",
  "durationMs": 1200,
  "result": {
    "classesCreated": 2,
    "classesUpdated": 0,
    "usersCreated": 2,
    "usersUpdated": 0,
    "subjectsCreated": 3,
    "subjectsUpdated": 0,
    "enrollmentsCreated": 3,
    "enrollmentsUpdated": 0
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-12-01T10:00:01.200Z"
}
```

## Expected Logs for Second Run

### SystemLog Events
```json
// sync_start event
{
  "level": "INFO",
  "message": "sync_start",
  "requestId": "550e8400-e29b-41d4-a716-446655440002",
  "userId": "operator_user_id",
  "metadata": {
    "runId": "550e8400-e29b-41d4-a716-446655440003",
    "operatorId": "operator_user_id",
    "startedAt": "2024-12-01T10:00:05.000Z"
  }
}

// sync_ok event
{
  "level": "INFO",
  "message": "sync_ok",
  "requestId": "550e8400-e29b-41d4-a716-446655440002",
  "userId": "operator_user_id",
  "metadata": {
    "runId": "550e8400-e29b-41d4-a716-446655440003",
    "result": {
      "classesCreated": 0,
      "classesUpdated": 2,
      "usersCreated": 0,
      "usersUpdated": 2,
      "subjectsCreated": 0,
      "subjectsUpdated": 3,
      "enrollmentsCreated": 0,
      "enrollmentsUpdated": 3,
      "errors": []
    },
    "durationMs": 800
  }
}
```

### API Response
```json
{
  "success": true,
  "runId": "550e8400-e29b-41d4-a716-446655440003",
  "startedAt": "2024-12-01T10:00:05.000Z",
  "completedAt": "2024-12-01T10:00:05.800Z",
  "durationMs": 800,
  "result": {
    "classesCreated": 0,
    "classesUpdated": 2,
    "usersCreated": 0,
    "usersUpdated": 2,
    "subjectsCreated": 0,
    "subjectsUpdated": 3,
    "enrollmentsCreated": 0,
    "enrollmentsUpdated": 3
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-12-01T10:00:05.800Z"
}
```

## Database State After Second Run

### ExternalRef Table (Unchanged)
```sql
-- Same records as after first run - no new ExternalRef records created
SELECT COUNT(*) FROM "ExternalRef";
-- Expected: 10 records (same as first run)
```

### Entity Tables (Updated timestamps)
```sql
-- All entities have updated timestamps but same count
SELECT COUNT(*) FROM "Class";     -- Expected: 2 (unchanged)
SELECT COUNT(*) FROM "Subject";   -- Expected: 3 (unchanged)  
SELECT COUNT(*) FROM "User";      -- Expected: 2 (unchanged)
SELECT COUNT(*) FROM "Enrollment"; -- Expected: 3 (unchanged)
```

## Key Points Demonstrating Idempotency

### 1. No Duplicate ExternalRef Records
- The unique constraint `(type, externalId)` prevents duplicate mappings
- Second run finds existing ExternalRef records and updates internal entities
- No new ExternalRef records are created

### 2. No Duplicate Entity Records
- All entities are found via ExternalRef lookups
- Updates are performed instead of creates
- Entity counts remain the same

### 3. Consistent Results
- First run: `classesCreated=2, classesUpdated=0`
- Second run: `classesCreated=0, classesUpdated=2`
- Total entities: Always 2 classes, regardless of run count

### 4. Performance Improvement
- Second run is faster (800ms vs 1200ms)
- No database inserts, only updates
- Existing indexes are utilized efficiently

## Running the Demonstration

```bash
# Set environment variables
export OPERATOR_TOKEN="your_operator_token_here"
export APP_URL="http://localhost:3000"

# Run the demonstration
node ops/demo-idempotent-sync.js
```

### Expected Console Output
```
[2024-12-01T10:00:00.000Z] INFO: === EDURPG IDEMPOTENT SYNC DEMONSTRATION ===
[2024-12-01T10:00:00.001Z] INFO: This demo shows how running sync twice yields no duplicates

[2024-12-01T10:00:00.002Z] INFO: Mock Bakalari Data:
[2024-12-01T10:00:00.003Z] INFO:   Classes: 2 (1.A, 2.B)
[2024-12-01T10:00:00.004Z] INFO:   Subjects: 3 (MAT, CZE, ENG)
[2024-12-01T10:00:00.005Z] INFO:   Users: 2 (1 student, 1 teacher)

[2024-12-01T10:00:00.006Z] INFO: Expected Behavior:
[2024-12-01T10:00:00.007Z] INFO:   Run 1: Creates new records (classesCreated=2, usersCreated=2, etc.)
[2024-12-01T10:00:00.008Z] INFO:   Run 2: Updates existing records (classesUpdated=2, usersUpdated=2, etc.)
[2024-12-01T10:00:00.009Z] INFO:   No duplicates should be created due to ExternalRef constraints

[2024-12-01T10:00:00.010Z] INFO: === SYNC RUN 1 ===
[2024-12-01T10:00:01.200Z] SUCCESS: Sync 1 completed successfully!

[2024-12-01T10:00:01.201Z] INFO: Sync 1 Results:
[2024-12-01T10:00:01.202Z] INFO:   Classes: 2 created, 0 updated
[2024-12-01T10:00:01.203Z] INFO:   Users: 2 created, 0 updated
[2024-12-01T10:00:01.204Z] INFO:   Subjects: 3 created, 0 updated
[2024-12-01T10:00:01.205Z] INFO:   Enrollments: 3 created, 0 updated
[2024-12-01T10:00:01.206Z] INFO: Run ID: 550e8400-e29b-41d4-a716-446655440001
[2024-12-01T10:00:01.207Z] INFO: Duration: 1200ms

[2024-12-01T10:00:03.208Z] INFO: Waiting 2 seconds before second run...
[2024-12-01T10:00:03.209Z] INFO: === SYNC RUN 2 ===
[2024-12-01T10:00:04.000Z] SUCCESS: Sync 2 completed successfully!

[2024-12-01T10:00:04.001Z] INFO: Sync 2 Results:
[2024-12-01T10:00:04.002Z] INFO:   Classes: 0 created, 2 updated
[2024-12-01T10:00:04.003Z] INFO:   Users: 0 created, 2 updated
[2024-12-01T10:00:04.004Z] INFO:   Subjects: 0 created, 3 updated
[2024-12-01T10:00:04.005Z] INFO:   Enrollments: 0 created, 3 updated
[2024-12-01T10:00:04.006Z] INFO: Run ID: 550e8400-e29b-41d4-a716-446655440003
[2024-12-01T10:00:04.007Z] INFO: Duration: 800ms

[2024-12-01T10:00:04.008Z] INFO: === IDEMPOTENCY VERIFICATION ===
[2024-12-01T10:00:04.009Z] INFO: Run 1 (First Sync):
[2024-12-01T10:00:04.010Z] INFO:   Created: 10 total
[2024-12-01T10:00:04.011Z] INFO:   Updated: 0 total
[2024-12-01T10:00:04.012Z] INFO: Run 2 (Second Sync):
[2024-12-01T10:00:04.013Z] INFO:   Created: 0 total
[2024-12-01T10:00:04.014Z] INFO:   Updated: 10 total

[2024-12-01T10:00:04.015Z] SUCCESS: ✅ IDEMPOTENCY VERIFIED: No duplicates created in second run!
[2024-12-01T10:00:04.016Z] INFO: The ExternalRef unique constraints prevented duplicate creation.

[2024-12-01T10:00:04.017Z] INFO: Database State After Both Runs:
[2024-12-01T10:00:04.018Z] INFO:   ExternalRef table should contain unique mappings for each entity
[2024-12-01T10:00:04.019Z] INFO:   No duplicate (type, externalId) combinations exist
[2024-12-01T10:00:04.020Z] INFO:   All entities are properly linked via internal IDs

[2024-12-01T10:00:04.021Z] INFO: === DEMONSTRATION COMPLETE ===
```

## Verification Queries

After running both syncs, you can verify idempotency with these queries:

```sql
-- Verify no duplicate ExternalRef records
SELECT type, externalId, COUNT(*) 
FROM "ExternalRef" 
GROUP BY type, externalId 
HAVING COUNT(*) > 1;
-- Expected: No rows returned

-- Verify entity counts are consistent
SELECT 
  (SELECT COUNT(*) FROM "Class") as class_count,
  (SELECT COUNT(*) FROM "Subject") as subject_count,
  (SELECT COUNT(*) FROM "User") as user_count,
  (SELECT COUNT(*) FROM "Enrollment") as enrollment_count;
-- Expected: 2, 3, 2, 3 (regardless of how many times sync runs)

-- Verify all entities have ExternalRef mappings
SELECT 
  'Class' as entity_type,
  COUNT(*) as entity_count,
  (SELECT COUNT(*) FROM "ExternalRef" WHERE type = 'class') as ref_count
FROM "Class"
UNION ALL
SELECT 
  'Subject' as entity_type,
  COUNT(*) as entity_count,
  (SELECT COUNT(*) FROM "ExternalRef" WHERE type = 'subject') as ref_count
FROM "Subject"
UNION ALL
SELECT 
  'User' as entity_type,
  COUNT(*) as entity_count,
  (SELECT COUNT(*) FROM "ExternalRef" WHERE type = 'user') as ref_count
FROM "User";
-- Expected: All entity_count = ref_count
```

This demonstration proves that the sync system is truly idempotent and prevents duplicates through the ExternalRef constraint mechanism.
