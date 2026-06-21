# 11-codex-build-plan.md

# Codex Build Plan

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document gives Codex a step-by-step implementation plan for building the Nest.js SaaS API.

The goal is to reduce random vibe-coding mistakes by giving Codex a structured build order.

Codex should follow this document together with:

```txt
AGENTS.md
00-project-overview.md
01-product-requirements-document.md
02-architecture-document.md
03-database-design.md
04-api-specification.md
05-auth-rbac-security.md
06-multi-tenancy-strategy.md
07-background-jobs.md
08-error-handling-logging.md
09-testing-strategy.md
10-deployment-railway.md
```

---

## 2. Build Principles

Codex must follow these principles:

```txt
Build incrementally.
Keep the app running after every major step.
Add tests for critical behavior.
Do not skip tenant isolation.
Do not skip RBAC.
Do not hardcode secrets.
Use DTO validation.
Use Swagger decorators.
Use Prisma transactions for multi-step writes.
Use Railway-compatible deployment settings.
```

---

## 3. Implementation Phases

The project should be implemented in phases.

---

# Phase 1: Project Setup

## Goal

Create the base Nest.js project and install required dependencies.

## Tasks

```txt
1. Create Nest.js project.
2. Configure TypeScript.
3. Add environment config.
4. Add validation pipe.
5. Add Swagger.
6. Add global API prefix /api/v1.
7. Add health module.
8. Add base README.
```

## Dependencies

Install:

```bash
npm install @nestjs/config class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
npm install helmet
npm install @nestjs/throttler
npm install @prisma/client
npm install argon2
npm install @nestjs/jwt passport passport-jwt @nestjs/passport
npm install redis bullmq @nestjs/bullmq
npm install nestjs-pino pino-http
npm install uuid
npm install zod
```

Dev dependencies:

```bash
npm install -D prisma
npm install -D @types/passport-jwt
npm install -D supertest
```

## Acceptance Criteria

```txt
App starts locally.
GET /api/v1/health works.
Swagger is available at /api/docs.
Environment validation works.
```

---

# Phase 2: Prisma and Database Setup

## Goal

Configure Prisma with PostgreSQL and create initial schema.

## Tasks

```txt
1. Initialize Prisma.
2. Add PostgreSQL datasource.
3. Add enums.
4. Add User model.
5. Add Organization model.
6. Add Membership model.
7. Add all remaining models from database document.
8. Generate migration.
9. Generate Prisma client.
10. Add PrismaModule and PrismaService.
```

## Commands

