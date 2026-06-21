# Nest.js SaaS API — Codex Prompt Sequence

## Project

Enterprise Multi-Tenant Project Management API

## Purpose

Use this file to guide Codex phase by phase.

Do not ask Codex to build the whole application in one prompt. That usually produces messy code, weak tests, broken architecture, and missed tenant isolation.

The correct approach is:

```txt
One phase at a time
Review after each phase
Run tests/build after each phase
Commit after each stable phase
Then continue
```

---

# Before You Start

## Repository Setup

Create a new repository.

Suggested name:

```txt
enterprise-project-management-api
```

Add the documents:

```txt
AGENTS.md
README.md
.env.example

docs/
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
  11-codex-build-plan.md
  12-github-readme.md
  13-portfolio-case-study.md
```

---

# Global Instruction To Paste Into Codex First

Use this as the first prompt in the repo.

```txt
Read AGENTS.md and every markdown file inside /docs.

This project is a production-grade Nest.js backend API for a multi-tenant SaaS project management platform.

You must follow the documentation strictly.

Do not implement the whole project at once.

Work phase by phase according to docs/11-codex-build-plan.md.

After each phase:
1. Summarize what you changed.
2. List files created or modified.
3. Tell me the commands I should run.
4. Tell me whether any tests were added.
5. Tell me what the next phase should be.

Do not skip authentication, RBAC, tenant isolation, tests, Swagger, or Railway deployment requirements.

Start by confirming that you understand the documents and identify any conflicts before writing code.
```

---

# Phase 1 Prompt — Project Setup

```txt
Implement Phase 1 from docs/11-codex-build-plan.md.

Goal:
Create the base Nest.js project setup for the Enterprise Multi-Tenant Project Management API.

Requirements:
- Set up Nest.js with TypeScript.
- Configure /api/v1 global prefix.
- Configure Swagger at /api/docs.
- Add HealthModule with GET /api/v1/health.
- Add ConfigModule.
- Add environment validation.
- Add Helmet.
- Add global validation pipe.
- Add basic app bootstrap in main.ts.
- Ensure the app listens on process.env.PORT || 3000.
- Create or update .env.example.
- Do not implement database, auth, or business modules yet.

Acceptance criteria:
- npm install works.
- npm run start:dev works.
- GET /api/v1/health works.
- /api/docs works.
- npm run build works.

After implementation:
- Summarize changes.
- List modified files.
- Provide commands to run locally.
```

## Human Review After Phase 1

Run:

```bash
npm install
npm run build
npm run start:dev
```

Check:

```txt
/api/v1/health works
/api/docs works
No business modules were implemented yet
No secrets were hardcoded
```

Commit:

```bash
git add .
git commit -m "chore: setup base Nest.js API"
```

---

# Phase 2 Prompt — Prisma and Database Setup

```txt
Implement Phase 2 from docs/11-codex-build-plan.md using docs/03-database-design.md as the source of truth.

Goal:
Configure Prisma and PostgreSQL database schema.

Requirements:
- Install and configure Prisma if not already configured.
- Create prisma/schema.prisma.
- Add all enums from docs/03-database-design.md.
- Add all models from docs/03-database-design.md.
- Use UUID primary keys.
- Add indexes and unique constraints.
- Add PrismaModule.
- Add PrismaService.
- Enable graceful Prisma shutdown if appropriate.
- Add scripts for prisma generate, migrate dev, migrate deploy, and studio.
- Do not implement controllers for business modules yet.

Acceptance criteria:
- npx prisma generate works.
- npx prisma migrate dev --name init works.
- npm run build works.
- PrismaService can be injected.

After implementation:
- Summarize changes.
- List modified files.
- Tell me exact migration commands to run.
```

## Human Review After Phase 2

Run:

```bash
npx prisma format
npx prisma generate
npx prisma migrate dev --name init
npm run build
```

Check:

```txt
All models exist
organizationId appears on tenant-scoped tables
User.passwordHash exists
User.refreshTokenHash exists
Invitation.tokenHash exists
PasswordResetToken.tokenHash exists
EmailVerificationToken.tokenHash exists
```

Commit:

```bash
git add .
git commit -m "feat: add Prisma database schema"
```

---

# Phase 3 Prompt — Common Infrastructure

