# AGENTS.md

# Codex Instructions for Enterprise Multi-Tenant Project Management API

## 1. Project Identity

You are working on a production-grade Nest.js backend API for a multi-tenant SaaS project management platform.

This is not a tutorial application. Treat it like a real backend system that must be maintainable, secure, testable, and deployable.

The application will be deployed on Railway.

---

## 2. Core Stack

Use the following stack:

```txt
Nest.js
TypeScript
PostgreSQL
Prisma
Redis
BullMQ
JWT Authentication
RBAC Authorization
Docker
Railway
Jest
Swagger/OpenAPI
```

---

## 3. Main Product Goal

Build a backend API that allows multiple organizations to manage:

```txt
users
organizations
memberships
teams
projects
tasks
comments
invitations
notifications
activity logs
audit logs
```

Every organization’s data must be isolated from other organizations.

---

## 4. Development Rules

Follow these rules strictly:

1. Use clean Nest.js module boundaries.
2. Do not put all logic in controllers.
3. Controllers should handle HTTP concerns only.
4. Business logic belongs in services.
5. Database access should go through Prisma.
6. Use DTOs for all request payloads.
7. Use class-validator decorators for validation.
8. Use guards for authentication and authorization.
9. Use custom decorators where appropriate.
10. Use interceptors and filters for cross-cutting concerns.
11. Use consistent error responses.
12. Use environment variables for secrets.
13. Never hardcode credentials.
14. Add tests for critical business logic.
15. Keep files small and focused.
16. Prefer explicit code over clever code.
17. Use TypeScript types carefully.
18. Do not introduce libraries unless necessary.
19. Update documentation when behavior changes.
20. Ensure the project can run locally and on Railway.

---

## 5. Architecture Style

Use a modular monolith architecture.

Recommended structure:

```txt
src/
  app.module.ts
  main.ts

  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    types/
    utils/

  config/
    app.config.ts
    database.config.ts
    redis.config.ts
    jwt.config.ts
    validation.ts

  database/
    prisma.service.ts
    prisma.module.ts

  modules/
    auth/
    users/
    organizations/
    memberships/
    teams/
    projects/
    tasks/
    comments/
    files/
    invitations/
    notifications/
    activity-logs/
    audit-logs/
    health/

  jobs/
    queues/
    processors/

  docs/
```

---

## 6. Module Pattern

Each module should follow this pattern where applicable:

```txt
module-name/
  dto/
  entities/
  guards/
  types/
  module-name.controller.ts
  module-name.service.ts
  module-name.module.ts
  module-name.repository.ts
```

Do not create unnecessary abstractions, but keep the project organized enough to demonstrate senior-level structure.

---

## 7. Authentication Requirements

Implement:

```txt
register
login
logout
refresh token
email verification placeholder
forgot password
reset password
get current user
```

Use:

```txt
bcrypt or argon2 for password hashing
JWT access tokens
refresh token rotation
hashed refresh tokens in database
```

Do not store refresh tokens in plaintext.

---

## 8. Authorization Requirements

Implement RBAC using:

```txt
roles
guards
decorators
membership checks
tenant checks
```

Required roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
GUEST
```

Authorization must check both:

```txt
Who is the user?
Which organization are they accessing?
What role do they have in that organization?
```

---

## 9. Multi-Tenancy Rules

Every tenant-scoped entity must include `organizationId`.

Never query tenant-owned resources without filtering by `organizationId`.

Bad:

```ts
findUnique({ where: { id } })
```

Good:

```ts
findFirst({
  where: {
    id,
    organizationId,
  },
})
```

Tenant isolation is mandatory.

---

## 10. Database Rules

Use Prisma migrations.

Use PostgreSQL.

Use UUIDs for primary keys.

Use soft deletes for important business entities.

Use timestamps:

```txt
createdAt
updatedAt
deletedAt
```

Use indexes on:

```txt
organizationId
userId
projectId
taskId
email
status
createdAt
```

---

## 11. API Rules

Use RESTful routes.

Use `/api/v1` prefix.

Use Swagger decorators.

Use consistent response shapes.

Use pagination for list endpoints.

Use proper HTTP status codes.

---

## 12. Error Handling

Create a global exception filter.

Error responses should include:

```txt
statusCode
message
error
timestamp
path
requestId
```

Do not leak internal stack traces in production.

---

## 13. Logging

Add structured request logging.

Log important security events:

```txt
login
logout
password reset
role change
member removed
invitation accepted
organization archived
```

---

## 14. Background Jobs

Use BullMQ with Redis.

Initial queues:

```txt
emailQueue
notificationQueue
auditQueue
```

Jobs should be used for:

```txt
invitation emails
notification delivery
audit/event processing
```

---

## 15. Testing Requirements

Add tests for:

```txt
auth service
organization service
membership permissions
task service
tenant isolation
RBAC guards
```

Use:

```txt
Jest
Supertest
```

Critical behavior must have tests.

---

## 16. Railway Deployment Requirements

The app must be deployable to Railway.

Support:

```txt
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
PORT
NODE_ENV
```

Railway will provide PostgreSQL and Redis variables from its managed services.

The app must listen on `process.env.PORT`.

---

## 17. Docker Requirements

Create a production-ready Dockerfile.

The Dockerfile should:

```txt
install dependencies
generate Prisma client
build the Nest.js app
run migrations safely where appropriate
start the production server
```

---

## 18. Commands

Expected local commands:

```bash
npm install
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

---

## 19. Documentation Requirements

Keep the following updated:

```txt
README.md
docs/00-project-overview.md
docs/01-product-requirements-document.md
docs/02-architecture-document.md
docs/03-database-design.md
docs/04-api-specification.md
docs/10-deployment-railway.md
```

---

## 20. Implementation Approach

Build in this order:

1. Project setup
2. Config validation
3. Prisma setup
4. Auth module
5. Users module
6. Organizations module
7. Memberships module
8. RBAC and tenant guards
9. Teams module
10. Projects module
11. Tasks module
12. Comments module
13. Invitations module
14. Notifications queue
15. Audit logs
16. Swagger documentation
17. Tests
18. Dockerfile
19. Railway deployment

Do not skip authentication, authorization, tenant isolation, or tests.
