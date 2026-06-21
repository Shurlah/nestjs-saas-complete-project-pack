# 08-error-handling-logging.md

# Error Handling and Logging Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines error handling, response formatting, logging, request tracing, and audit logging behavior.

The system must provide consistent errors and useful logs without leaking sensitive information.

---

## 2. Goals

The goals are:

- Return consistent API errors.
- Avoid leaking implementation details.
- Make debugging easier.
- Add request tracing.
- Log important application events.
- Record security-sensitive audit events.
- Keep logs structured and useful.

---

## 3. Error Response Shape

All API errors should follow this shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-06-21T00:00:00.000Z",
  "path": "/api/v1/tasks",
  "requestId": "req_123"
}
```

Fields:

```txt
statusCode: HTTP status code
message: human-readable message
error: HTTP error name
timestamp: ISO timestamp
path: request path
requestId: unique request identifier
```

---

## 4. Global Exception Filter

Create:

```txt
src/common/filters/http-exception.filter.ts
```

The filter should handle:

```txt
HttpException
Prisma known errors
Validation errors
Unknown errors
```

In production, unknown errors should return:

```txt
Internal server error
```

Do not expose stack traces in production.

---

## 5. Common Error Codes

Use appropriate HTTP codes:

| Scenario | Status |
|---|---:|
| Validation failed | 400 |
| Missing auth token | 401 |
| Invalid auth token | 401 |
| Insufficient role | 403 |
| Not organization member | 403 |
| Resource not found | 404 |
| Duplicate resource | 409 |
| Rate limited | 429 |
| Unexpected server error | 500 |

---

## 6. Prisma Error Mapping

Map common Prisma errors:

| Prisma Error | Meaning | HTTP |
|---|---|---:|
| P2002 | Unique constraint failed | 409 |
| P2025 | Record not found | 404 |
| P2003 | Foreign key constraint failed | 400 |

Example P2002 response:

```json
{
  "statusCode": 409,
  "message": "Resource already exists",
  "error": "Conflict",
  "timestamp": "2026-06-21T00:00:00.000Z",
  "path": "/api/v1/organizations",
  "requestId": "req_123"
}
```

---

## 7. Validation Errors

Validation errors should be clear.

Example:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be stronger"
  ],
  "error": "Bad Request",
  "timestamp": "2026-06-21T00:00:00.000Z",
  "path": "/api/v1/auth/register",
  "requestId": "req_123"
}
```

---

## 8. Tenant Resource Not Found

When a resource does not belong to the requested organization, return:

```txt
404 Not Found
```

Do not reveal that it exists in another organization.

Example:

```txt
Project not found
```

---

## 9. Logging Strategy

Use structured logging.

Recommended package:

```txt
nestjs-pino
```

Alternative:

```txt
Nest Logger
```

For a senior portfolio project, structured JSON logs are preferred.

---

## 10. Request Logging

Each request log should include:

```txt
requestId
method
path
statusCode
durationMs
userId
organizationId
ipAddress
userAgent
```

Example log:

```json
{
  "level": "info",
  "requestId": "req_123",
  "method": "POST",
  "path": "/api/v1/organizations/org-id/projects",
  "statusCode": 201,
  "durationMs": 42,
  "userId": "user-id",
  "organizationId": "org-id"
}
```

---

## 11. Request ID

Every request should have a request ID.

If client sends:

```http
X-Request-Id: custom-id
```

Use it.

Otherwise generate one.

Attach it to:

```txt
request object
response header
error response
logs
```

Response header:

```http
X-Request-Id: req_123
```

---

## 12. Sensitive Data Redaction

Never log:

```txt
password
passwordHash
refreshToken
refreshTokenHash
accessToken
reset token
invitation token
email verification token
authorization header
```

When logging request bodies, redact sensitive fields.

---

## 13. Audit Logging

Audit logs are database records for security-sensitive actions.

Use AuditLog table.

Record:

```txt
organizationId
actorId
action
entityType
entityId
ipAddress
userAgent
metadata
createdAt
```

Actions:

```txt
USER_LOGIN
USER_LOGOUT
PASSWORD_RESET_REQUESTED
PASSWORD_CHANGED
ORGANIZATION_CREATED
ORGANIZATION_UPDATED
ORGANIZATION_ARCHIVED
MEMBER_INVITED
MEMBER_REMOVED
MEMBER_ROLE_CHANGED
INVITATION_ACCEPTED
PROJECT_CREATED
PROJECT_ARCHIVED
TASK_CREATED
TASK_UPDATED
TASK_DELETED
```

---

## 14. Activity Logging

Activity logs are user-facing business timeline records.

Examples:

```txt
Task created
Task assigned
Comment added
Project created
Member invited
Project archived
```

Activity logs should be visible to organization members depending on role.

---

## 15. Difference Between Logs, Audit Logs, and Activity Logs

| Type | Storage | Purpose | Visible to User |
|---|---|---|---|
| Application logs | stdout/log drain | Debugging and operations | No |
| Audit logs | database | Security/compliance events | Admins only |
| Activity logs | database | Product timeline | Organization members |

---

## 16. Error Handling in Services

Services should throw Nest exceptions:

```txt
BadRequestException
UnauthorizedException
ForbiddenException
NotFoundException
ConflictException
```

Avoid returning error objects manually.

Bad:

```ts
return { error: 'Not found' };
```

Good:

```ts
throw new NotFoundException('Project not found');
```

---

## 17. Error Handling in Controllers

Controllers should remain thin.

Controllers should not catch errors unless they are adding meaningful HTTP-level behavior.

Let the global exception filter handle formatting.

---

## 18. Production Behavior

In production:

- Do not return stack traces.
- Do not log sensitive data.
- Use generic errors for auth failures.
- Keep request logs structured.
- Include request IDs.
- Use Railway logs for operational visibility.

---

## 19. Railway Logging

Railway captures stdout/stderr logs.

Ensure the app writes logs to console.

Do not rely on local files for production logs.

---

## 20. Testing Requirements

Tests should cover:

```txt
global error response format
validation error format
not found error format
Prisma unique constraint mapping
tenant resource from another org returns 404
request ID is included in response
sensitive auth errors are generic
```

---

## 21. Codex Implementation Notes

When implementing:

- Add request ID middleware early.
- Add global exception filter.
- Add response interceptor.
- Add logging interceptor.
- Ensure error response format is consistent.
- Add tests for one validation error and one forbidden error.