```txt
Implement Phase 3 from docs/11-codex-build-plan.md.

Goal:
Add shared infrastructure before building business features.

Requirements:
- Add request ID middleware.
- Add global exception filter.
- Add Prisma error mapping.
- Add response interceptor.
- Add request logging interceptor.
- Add common decorators:
  - @CurrentUser()
  - @CurrentUserId()
  - @Public()
  - @Roles()
- Add pagination utility.
- Ensure error responses match docs/08-error-handling-logging.md.
- Ensure successful responses follow the standard shape.
- Add basic tests for error response shape if practical.
- Do not implement auth business logic yet.

Acceptance criteria:
- Validation errors have standard shape.
- 404 errors have standard shape.
- Response wrapper works.
- Request ID appears in response headers and error responses.
- npm run build works.

After implementation:
- Summarize changes.
- List modified files.
- Provide commands to verify.
```

## Human Review After Phase 3

Run:

```bash
npm run build
npm run test
npm run start:dev
```

Check:

```txt
Errors have requestId
Responses are consistently wrapped
No sensitive data is logged
No controllers are bloated
```

Commit:

```bash
git add .
git commit -m "feat: add common API infrastructure"
```

---

# Phase 4 Prompt — Authentication

```txt
Implement Phase 4 from docs/11-codex-build-plan.md using docs/05-auth-rbac-security.md.

Goal:
Implement secure authentication.

Requirements:
- Create AuthModule.
- Create AuthController.
- Create AuthService.
- Create DTOs:
  - RegisterDto
  - LoginDto
  - RefreshTokenDto
  - ForgotPasswordDto
  - ResetPasswordDto
  - VerifyEmailDto
- Use argon2 for password hashing.
- Implement register.
- Implement login.
- Implement refresh token rotation.
- Implement logout.
- Implement forgot password.
- Implement reset password.
- Implement email verification.
- Add JWT access token strategy.
- Add JWT refresh validation logic.
- Add JwtAuthGuard.
- Store only hashed refresh tokens.
- Store only hashed password reset and verification tokens.
- Never return passwordHash, refreshTokenHash, or tokenHash.
- Add Swagger decorators.
- Add tests for register, login, refresh, logout, and protected route behavior.

Endpoints:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- POST /api/v1/auth/verify-email

Acceptance criteria:
- User can register.
- User can login.
- Refresh token rotates.
- Logout clears refresh token hash.
- Invalid credentials return generic error.
- Protected route rejects missing token.
- npm run build works.
- Auth tests pass.

After implementation:
- Summarize changes.
- List modified files.
- Provide commands to test auth manually with curl or Swagger.
```

## Human Review After Phase 4

Run:

```bash
npm run build
npm run test
npm run start:dev
```

Test manually:

```txt
Register user
Login user
Call protected endpoint without token
Call protected endpoint with token
Refresh token
Logout
```

Check:

```txt
passwordHash is not returned
refreshTokenHash is not returned
Refresh token is hashed in database
Invalid login does not reveal whether email exists
```

Commit:

```bash
git add .
git commit -m "feat: implement secure authentication"
```

---

# Phase 5 Prompt — Users Module

```txt
Implement Phase 5 from docs/11-codex-build-plan.md.

Goal:
Implement current user profile management.

Requirements:
- Create UsersModule.
- Create UsersController.
- Create UsersService.
- Implement GET /api/v1/users/me.
- Implement PATCH /api/v1/users/me.
- Implement PATCH /api/v1/users/me/password.
- Require authentication.
- Use DTO validation.
- Use Swagger decorators.
- Never return sensitive fields.
- Add tests.

Acceptance criteria:
- Authenticated user can view profile.
- Authenticated user can update profile.
- Authenticated user can change password.
- Old password is required before password change.
- New password is hashed.
- Sensitive fields are never returned.
- npm run build works.
```

## Human Review After Phase 5

Run:

```bash
npm run build
npm run test
```

Check:

```txt
/users/me requires auth
Password change validates current password
passwordHash is never returned
```

Commit:

```bash
git add .
git commit -m "feat: add user profile management"
```

---

# Phase 6 Prompt — Organizations, Memberships, RBAC, Tenant Guard