```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

## Acceptance Criteria

```txt
Prisma client generates successfully.
Migration runs successfully.
Database contains all required tables.
App can connect to database.
```

---

# Phase 3: Common Infrastructure

## Goal

Build shared infrastructure used by all modules.

## Tasks

```txt
1. Add request ID middleware.
2. Add global exception filter.
3. Add response interceptor.
4. Add logging interceptor.
5. Add common pagination utility.
6. Add common decorators.
7. Add base error handling.
8. Add Prisma error mapping.
```

## Files

```txt
src/common/decorators/current-user.decorator.ts
src/common/decorators/roles.decorator.ts
src/common/decorators/public.decorator.ts
src/common/filters/http-exception.filter.ts
src/common/interceptors/response.interceptor.ts
src/common/interceptors/request-logging.interceptor.ts
src/common/utils/pagination.util.ts
```

## Acceptance Criteria

```txt
Errors follow standard shape.
Responses follow standard shape.
Request ID appears in responses.
```

---

# Phase 4: Authentication Module

## Goal

Implement secure authentication.

## Tasks

```txt
1. Create AuthModule.
2. Create AuthController.
3. Create AuthService.
4. Create RegisterDto.
5. Create LoginDto.
6. Create RefreshTokenDto.
7. Create ForgotPasswordDto.
8. Create ResetPasswordDto.
9. Create VerifyEmailDto.
10. Implement password hashing.
11. Implement register.
12. Implement login.
13. Implement refresh token rotation.
14. Implement logout.
15. Implement forgot password.
16. Implement reset password.
17. Implement email verification.
18. Add JWT strategy.
19. Add JwtAuthGuard.
20. Add tests.
```

## Acceptance Criteria

```txt
User can register.
User can login.
User receives access and refresh tokens.
Refresh token is stored as hash.
Refresh token rotates.
Logout clears refresh token hash.
Protected route rejects unauthenticated request.
```

---

# Phase 5: Users Module

## Goal

Implement current user profile endpoints.

## Tasks

```txt
1. Create UsersModule.
2. Create UsersController.
3. Create UsersService.
4. Implement GET /users/me.
5. Implement PATCH /users/me.
6. Implement PATCH /users/me/password.
7. Ensure passwordHash and refreshTokenHash are never returned.
8. Add tests.
```

## Acceptance Criteria

```txt
Authenticated user can view profile.
Authenticated user can update profile.
Authenticated user can change password.
Sensitive fields are never returned.
```

---

# Phase 6: Organization and Membership Modules

## Goal

Implement tenant root and membership system.

## Tasks

```txt
1. Create OrganizationsModule.
2. Create MembershipsModule.
3. Implement organization creation.
4. Organization creation creates OWNER membership.
5. Implement list my organizations.
6. Implement get organization.
7. Implement update organization.
8. Implement archive organization.
9. Implement list members.
10. Implement change member role.
11. Implement remove member.
12. Add OrganizationMemberGuard.
13. Add RolesGuard.
14. Add tests.
```

## Acceptance Criteria

```txt
User can create organization.
Owner membership is created automatically.
Only organization members can access organization.
RBAC works.
Admin cannot remove owner.
Tenant guard works.
```

---

# Phase 7: Invitation Module

## Goal

Implement organization invitations.

## Tasks

```txt
1. Create InvitationsModule.
2. Add create invitation endpoint.
3. Generate invitation raw token.
4. Store invitation token hash.
5. Queue invitation email job.
6. Add list invitations endpoint.
7. Add accept invitation endpoint.
8. Add cancel invitation endpoint.
9. Add audit logs.
10. Add tests.
```

## Acceptance Criteria

```txt
Owner/admin can invite users.
Member cannot invite users.
Raw invitation token is not stored.
User can accept valid invitation.
Expired invitation fails.
Cancelled invitation fails.
Invitation acceptance creates membership.
```

---

# Phase 8: Teams Module

## Goal

Implement organization teams.

## Tasks

```txt
1. Create TeamsModule.
2. Add create team.
3. Add list teams.
4. Add get team.
5. Add update team.
6. Add delete team.
7. Add add team member.
8. Add remove team member.
9. Validate members belong to organization.
10. Add tests.
```

## Acceptance Criteria

```txt
Owner/admin can manage teams.
Team names are unique per organization.
Team members must belong to organization.
Soft-deleted teams are excluded from normal list.
```

---

# Phase 9: Projects Module

## Goal

Implement organization projects.

## Tasks

```txt
1. Create ProjectsModule.
2. Add create project.
3. Add list projects.
4. Add get project.
5. Add update project.
6. Add archive project.
7. Add add project member.
8. Add remove project member.
9. Validate project belongs to organization.
10. Add activity logs.
11. Add tests.
```

## Acceptance Criteria

```txt
Owner/admin/project manager can create project.
Project key is unique per organization.
Projects are tenant-isolated.
Archived projects are excluded from normal list.
```

---

# Phase 10: Tasks Module

## Goal

Implement project tasks.

## Tasks

```txt
1. Create TasksModule.
2. Add create task.
3. Add list project tasks.
4. Add get task.
5. Add update task.
6. Add change task status.
7. Add delete task.
8. Add list my assigned tasks.
9. Validate project belongs to organization.
10. Validate assignee belongs to organization.
11. Queue notification when task is assigned.
12. Add activity logs.
13. Add tests.
```

## Acceptance Criteria

```txt
Tasks are tenant-isolated.
Task project must belong to organization.
Assignee must belong to organization.
Task status can be changed.
Task assignment queues notification.
```

---

# Phase 11: Comments Module

## Goal

Implement task comments.

## Tasks

```txt
1. Create CommentsModule.
2. Add create comment.
3. Add list task comments.
4. Add update comment.
5. Add delete comment.
6. Ensure task belongs to organization.
7. Add activity logs.
8. Add mention notification placeholder.
9. Add tests.
```

## Acceptance Criteria

```txt
Users can comment on accessible tasks.
Comment author can edit own comment.
Admins/project managers can moderate comments.
Deleted comments are hidden.
```

---

# Phase 12: Notifications Module

## Goal

Implement in-app notifications.

## Tasks

```txt
1. Create NotificationsModule.
2. Add list my notifications.
3. Add mark notification as read.
4. Add mark all as read.
5. Create notification processor.
6. Add tests.
```

## Acceptance Criteria

```txt
User can view own notifications.
User cannot view another user's notifications.
Notifications can be marked as read.
Task assignment creates notification.
```

---

# Phase 13: Audit and Activity Logs

## Goal

Implement logs.

## Tasks

```txt
1. Create AuditLogsModule.
2. Create ActivityLogsModule.
3. Add list organization audit logs endpoint.
4. Add list organization activity logs endpoint.
5. Add logging service methods.
6. Add audit entries for security/admin actions.
7. Add activity entries for business events.
8. Add tests.
```

## Acceptance Criteria

```txt
Owner/admin can view audit logs.
Organization members can view allowed activity logs.
Audit logs are tenant-isolated.
Activity logs are tenant-isolated.
```

---

# Phase 14: Background Jobs

## Goal

Configure Redis and BullMQ.

## Tasks

```txt
1. Add QueueModule.
2. Configure Redis with REDIS_URL.
3. Register emailQueue.
4. Register notificationQueue.
5. Register auditQueue.
6. Add processors.
7. Connect invitation email job.
8. Connect task assignment notification job.
9. Connect audit job where appropriate.
10. Add tests with queue mocks.
```

## Acceptance Criteria

```txt
App connects to Redis.
Invitation creates email job.
Task assignment creates notification job.
Processor can create notification.
```

---

# Phase 15: Swagger Documentation

## Goal

Make API portfolio-friendly.

## Tasks

```txt
1. Add Swagger tags to all controllers.
2. Add operation descriptions.
3. Add auth scheme.
4. Add request DTO docs.
5. Add response docs.
6. Confirm /api/docs works.
```

## Acceptance Criteria

```txt
Swagger UI is complete enough for recruiter demo.
Protected endpoints show bearer auth.
DTOs are visible.
```

---

# Phase 16: Testing Hardening

## Goal

Add critical tests.

## Tasks

```txt
1. Add auth tests.
2. Add organization tests.
3. Add RBAC tests.
4. Add tenant isolation tests.
5. Add task tests.
6. Add invitation tests.
7. Add error format tests.
8. Add CI test command.
```

## Acceptance Criteria

```txt
npm run test passes.
npm run test:e2e passes.
Critical tenant isolation tests exist.
```

---

# Phase 17: Deployment Setup

## Goal

Prepare Railway deployment.

## Tasks

```txt
1. Add Dockerfile.
2. Add railway.json.
3. Add .env.example.
4. Add production scripts.
5. Ensure app listens on process.env.PORT.
6. Ensure Prisma generate runs.
7. Ensure migration deploy command is documented.
8. Add health endpoint.
9. Add deployment section to README.
```

## Acceptance Criteria

```txt
App deploys to Railway.
Health endpoint works on Railway.
Swagger works on Railway.
Database migration works.
Redis connection works.
```

---

# Phase 18: Portfolio README and Case Study

## Goal

Make the project attractive to recruiters.

## Tasks

```txt
1. Write professional README.
2. Add architecture diagram.
3. Add database diagram.
4. Add API docs link.
5. Add deployed Railway link.
6. Add features.
7. Add security section.
8. Add testing section.
9. Add deployment section.
10. Add portfolio case study.
```

## Acceptance Criteria

```txt
README clearly presents this as a senior backend project.
Recruiter can understand business value.
Engineer can understand architecture.
API can be tested through Swagger.
```

---

## 4. Suggested Codex Prompts

Use these prompts one phase at a time.

### Prompt 1

```txt
Read AGENTS.md and all documents in /docs. Implement Phase 1 from docs/11-codex-build-plan.md. Do not implement later phases yet. Keep the app running and update README with the completed setup.
```

### Prompt 2

```txt
Read the database design document and implement Phase 2. Create the Prisma schema with all enums and models. Generate the initial migration. Add PrismaModule and PrismaService. Do not implement business modules yet.
```

### Prompt 3

```txt
Implement Phase 3 common infrastructure: request ID, global exception filter, response interceptor, logging interceptor, pagination utility, and common decorators. Add basic tests for error response shape.
```

### Prompt 4

```txt
Implement Phase 4 authentication exactly as described in the docs. Use argon2, JWT access tokens, refresh token rotation, hashed refresh tokens, DTO validation, guards, and Swagger decorators. Add auth tests.
```

### Prompt 5

```txt
Implement Phase 6 organization and membership modules with tenant guard and roles guard. Ensure organization creation creates owner membership. Add RBAC and tenant isolation tests.
```

### Prompt 6

```txt
Implement projects and tasks modules. Every query must include organizationId. Add tests proving users cannot access projects and tasks from another organization.
```

---

## 5. Stop Conditions for Codex

Codex should stop and ask for review when:

```txt
A phase is completed.
Database schema changes significantly.
An architectural decision conflicts with the docs.
A dependency not listed in docs seems necessary.
Tests are failing and require human judgment.
Deployment configuration needs real Railway values.
```

---

## 6. Human Review Checklist After Each Phase

After each Codex phase, check:

```txt
Does npm run build pass?
Does npm run test pass?
Does the app still start?
Did Codex follow the docs?
Did Codex add unnecessary abstractions?
Did Codex skip tests?
Did Codex leak secrets?
Did Codex break tenant isolation?
Did Codex update docs/README where needed?
```
