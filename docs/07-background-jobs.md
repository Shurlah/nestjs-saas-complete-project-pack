# 07-background-jobs.md

# Background Jobs Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines background job and queue processing requirements.

The application uses Redis and BullMQ to process asynchronous work without slowing down API responses.

Background jobs are important because they demonstrate production backend design beyond basic CRUD.

---

## 2. Technology

Use:

```txt
Redis
BullMQ
@nestjs/bullmq
```

Redis will be provided by Railway in production.

---

## 3. Why Background Jobs?

Some operations should not block the HTTP request.

Examples:

- Sending invitation emails
- Sending password reset emails
- Sending email verification emails
- Creating notification delivery jobs
- Processing due-date reminders
- Writing non-critical audit events
- Retrying failed external operations

---

## 4. Initial Queues

Create these queues:

```txt
emailQueue
notificationQueue
auditQueue
```

Optional future queue:

```txt
reminderQueue
```

---

## 5. Queue Constants

Create:

```txt
src/jobs/queues/queue.constants.ts
```

Example:

```ts
export const EMAIL_QUEUE = 'emailQueue';
export const NOTIFICATION_QUEUE = 'notificationQueue';
export const AUDIT_QUEUE = 'auditQueue';

export const EmailJobs = {
  SEND_INVITATION_EMAIL: 'sendInvitationEmail',
  SEND_PASSWORD_RESET_EMAIL: 'sendPasswordResetEmail',
  SEND_EMAIL_VERIFICATION_EMAIL: 'sendEmailVerificationEmail',
} as const;

export const NotificationJobs = {
  DELIVER_NOTIFICATION: 'deliverNotification',
  TASK_ASSIGNED: 'taskAssigned',
  COMMENT_MENTION: 'commentMention',
} as const;

export const AuditJobs = {
  RECORD_AUDIT_EVENT: 'recordAuditEvent',
} as const;
```

---

## 6. Job Module Structure

Recommended structure:

```txt
src/jobs/
  queues/
    queue.module.ts
    queue.constants.ts
  processors/
    email.processor.ts
    notification.processor.ts
    audit.processor.ts
```

---

## 7. Redis Configuration

Redis connection should come from:

```txt
REDIS_URL
```

Railway will provide this variable through the Redis service.

For local development:

```env
REDIS_URL=redis://localhost:6379
```

---

## 8. Email Queue

The email queue handles email-related jobs.

### 8.1 Send Invitation Email

Job name:

```txt
sendInvitationEmail
```

Payload:

```json
{
  "email": "member@example.com",
  "organizationName": "Tracklio Technologies",
  "invitedByName": "Manny Imion",
  "invitationUrl": "https://app.example.com/invitations/accept?token=..."
}
```

For v1 portfolio version, actual email may be mocked by logging the payload.

### 8.2 Send Password Reset Email

Payload:

```json
{
  "email": "user@example.com",
  "resetUrl": "https://app.example.com/reset-password?token=..."
}
```

### 8.3 Send Email Verification Email

Payload:

```json
{
  "email": "user@example.com",
  "verificationUrl": "https://app.example.com/verify-email?token=..."
}
```

---

## 9. Notification Queue

The notification queue handles in-app notification processing.

### 9.1 Task Assigned Job

Payload:

```json
{
  "organizationId": "uuid",
  "taskId": "uuid",
  "assignedToUserId": "uuid",
  "assignedByUserId": "uuid"
}
```

Processor actions:

```txt
1. Load task.
2. Create notification record.
3. Optionally log delivery.
```

### 9.2 Comment Mention Job

Payload:

```json
{
  "organizationId": "uuid",
  "taskId": "uuid",
  "commentId": "uuid",
  "mentionedUserIds": ["uuid"]
}
```

---

## 10. Audit Queue

The audit queue records security-sensitive events.

Job name:

```txt
recordAuditEvent
```

Payload:

```json
{
  "organizationId": "uuid",
  "actorId": "uuid",
  "action": "MEMBER_INVITED",
  "entityType": "Invitation",
  "entityId": "uuid",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0",
  "metadata": {}
}
```

For critical audit logs, direct database writes inside the request may be preferred. For non-critical audit events, queue processing is acceptable.

---

## 11. Job Retry Strategy

Default job options:

```txt
attempts: 3
backoff: exponential
removeOnComplete: true
removeOnFail: false
```

Example:

```ts
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
}
```

---

## 12. Idempotency

Jobs should be idempotent where possible.

Example:

- Before creating a notification, check if a similar notification already exists when appropriate.
- Before marking a job as processed, rely on database constraints if possible.
- Avoid sending duplicate emails in real production.

For portfolio v1, document idempotency decisions even if simple.

---

## 13. Error Handling in Processors

Processors should:

```txt
Log job ID
Log job name
Log payload summary
Throw error for retryable failure
Avoid swallowing errors silently
Avoid logging sensitive tokens
```

Do not log raw reset tokens or invitation tokens in production.

---

## 14. Local Development

Run Redis locally using Docker:

```bash
docker run --name nest-saas-redis -p 6379:6379 -d redis:7
```

Or use Docker Compose if provided.

---

## 15. Railway Deployment

Railway services:

```txt
API Service
Redis Service
PostgreSQL Service
```

Set:

```txt
REDIS_URL
```

The API service should connect to Railway Redis through the environment variable.

---

## 16. Job Dashboard

Bull Board may be added later for job visibility.

For v1, not required.

If added, protect it behind admin auth.

---

## 17. Testing Jobs

Testing should cover:

```txt
invitation creation queues email job
task assignment queues notification job
notification processor creates notification
audit event job creates audit log
failed job retries
```

Mock queue calls in unit tests.

Use integration tests for processors where practical.

---

## 18. Codex Implementation Notes

When implementing jobs:

- Configure Redis first.
- Create QueueModule.
- Register queues globally or in relevant modules.
- Inject queues into services that produce jobs.
- Keep processors small.
- Never put main business logic only inside processors.
- Queue jobs after successful database writes.