```txt
Implement Phase 6 from docs/11-codex-build-plan.md using:
- docs/05-auth-rbac-security.md
- docs/06-multi-tenancy-strategy.md
- docs/04-api-specification.md

Goal:
Implement organization and membership system with RBAC and tenant guard.

Requirements:
- Create OrganizationsModule.
- Create MembershipsModule.
- Implement organization creation.
- Creating organization must create OWNER membership in a transaction.
- Implement list my organizations.
- Implement get organization.
- Implement update organization.
- Implement archive organization.
- Implement list organization members.
- Implement change member role.
- Implement remove member.
- Add OrganizationMemberGuard.
- Add RolesGuard.
- Add @Roles decorator usage.
- Ensure admin cannot remove or demote owner.
- Ensure only owner can archive organization.
- Add audit/activity logs where reasonable.
- Add Swagger decorators.
- Add RBAC tests.
- Add tenant membership tests.

Endpoints:
- POST /api/v1/organizations
- GET /api/v1/organizations
- GET /api/v1/organizations/:organizationId
- PATCH /api/v1/organizations/:organizationId
- DELETE /api/v1/organizations/:organizationId
- GET /api/v1/organizations/:organizationId/members
- PATCH /api/v1/organizations/:organizationId/members/:memberId/role
- DELETE /api/v1/organizations/:organizationId/members/:memberId

Acceptance criteria:
- User can create organization.
- Owner membership is created automatically.
- Non-members cannot access organization.
- Member cannot update organization.
- Admin cannot remove owner.
- Owner can archive organization.
- npm run build works.
- RBAC tests pass.
```

## Human Review After Phase 6

Run:

```bash
npm run build
npm run test
```

Manually test:

```txt
Create organization
List organizations
Create second user
Add second user manually or through test setup
Try access as non-member
Try member update organization
Try admin remove owner
```

Check:

```txt
Organization queries are tenant-safe
Guards are reusable
Membership role is attached to request
```

Commit:

```bash
git add .
git commit -m "feat: add organizations memberships and RBAC"
```

---

# Phase 7 Prompt — Invitations

```txt
Implement Phase 7 from docs/11-codex-build-plan.md.

Goal:
Implement organization invitations.

Requirements:
- Create InvitationsModule.
- Implement create invitation.
- Implement list invitations.
- Implement accept invitation.
- Implement cancel invitation.
- Generate raw invitation token.
- Store invitation token hash only.
- Invitation must expire.
- Only OWNER and ADMIN can invite.
- Accepting invitation creates ACTIVE membership.
- Accepting invitation marks invitation as ACCEPTED.
- Cancelled invitation cannot be accepted.
- Expired invitation cannot be accepted.
- Queue invitation email job if queue module exists; otherwise create a placeholder service and TODO for Phase 14.
- Add audit logs.
- Add Swagger decorators.
- Add tests.

Endpoints:
- POST /api/v1/organizations/:organizationId/invitations
- GET /api/v1/organizations/:organizationId/invitations
- POST /api/v1/invitations/accept
- DELETE /api/v1/organizations/:organizationId/invitations/:invitationId

Acceptance criteria:
- Owner/admin can invite.
- Member cannot invite.
- Raw token is not stored.
- Valid invitation can be accepted.
- Expired/cancelled invitation fails.
- Accepting invitation creates membership.
- npm run build works.
```

## Human Review After Phase 7

Run:

```bash
npm run build
npm run test
```

Check:

```txt
tokenHash only
No raw token in DB
Accept invitation is transactional
```

Commit:

```bash
git add .
git commit -m "feat: add organization invitations"
```

---

# Phase 8 Prompt — Teams

```txt
Implement Phase 8 from docs/11-codex-build-plan.md.

Goal:
Implement teams inside organizations.

Requirements:
- Create TeamsModule.
- Implement create team.
- Implement list teams.
- Implement get team.
- Implement update team.
- Implement delete team using soft delete.
- Implement add team member.
- Implement remove team member.
- Validate user belongs to organization before adding to team.
- Ensure team names are unique per organization.
- Use organizationId in every tenant-scoped query.
- Add Swagger decorators.
- Add tests.

Endpoints:
- POST /api/v1/organizations/:organizationId/teams
- GET /api/v1/organizations/:organizationId/teams
- GET /api/v1/organizations/:organizationId/teams/:teamId
- PATCH /api/v1/organizations/:organizationId/teams/:teamId
- DELETE /api/v1/organizations/:organizationId/teams/:teamId
- POST /api/v1/organizations/:organizationId/teams/:teamId/members
- DELETE /api/v1/organizations/:organizationId/teams/:teamId/members/:userId

Acceptance criteria:
- Owner/admin can manage teams.
- Team members must belong to the organization.
- User from another organization cannot be added.
- Soft-deleted teams are excluded.
- npm run build works.
```

