# Enterprise Multi-Tenant Project Management API Development Plan

## Summary

Build the documented portfolio-grade NestJS modular monolith from an empty, documentation-only repository. Deliver the core API, strong tenant isolation, RBAC, multi-device refresh sessions, reliable background processing, automated tests, Docker support, and Railway deployment.

Deferred from core V1: file endpoints, task labels, subtasks, comment mentions, due-date reminders, billing, ownership transfer, OAuth, WebSockets, and frontend work.

## Key Architecture and Contract Decisions

- Use Node 22, NestJS, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, Argon2, Swagger, Jest, Supertest, Testcontainers, Docker, and Railway.
- Keep `/api/v1` as the API prefix, `/api/docs` for Swagger, page-based pagination with a maximum limit of 100, and the documented success/error envelopes.
- Use shared-schema multi-tenancy. Every tenant service method accepts `organizationId`; every tenant query filters by it and excludes soft-deleted records.
- Return `403` for inactive or nonexistent organization membership and tenant-scoped `404` when a supplied resource belongs elsewhere.
- Replace `User.refreshTokenHash` with a `RefreshSession` model supporting concurrent devices, token families, atomic rotation, logout, expiry, and reuse-triggered family revocation.
- Add an `OutboxEvent` model. Business changes and events are committed in one transaction; an idempotent relay publishes events to BullMQ.
- Send queued emails through an SMTP adapter: Mailpit locally and environment-configured SMTP in production.
- Token defaults: access 15 minutes, refresh 7 days, password reset 1 hour, email verification 24 hours, invitation 7 days.
- Apply production migrations through Railway's pre-deploy command, not application startup.

## Authorization Rules

- `OWNER` and `ADMIN` can access all projects in their organization.
- `PROJECT_MANAGER`, `MEMBER`, and `GUEST` require direct `ProjectMember` access or membership in the project's assigned team.
- A project manager who creates a project becomes a project member automatically.
- Project managers may assign only teams they belong to; owners and admins may assign any tenant team.
- `MEMBER` may create tasks in accessible projects and update tasks they created or are assigned.
- `GUEST` may read accessible projects and tasks and create, edit, or delete their own comments.
- `OWNER`, `ADMIN`, and `PROJECT_MANAGER` may moderate tasks and comments only where their project access permits it.
- Admins cannot remove, demote, or replace the owner. Ownership transfer is deferred.
- Invitation acceptance requires authentication and a normalized account email matching the invitation.

## Implementation Phases

### 1. Foundation and Documentation Reconciliation

- Update the design documents to record the selected scope, access model, refresh sessions, outbox, Mailpit, Testcontainers, and migration strategy.
- Scaffold NestJS, strict TypeScript, configuration validation, Helmet, CORS, throttling, Swagger, health endpoint, structured logging, request IDs, response interceptor, and global exception handling.
- Add Docker Compose services for PostgreSQL, Redis, and Mailpit.

### 2. Persistence and Shared Infrastructure

- Implement the documented Prisma models, indexes, enums, soft deletes, and constraints.
- Add `RefreshSession` and `OutboxEvent`; remove the single refresh-token hash from `User`.
- Add Prisma lifecycle handling, transactional helpers, pagination DTOs, allowlisted sorting, request context types, decorators, and guards.
- Create the initial migration and deterministic development seed.

### 3. Authentication and Users

- Implement registration, login, refresh rotation, per-session and global logout, email verification, forgot/reset password, current profile, profile update, and password change.
- Normalize emails, invalidate older reset and verification tokens when replacements are issued, redact secrets, and record security audit events.
- Queue email through outbox events and SMTP workers.

Status: authentication and user APIs, session rotation/reuse detection, audit persistence, and email outbox event production are implemented. The outbox relay and SMTP worker remain in Phase 6 with the other background processors.

### 4. Tenant Root and Authorization

- Implement organizations, memberships, invitations, owner membership creation, role changes, removals, and archival.
- Implement JWT, active-membership, roles, and project-access guards.
- Protect owner invariants and make multi-step operations transactional.

Status: organization, membership, and invitation APIs are implemented with active-membership and role guards, project-access guard infrastructure, owner protections, transactional audit/activity writes, encrypted invitation outbox payloads, and cross-tenant authorization tests. Explicit ownership transfer remains intentionally unsupported.

### 5. Project-Management Modules

- Implement teams and team membership.
- Implement projects and explicit or team-derived project access.
- Implement tasks, assignment, status changes, filtering, search, soft deletion, and assigned-to-me listing.
- Implement comments with author and moderator rules.
- Validate every parent, assignee, team member, and project member against the same organization.

### 6. Notifications and Logs

- Implement user-owned notification listing and read operations.
- Implement tenant-scoped activity and audit log endpoints with role restrictions.
- Add the outbox relay, BullMQ queues, idempotent processors, retry and backoff behavior, and dead-job retention.
- Write critical security audit records transactionally; use queued delivery for email and notification processing.

### 7. API and Test Hardening

- Complete Swagger metadata, bearer authentication, DTO schemas, query documentation, example responses, and error cases.
- Run unit tests with mocked dependencies and integration/E2E tests using disposable Testcontainers PostgreSQL and Redis instances.
- Add CI for install, Prisma validation and generation, lint, unit tests, E2E tests, and build.

### 8. Deployment and Portfolio Release

- Add a multi-stage production Dockerfile, `.env.example`, Railway configuration, pre-deploy migrations, health checks, and stdout JSON logging.
- Verify production startup, PostgreSQL, Redis, SMTP configuration, Swagger, migrations, and graceful shutdown.
- Replace the placeholder README and case study with verified commands, architecture, security decisions, test highlights, and deployment links.

## Public API and Schema Changes

- Implement the core endpoints documented for health, auth, users, organizations, memberships, invitations, teams, projects, tasks, comments, notifications, activity logs, and audit logs.
- Add session-aware logout support while retaining `POST /auth/logout`; optionally accept a flag for revoking all sessions.
- Add `RefreshSession` and `OutboxEvent` Prisma models.
- Add SMTP variables and optional test-container configuration to validated environment settings.
- Standardize all errors with `statusCode`, `message`, `error`, `timestamp`, `path`, and `requestId`.
- Use `ARCHIVED` status for project archival; use `deletedAt` for destructive soft-delete operations.

## Test and Acceptance Plan

- Prove registration hashing, generic login failures, session rotation, concurrent sessions, reuse detection, logout, reset invalidation, and secret redaction.
- Prove owner, admin, project-manager, member, and guest permissions, owner protection, explicit project access, and comment ownership.
- Use two organizations in isolation tests covering lists, direct reads, updates, deletes, nested IDs, assignments, comments, and role leakage.
- Verify organization creation, invitation acceptance, task creation, and role changes are atomic.
- Verify outbox persistence, relay retries, idempotent processors, email enqueueing, notification creation, and audit handling.
- Verify validation, Prisma error mapping, pagination limits, soft-delete filtering, response envelopes, request IDs, and Swagger availability.
- Release only when lint, unit tests, E2E tests, build, migrations, Docker startup, `/api/v1/health`, and `/api/docs` all pass.

## Assumptions

- Core V1 is an API-only portfolio release.
- Mailpit is the local transport; production SMTP provider selection and credentials remain deployment configuration.
- PostgreSQL remains the source of truth; Redis is used for queues and throttling, not tenant authorization.
- No repository code currently exists, so development starts with project scaffolding and an initial migration.
