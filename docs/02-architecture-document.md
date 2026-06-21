# 02-architecture-document.md

# Architecture Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines the backend architecture for the Enterprise Multi-Tenant Project Management API.

The application is a production-grade Nest.js backend designed to demonstrate senior-level backend engineering skills. It uses a modular monolith architecture with strong boundaries between business modules, PostgreSQL for persistence, Prisma for database access, Redis for caching and background job coordination, BullMQ for asynchronous processing, and Railway for deployment.

The architecture must support:

- Multi-tenancy
- Authentication
- Role-based authorization
- Tenant isolation
- Project and task management
- Invitations
- Notifications
- Audit logging
- Activity logging
- Background jobs
- API documentation
- Testing
- Railway deployment

---

## 2. Architectural Style

The system will use a **modular monolith** architecture.

This means the application is deployed as one backend service, but the codebase is divided into well-defined modules. Each module owns a specific business capability.

This approach is preferred for version 1 because it gives the project strong structure without introducing premature microservice complexity.

### Why Modular Monolith?

A modular monolith is suitable because:

- It is easier to build and deploy than microservices.
- It keeps all business logic in one codebase.
- It supports clean module boundaries.
- It allows later extraction into microservices if needed.
- It is ideal for a portfolio project because it shows architectural discipline without unnecessary distributed-system overhead.

---

## 3. High-Level System Diagram

```txt
+-------------------+
|   API Consumers   |
|-------------------|
| Web App           |
| Mobile App        |
| API Clients       |
+---------+---------+
          |
          v
+-------------------------------+
|        Nest.js API             |
|-------------------------------|
| REST Controllers              |
| DTO Validation                |
| Authentication Guards         |
| RBAC Guards                   |
| Tenant Guards                 |
| Services                      |
| Repositories                  |
| Background Job Producers      |
+---------+----------+----------+
          |          |
          |          |
          v          v
+----------------+  +----------------+
| PostgreSQL     |  | Redis          |
|----------------|  |----------------|
| Users          |  | BullMQ Queues  |
| Organizations  |  | Cache          |
| Projects       |  | Rate Limiting  |
| Tasks          |  | Job State      |
| Logs           |  +----------------+
+----------------+
          |
          v
+-------------------------------+
| Railway Deployment Platform   |
|-------------------------------|
| API Service                   |
| PostgreSQL Service            |
| Redis Service                 |
| Environment Variables         |
+-------------------------------+
```

---

## 4. Runtime Components

### 4.1 API Service

The API service is the main Nest.js application.

Responsibilities:

- Handle HTTP requests
- Validate incoming payloads
- Authenticate users
- Authorize actions
- Enforce tenant isolation
- Execute business logic
- Persist data through Prisma
- Publish background jobs
- Return consistent API responses

### 4.2 PostgreSQL Database

PostgreSQL is the primary data store.

Responsibilities:

- Store users
- Store organizations
- Store memberships
- Store projects
- Store tasks
- Store comments
- Store invitations
- Store notifications
- Store audit logs
- Store activity logs

### 4.3 Redis

Redis is used for:

- BullMQ job queues
- Background job state
- Rate limiting support
- Optional short-lived caching

### 4.4 BullMQ Workers

BullMQ is used for asynchronous workloads.

Initial queues:

```txt
emailQueue
notificationQueue
auditQueue
```

Example jobs:

- Send invitation email
- Send password reset email
- Process notification
- Record audit event
- Send due-date reminder

---

## 5. Source Code Structure

Recommended structure:

```txt
src/
  app.module.ts
  main.ts

  common/
    decorators/
      current-user.decorator.ts
      organization-id.decorator.ts
      roles.decorator.ts
    filters/
      http-exception.filter.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      organization-member.guard.ts
    interceptors/
      response.interceptor.ts
      request-logging.interceptor.ts
    pipes/
    types/
    utils/

  config/
    app.config.ts
    database.config.ts
    jwt.config.ts
    redis.config.ts
    validation.ts

  database/
    prisma.module.ts
    prisma.service.ts

  modules/
    auth/
      dto/
      guards/
      strategies/
      auth.controller.ts
      auth.service.ts
      auth.module.ts

    users/
      dto/
      users.controller.ts
      users.service.ts
      users.module.ts

    organizations/
      dto/
      organizations.controller.ts
      organizations.service.ts
      organizations.module.ts

    memberships/
      dto/
      memberships.controller.ts
      memberships.service.ts
      memberships.module.ts

    teams/
      dto/
      teams.controller.ts
      teams.service.ts
      teams.module.ts

    projects/
      dto/
      projects.controller.ts
      projects.service.ts
      projects.module.ts

    tasks/
      dto/
      tasks.controller.ts
      tasks.service.ts
      tasks.module.ts

    comments/
      dto/
      comments.controller.ts
      comments.service.ts
      comments.module.ts

    invitations/
      dto/
      invitations.controller.ts
      invitations.service.ts
      invitations.module.ts

    notifications/
      dto/
      notifications.controller.ts
      notifications.service.ts
      notifications.module.ts

    audit-logs/
      audit-logs.service.ts
      audit-logs.module.ts

    activity-logs/
      activity-logs.service.ts
      activity-logs.module.ts

    health/
      health.controller.ts
      health.module.ts

  jobs/
    queues/
      queue.constants.ts
      queue.module.ts
    processors/
      email.processor.ts
      notification.processor.ts
      audit.processor.ts
```