## Human Review After Phase 8

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Every team query includes organizationId
Adding team member validates membership
```

Commit:

```bash
git add .
git commit -m "feat: add team management"
```

---

# Phase 9 Prompt — Projects

```txt
Implement Phase 9 from docs/11-codex-build-plan.md.

Goal:
Implement projects inside organizations.

Requirements:
- Create ProjectsModule.
- Implement create project.
- Implement list projects.
- Implement get project.
- Implement update project.
- Implement archive project.
- Implement add project member.
- Implement remove project member.
- Validate team belongs to organization if teamId is provided.
- Validate project members belong to organization.
- Project key must be unique per organization.
- Use organizationId in every project query.
- Add activity logs.
- Add Swagger decorators.
- Add tests, especially tenant isolation tests.

Endpoints:
- POST /api/v1/organizations/:organizationId/projects
- GET /api/v1/organizations/:organizationId/projects
- GET /api/v1/organizations/:organizationId/projects/:projectId
- PATCH /api/v1/organizations/:organizationId/projects/:projectId
- DELETE /api/v1/organizations/:organizationId/projects/:projectId
- POST /api/v1/organizations/:organizationId/projects/:projectId/members
- DELETE /api/v1/organizations/:organizationId/projects/:projectId/members/:userId

Acceptance criteria:
- Owner/admin/project manager can create project.
- Member cannot create project.
- Project key is unique per organization.
- Same project key can exist in different organizations.
- User cannot access project from another organization.
- npm run build works.
```

## Human Review After Phase 9

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Project queries include organizationId
Cross-tenant project access returns 404
Project key uniqueness is per organization
```

Commit:

```bash
git add .
git commit -m "feat: add project management"
```

---

# Phase 10 Prompt — Tasks

```txt
Implement Phase 10 from docs/11-codex-build-plan.md.

Goal:
Implement project task management.

Requirements:
- Create TasksModule.
- Implement create task.
- Implement list project tasks.
- Implement get task.
- Implement update task.
- Implement change task status.
- Implement delete task using soft delete.
- Implement list my assigned tasks.
- Validate project belongs to organization.
- Validate assignee belongs to organization.
- Use organizationId in every tenant-scoped task query.
- Add activity logs.
- Queue notification job if queue module exists; otherwise add placeholder.
- Add Swagger decorators.
- Add tests, especially tenant isolation tests.

Endpoints:
- POST /api/v1/organizations/:organizationId/projects/:projectId/tasks
- GET /api/v1/organizations/:organizationId/projects/:projectId/tasks
- GET /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId
- PATCH /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId
- PATCH /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/status
- DELETE /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId
- GET /api/v1/tasks/assigned-to-me

Acceptance criteria:
- Task project must belong to organization.
- Assignee must belong to organization.
- User cannot access task from another organization.
- Status change creates activity log.
- Assignment queues or prepares notification.
- npm run build works.
```

## Human Review After Phase 10

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Task queries include organizationId
Assignee validation exists
Cross-tenant task access returns 404
```

Commit:

```bash
git add .
git commit -m "feat: add task management"
```

---

# Phase 11 Prompt — Comments

```txt
Implement Phase 11 from docs/11-codex-build-plan.md.

Goal:
Implement task comments.

Requirements:
- Create CommentsModule.
- Implement add comment.
- Implement list task comments.
- Implement update comment.
- Implement delete comment using soft delete.
- Validate task belongs to project and organization.
- Only author, OWNER, ADMIN, or PROJECT_MANAGER can edit/delete comment.
- Add activity logs.
- Add mention notification placeholder if mentions are not fully implemented.
- Add Swagger decorators.
- Add tests.

Endpoints:
- POST /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
- GET /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
- PATCH /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId
- DELETE /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId

