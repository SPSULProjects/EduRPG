# Jobs Domain Implementation

## Overview

The Jobs domain implements a complete job management system with CRUD operations, student applications, teacher reviews, and atomic payouts. This implementation follows the T05 specification and includes comprehensive testing.

## Architecture

### Models

- **Job**: Core job entity with title, description, rewards, and status
- **JobAssignment**: Links students to jobs with application status tracking

### Service Layer

- **JobsService**: Core business logic with transactional operations
- **Payout Logic**: Floor division with remainder tracking
- **Audit Trail**: Complete SystemLog and MoneyTx records

## API Endpoints

### Core Jobs
- `POST /api/jobs` - Create new job (Teacher/Operator only)
- `GET /api/jobs` - List jobs (role-based filtering)
- `GET /api/classes/:id/jobs` - List jobs for specific class

### Job Applications
- `POST /api/jobs/:id/assign` - Student applies for job
- `POST /api/jobs/:id/review` - Teacher reviews application (approve/reject/return)

### Job Completion
- `POST /api/jobs/:id/close` - Close job and process payouts (atomic)

## Payout Logic

### Calculation
```typescript
const xpPerStudent = Math.floor(job.xpReward / approvedAssignments.length)
const moneyPerStudent = Math.floor(job.moneyReward / approvedAssignments.length)
```

### Examples
- **100 XP, 50 Money, 2 Students**: Each gets 50 XP, 25 Money (0 remainder)
- **101 XP, 51 Money, 2 Students**: Each gets 50 XP, 25 Money (1 remainder each)
- **100 XP, 50 Money, 1 Student**: Gets 100 XP, 50 Money (0 remainder)
- **100 XP, 50 Money, 0 Students**: No payouts (100 XP, 50 Money remainder)

### Remainder Handling
- Remainders are logged to SystemLog with WARN level
- Remainders are returned in the API response
- No automatic distribution of remainders

## Transactional Integrity

### Atomic Operations
- Job closure is wrapped in Prisma transaction
- All payouts, status updates, and logs are atomic
- Rollback on any failure

### Audit Trail
- **XPAudit**: Records all XP awards
- **MoneyTx**: Records all money transactions
- **SystemLog**: Records job lifecycle events
- **RequestId**: Links all operations in a single request

## Authorization

### Role-Based Access
- **Students**: Can apply for jobs, view open jobs
- **Teachers**: Can create jobs, review applications, close jobs
- **Operators**: Full access to all operations

### Ownership Validation
- Only job creator can approve/reject applications
- Only job creator can close the job
- Students can only apply once per job

## Testing

### Unit Tests
- Payout logic with various scenarios
- Transactional integrity
- Authorization checks
- Edge cases (zero students, uneven division)

### Integration Tests
- API endpoint validation
- Request/response format
- Error handling

## Usage Examples

### Create Job
```typescript
const job = await JobsService.createJob({
  title: "Grade Math Homework",
  description: "Grade 20 math assignments",
  subjectId: "math-101",
  teacherId: "teacher-1",
  xpReward: 100,
  moneyReward: 50,
  maxStudents: 2
})
```

### Apply for Job
```typescript
const assignment = await JobsService.applyForJob("job-1", "student-1")
```

### Review Application
```typescript
const assignment = await JobsService.approveJobAssignment("assignment-1", "teacher-1")
```

### Close Job
```typescript
const result = await JobsService.closeJob("job-1", "teacher-1")
// Returns: { job, payouts, remainder }
```

## Error Handling

### Common Errors
- **Job not found**: 404
- **Unauthorized**: 401
- **Forbidden**: 403 (wrong role/ownership)
- **Validation error**: 400 (invalid data)
- **Job full**: 400 (max students reached)
- **Already applied**: 400 (duplicate application)

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

## Monitoring

### SystemLog Events
- `job_created`: Job creation
- `job_applied`: Student application
- `job_approved`: Application approval
- `job_rejected`: Application rejection
- `job_closed`: Job completion with payout
- `job_remainder`: Payout remainder warning

### Metrics to Track
- Jobs created per teacher
- Application success rate
- Average payout amounts
- Remainder frequency
- Job completion time

## Security Considerations

### Input Validation
- Zod schemas for all API inputs
- Sanitization of log messages
- CUID validation for IDs

### Authorization
- Role-based access control
- Ownership validation
- Session-based authentication

### Data Integrity
- Unique constraints on job assignments
- Foreign key relationships
- Transactional operations

## Future Enhancements

### Potential Features
- Job templates
- Bulk job creation
- Advanced filtering
- Job categories
- Time-based rewards
- Student ratings

### Performance Optimizations
- Database indexing
- Query optimization
- Caching strategies
- Pagination for large datasets