---

## 6. Module Responsibilities

## 6.1 Auth Module

Responsibilities:

- Register users
- Login users
- Logout users
- Refresh access tokens
- Hash passwords
- Verify passwords
- Store hashed refresh tokens
- Rotate refresh tokens
- Issue JWT access tokens
- Issue JWT refresh tokens
- Start email verification flow
- Start password reset flow

Auth module must not own organization-specific permissions. Organization-level authorization belongs to membership and guard logic.

---

## 6.2 Users Module

Responsibilities:

- Manage user profile
- Retrieve current user
- Update profile information
- Change password
- Store user account status

The users module should not expose sensitive fields such as password hashes or refresh token hashes.

---

## 6.3 Organizations Module

Responsibilities:

- Create organization
- Update organization
- Archive organization
- Retrieve organization details
- List organizations for current user

When a user creates an organization, the system must automatically create an OWNER membership for that user.

---

## 6.4 Memberships Module

Responsibilities:

- Track user membership in organizations
- Store organization role
- Check whether a user belongs to an organization
- Change member role
- Remove organization members
- Enforce owner protection rules

This module is critical for RBAC and tenant isolation.

---

## 6.5 Teams Module

Responsibilities:

- Create teams inside organizations
- Add members to teams
- Remove members from teams
- List team members
- Associate teams with projects

Teams are organization-scoped.

---

## 6.6 Projects Module

Responsibilities:

- Create projects
- Update projects
- Archive projects
- Assign projects to teams
- Add members to projects
- Remove project members
- List organization projects

Projects are organization-scoped.

---

## 6.7 Tasks Module

Responsibilities:

- Create tasks
- Update task details
- Change task status
- Assign tasks
- Set due dates
- Set priority
- Filter tasks
- Search tasks
- Soft-delete tasks
- Record task activity

Tasks are organization-scoped and project-scoped.

---

## 6.8 Comments Module

Responsibilities:

- Add task comments
- Edit comments
- Delete comments
- Mention users
- Trigger notification jobs for mentions

Comments are organization-scoped through their task/project relationship.

---

## 6.9 Invitations Module

Responsibilities:

- Invite users to organizations
- Generate invitation token
- Accept invitations
- Cancel invitations
- Expire invitations
- Queue invitation emails

Invitations must include organization role.

---

## 6.10 Notifications Module

Responsibilities:

- Create in-app notifications
- Mark notifications as read
- List user notifications
- Process notification jobs

Notifications must be user-scoped and organization-scoped when applicable.

---

## 6.11 Activity Logs Module

Responsibilities:

- Record business activity visible to users
- Show project/task/member activity history

Examples:

- Task created
- Task assigned
- Comment added
- Project archived

---

## 6.12 Audit Logs Module

Responsibilities:

- Record security-sensitive and administrative actions
- Store actor, action, resource, IP address, user agent, and metadata

Examples:

- Login
- Password reset requested
- Password changed
- Role changed
- Member removed
- Organization archived

---

## 7. Request Lifecycle

A typical protected request should follow this flow:

```txt
HTTP Request
  -> Global Middleware
  -> Request ID Assignment
  -> Request Logging
  -> DTO Validation
  -> JWT Auth Guard
  -> Organization Membership Guard
  -> Roles Guard
  -> Controller
  -> Service
  -> Prisma
  -> PostgreSQL
  -> Optional BullMQ Job
  -> Response Interceptor
  -> HTTP Response
```

---

## 8. Authentication Architecture

Authentication uses JWT access tokens and refresh tokens.

### Access Token

- Short-lived
- Sent in Authorization header
- Used to access protected routes
- Contains user ID and token metadata

### Refresh Token

- Longer-lived
- Used to obtain new access tokens
- Stored by the client securely
- Stored in the database as a hash
- Rotated on every refresh

### Token Rules

- Never store refresh tokens in plaintext.
- Invalidate old refresh token on refresh.
- Clear refresh token hash on logout.
- Use different secrets for access and refresh tokens.