Acceptance criteria:
- User can comment on accessible task.
- Comment author can update own comment.
- Another member cannot update comment unless admin/project manager.
- Deleted comments are excluded.
- Cross-tenant comment access fails.
- npm run build works.
```

## Human Review After Phase 11

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Comment update authorization is correct
Comment queries are tenant-safe
```

Commit:

```bash
git add .
git commit -m "feat: add task comments"
```

---

# Phase 12 Prompt — Notifications

```txt
Implement Phase 12 from docs/11-codex-build-plan.md.

Goal:
Implement in-app notifications.

Requirements:
- Create NotificationsModule.
- Implement list my notifications.
- Implement mark notification as read.
- Implement mark all notifications as read.
- User can only access own notifications.
- organizationId filter is optional for list/read-all.
- Add notification creation service method for other modules.
- Add Swagger decorators.
- Add tests.

Endpoints:
- GET /api/v1/notifications
- PATCH /api/v1/notifications/:notificationId/read
- PATCH /api/v1/notifications/read-all

Acceptance criteria:
- User can view own notifications.
- User cannot view another user's notifications.
- Notification can be marked read.
- Mark all works.
- npm run build works.
```

## Human Review After Phase 12

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Notifications are user-scoped
No user can mark another user's notification as read
```

Commit:

```bash
git add .
git commit -m "feat: add notifications"
```

---

# Phase 13 Prompt — Audit Logs and Activity Logs

```txt
Implement Phase 13 from docs/11-codex-build-plan.md.

Goal:
Implement audit and activity logs.

Requirements:
- Create AuditLogsModule.
- Create ActivityLogsModule.
- Add service methods to create audit logs.
- Add service methods to create activity logs.
- Add list organization audit logs endpoint.
- Add list organization activity logs endpoint.
- Only OWNER and ADMIN can view audit logs.
- Organization members can view activity logs based on role.
- Ensure logs are tenant-isolated.
- Add Swagger decorators.
- Add tests.

Endpoints:
- GET /api/v1/organizations/:organizationId/audit-logs
- GET /api/v1/organizations/:organizationId/activity-logs

Acceptance criteria:
- Audit logs are created for security/admin actions.
- Activity logs are created for business events.
- Audit logs are visible only to owner/admin.
- Logs are tenant-isolated.
- npm run build works.
```

## Human Review After Phase 13

Run:

```bash
npm run build
npm run test
```

Check:

```txt
Audit log access is restricted
Activity logs have organizationId
Security actions are logged
```

Commit:

```bash
git add .
git commit -m "feat: add audit and activity logs"
```

---

# Phase 14 Prompt — Background Jobs

```txt
Implement Phase 14 from docs/11-codex-build-plan.md using docs/07-background-jobs.md.

Goal:
Configure Redis and BullMQ background jobs.

Requirements:
- Install and configure @nestjs/bullmq if not already installed.
- Create QueueModule.
- Configure Redis using REDIS_URL.
- Register emailQueue.
- Register notificationQueue.
- Register auditQueue.
- Create queue.constants.ts.
- Create email processor.
- Create notification processor.
- Create audit processor.
- Wire invitation creation to email queue.
- Wire task assignment to notification queue.
- Wire audit job where appropriate.
- Use retry options.
- Do not log raw tokens in production.
- Add tests with queue mocks.

Acceptance criteria:
- App connects to Redis.
- Invitation queues email job.
- Task assignment queues notification job.
- Notification processor can create notification.
- npm run build works.
```

## Human Review After Phase 14

Run:

```bash
npm run build
npm run test
npm run start:dev
```

Check:

```txt
Redis connection works
Queue job names are constants
No raw tokens are logged
Jobs have retries
```

Commit:

```bash
git add .
git commit -m "feat: add background job processing"
```

---

# Phase 15 Prompt — Swagger Hardening

```txt
Implement Phase 15 from docs/11-codex-build-plan.md.

Goal:
Make Swagger documentation portfolio-ready.

Requirements:
- Add @ApiTags to every controller.
- Add @ApiOperation to every endpoint.
- Add @ApiBearerAuth to protected controllers/routes.
- Add @ApiParam for route params.
- Add @ApiQuery for query params.
- Add @ApiBody where useful.
- Add @ApiResponse for success and common errors.
- Ensure DTOs appear correctly in Swagger.
- Ensure /api/docs works.

Acceptance criteria:
- Swagger is readable.
- Auth is documented.
- DTO schemas are visible.
- Recruiter or engineer can test endpoints from Swagger.
- npm run build works.
```

## Human Review After Phase 15

Run:

```bash
npm run build
npm run start:dev
```

Open:

```txt
http://localhost:3000/api/docs
```

Check:

```txt
All modules are tagged
Bearer auth works in Swagger
DTOs display correctly
```

Commit:

```bash
git add .
git commit -m "docs: improve Swagger API documentation"
```

---

# Phase 16 Prompt — Testing Hardening

```txt
Implement Phase 16 from docs/11-codex-build-plan.md using docs/09-testing-strategy.md.

Goal:
Add strong critical-path tests.

Requirements:
- Add test helpers.
- Add auth tests.
- Add organization tests.
- Add invitation tests.
- Add RBAC tests.
- Add tenant isolation tests.
- Add project tests.
- Add task tests.
- Add error format tests.
- Ensure tests can run consistently.
- Add test database guidance to README.

Acceptance criteria:
- npm run test passes.
- npm run test:e2e passes if configured.
- Critical tenant isolation tests exist.
- Auth refresh rotation test exists.
- Admin cannot remove owner test exists.
```

## Human Review After Phase 16

Run:

```bash
npm run test
npm run test:e2e
npm run build
```

Check:

```txt
Tests are not fake
Tenant isolation is actually tested with two organizations
Critical auth behavior is tested
```

Commit:

```bash
git add .
git commit -m "test: add critical backend test coverage"
```

---

# Phase 17 Prompt — Railway Deployment Setup

```txt
Implement Phase 17 from docs/11-codex-build-plan.md using docs/10-deployment-railway.md.

Goal:
Prepare the project for Railway deployment.

Requirements:
- Add Dockerfile.
- Add railway.json.
- Add docker-compose.yml for local PostgreSQL and Redis.
- Update package scripts.
- Ensure Prisma generate runs during install/build.
- Ensure production command supports prisma migrate deploy.
- Ensure app listens on process.env.PORT.
- Confirm required env variables are in .env.example.
- Add health endpoint database/redis checks if practical.
- Update README deployment section.

Acceptance criteria:
- Dockerfile exists.
- railway.json exists.
- docker compose up -d works locally.
- npm run build works.
- Production start command is documented.
- Railway env vars are documented.
```

## Human Review After Phase 17

Run:

```bash
docker compose up -d
npm run build
npx prisma migrate deploy
npm run start:prod
```

Check:

```txt
App starts with production command
Health endpoint works
Dockerfile is not bloated
No real secrets in repo
```

Commit:

```bash
git add .
git commit -m "chore: add Railway deployment setup"
```

---

# Phase 18 Prompt — Portfolio README and Case Study

```txt
Implement Phase 18 from docs/11-codex-build-plan.md using:
- docs/12-github-readme.md
- docs/13-portfolio-case-study.md

Goal:
Make the repository portfolio-ready.

Requirements:
- Replace README.md with a polished portfolio README.
- Include project overview.
- Include architecture summary.
- Include tech stack table.
- Include feature list.
- Include authentication/security section.
- Include multi-tenancy section.
- Include testing section.
- Include local development instructions.
- Include Railway deployment instructions.
- Include Swagger URL placeholder.
- Include deployed API URL placeholder.
- Add portfolio case study to docs/13-portfolio-case-study.md if not already present.
- Add screenshots placeholders for Swagger if screenshots are not available yet.

Acceptance criteria:
- README looks professional.
- README explains senior backend concepts.
- README is not too shallow.
- A recruiter can understand the value of the project.
- An engineer can run the project locally.
```

## Human Review After Phase 18

Check:

```txt
README looks strong on GitHub
Deployed link is included if available
Swagger link is included if available
Screenshots are added or placeholders exist
```

Commit:

```bash
git add .
git commit -m "docs: add portfolio-ready README and case study"
```

---

# Railway Deployment Prompt

Use this after Phase 17 when the repo is ready.

```txt
Review the current project for Railway deployment readiness.