---

## 9. Authorization Architecture

Authorization has three layers:

### 9.1 Authentication Check

Confirms the user is logged in.

### 9.2 Tenant Membership Check

Confirms the user belongs to the organization being accessed.

### 9.3 Role Permission Check

Confirms the user role allows the requested action.

Example:

```txt
PATCH /api/v1/organizations/:organizationId/projects/:projectId
```

The system must check:

```txt
1. Is the user authenticated?
2. Is the user a member of this organization?
3. Does the user have OWNER, ADMIN, or PROJECT_MANAGER role?
4. Does the project belong to this organization?
```

---

## 10. Multi-Tenancy Architecture

This project uses **single database, shared schema, tenant-scoped rows**.

Each tenant-scoped table includes:

```txt
organizationId
```

This strategy is simple, realistic, and suitable for SaaS applications at early and mid scale.

### Tenant Isolation Rule

Every query for tenant-owned data must include `organizationId`.

Bad:

```ts
await prisma.project.findUnique({
  where: { id: projectId },
});
```

Good:

```ts
await prisma.project.findFirst({
  where: {
    id: projectId,
    organizationId,
  },
});
```

---

## 11. Data Access Architecture

Prisma is the only supported database access layer.

Services may call Prisma directly through `PrismaService`.

Repository classes may be introduced for modules with complex query logic, but repository abstraction should not be added everywhere unnecessarily.

Use database transactions for multi-step write operations.

Examples:

- Create organization + owner membership
- Accept invitation + create membership + update invitation status
- Create task + create activity log + create notification job
- Change member role + create audit log

---

## 12. Background Job Architecture

The API service publishes jobs to BullMQ.

Workers process jobs asynchronously.

Example:

```txt
User invites member
  -> Invitation created in database
  -> emailQueue.add("sendInvitationEmail")
  -> HTTP response returned
  -> Email processor sends email later
```

Jobs must be idempotent where possible.

Failed jobs should be retried.

---

## 13. Error Handling Architecture

Use a global exception filter.

Error response shape:

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "error": "Forbidden",
  "timestamp": "2026-06-21T00:00:00.000Z",
  "path": "/api/v1/organizations/org-id/projects",
  "requestId": "req_123"
}
```

Do not expose internal stack traces in production.

---

## 14. Validation Architecture

Use DTO classes with `class-validator`.

Validation must be enabled globally in `main.ts`.

Recommended global validation behavior:

- Whitelist allowed fields
- Reject unknown fields
- Transform payloads where needed
- Validate nested DTOs where needed

---

## 15. API Response Architecture

Use consistent response shapes.

Single resource response:

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {}
}
```

List response:

```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 16. Logging Architecture

Log:

- Request method
- Request path
- Status code
- Duration
- Request ID
- User ID when available
- Organization ID when available

Security-sensitive actions must also be written to audit logs.

---

## 17. Railway Deployment Architecture

Railway will host:

```txt
API Service
PostgreSQL Service
Redis Service
```

Required environment variables:

```txt
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
NODE_ENV
PORT
APP_URL
CORS_ORIGIN
```

The application must listen on `process.env.PORT`.

---

## 18. Build and Release Flow

Recommended flow:

```txt
Developer pushes code to GitHub
  -> GitHub Actions runs lint/tests/build
  -> Railway deploys from GitHub
  -> Prisma client is generated
  -> App starts on Railway
```

Database migrations should be run intentionally and safely.

For portfolio purposes, document the migration command clearly.

---

## 19. Testing Architecture

Use three levels of tests:

### Unit Tests

Test services and guards in isolation.

### Integration Tests

Test modules with database interactions.

### E2E Tests

Test full API flows with Supertest.

Critical test areas:

- Auth
- Token refresh
- Organization creation
- Membership checks
- RBAC permissions
- Tenant isolation
- Task CRUD
- Invitation acceptance

---

## 20. Architecture Decision Records

Important architectural decisions:

| Decision | Choice | Reason |
|---|---|---|
| Application style | Modular monolith | Best balance of simplicity and scalability for v1 |
| Database | PostgreSQL | Strong relational modeling and production reliability |
| ORM | Prisma | Type-safe database access and good TypeScript developer experience |
| Queue | BullMQ | Strong Redis-backed job queue for Node.js |
| Cache/Queue backend | Redis | Required for BullMQ and useful for rate limiting |
| Deployment | Railway | Simple deployment with managed PostgreSQL and Redis |
| Auth | JWT + refresh tokens | Common production API authentication model |
| Authorization | RBAC + tenant checks | Required for multi-tenant SaaS security |
| Multi-tenancy | Shared DB, tenant-scoped rows | Practical and simple for v1 |