Check:
- Dockerfile
- railway.json
- package scripts
- Prisma generate
- Prisma migrate deploy
- process.env.PORT usage
- DATABASE_URL usage
- REDIS_URL usage
- NODE_ENV handling
- CORS_ORIGIN handling
- Swagger path
- Health endpoint

Do not make unnecessary architectural changes.

Fix only deployment-related issues.

After changes, give me:
1. Railway services to create.
2. Environment variables to set.
3. Build command if needed.
4. Start command if needed.
5. Commands to run migrations.
6. URLs to test after deployment.
```

---

# Bug Fix Prompt Template

Use this whenever Codex breaks something.

```txt
The current implementation has this issue:

[PASTE ERROR MESSAGE OR DESCRIBE BUG]

Please debug and fix it.

Rules:
- Read AGENTS.md and relevant docs before changing code.
- Do not rewrite unrelated modules.
- Do not change architecture unless necessary.
- Explain the root cause.
- Apply the smallest safe fix.
- Add or update a test if this bug should be prevented.
- Tell me the exact command to verify the fix.
```

---

# Code Review Prompt Template

Use this after each major phase.

```txt
Review the implementation of the last completed phase.

Check specifically for:
- Violations of AGENTS.md
- Missing tenant isolation
- Missing RBAC checks
- Missing DTO validation
- Sensitive fields returned in API responses
- Hardcoded secrets
- Bloated controllers
- Business logic placed in controllers
- Prisma queries missing organizationId
- Missing tests for critical behavior
- Swagger decorators missing
- Railway deployment problems

Do not rewrite the code yet.

First give me a review report with:
1. Critical issues
2. Important improvements
3. Nice-to-have improvements
4. Files affected
5. Recommended fix order
```

---

# Refactor Prompt Template

Use this only after a code review.

```txt
Apply the fixes from the review report.

Rules:
- Fix critical issues first.
- Do not introduce unnecessary abstractions.
- Keep module boundaries clean.
- Preserve public API contracts unless the docs require a correction.
- Add tests for security or tenant isolation fixes.
- Run or explain the verification commands.
```

---

# Test Gap Prompt

Use this before deployment.

```txt
Review the current test coverage against docs/09-testing-strategy.md.

Find missing tests for:
- Authentication
- Refresh token rotation
- RBAC
- Tenant isolation
- Organization membership
- Invitations
- Projects
- Tasks
- Error response format

Do not write tests yet.

First give me a prioritized test gap report.
```

Then:

```txt
Implement the highest-priority missing tests from the test gap report.

Focus on:
1. Tenant isolation
2. RBAC
3. Refresh token rotation
4. Invitation acceptance
5. Task organization/project ownership

Keep tests maintainable and use helpers where appropriate.
```

---

# Final Portfolio Polish Prompt

Use this after deployment.

```txt
Polish the repository for portfolio presentation.

Requirements:
- Update README with deployed Railway API URL.
- Update README with Swagger URL.
- Add a "System Design Highlights" section.
- Add a "Security Highlights" section.
- Add a "Testing Highlights" section.
- Add a "Deployment" section.
- Add sample API flow:
  1. Register
  2. Login
  3. Create organization
  4. Invite member
  5. Create project
  6. Create task
  7. Assign task
- Do not change backend behavior.
- Only improve documentation and portfolio presentation.
```

---

# Recommended Git Branch Strategy

Use:

```txt
main
develop
feature/project-setup
feature/database-schema
feature/auth
feature/organizations-rbac
feature/invitations
feature/projects-tasks
feature/jobs
feature/deployment
```

Simpler option:

```txt
main
```

For vibe coding, the simpler option is fine if you commit after every stable phase.

---

# Recommended Commit Flow

After every successful phase:

```bash
npm run build
npm run test
git add .
git commit -m "<meaningful message>"
```

Do not continue to the next phase while build is broken.

---

# Recommended First Day Flow

Do only these first:

```txt
Phase 1
Phase 2
Phase 3
Phase 4
```

That gives you:

```txt
Base Nest.js app
Database schema
Common infrastructure
Authentication
```

Do not rush into projects/tasks before auth and tenant infrastructure are stable.

---

# Strong Warning

Do not let Codex do this:

```txt
"Build the whole project from all docs"
```

That is how you get:

```txt
broken code
missing guards
inconsistent DTOs
weak tests
bad architecture
tenant leaks
```

Use the phase prompts.
