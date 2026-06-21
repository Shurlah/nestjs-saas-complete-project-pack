# 09-testing-strategy.md

# Testing Strategy Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines the testing strategy for the API.

The goal is not to test everything blindly. The goal is to prove that the most important backend behaviors work correctly:

- Authentication
- Authorization
- Tenant isolation
- Database writes
- Critical business rules
- API contracts
- Background job production
- Error handling

---

## 2. Testing Tools

Use:

```txt
Jest
Supertest
Prisma
Test database
Mocked BullMQ queues where appropriate
```

Optional advanced tools:

```txt
Testcontainers
Docker Compose test services
```

For portfolio v1, a separate test PostgreSQL database is enough.

---

## 3. Test Types

Use three levels of tests:

```txt
Unit tests
Integration tests
E2E tests
```

---

## 4. Unit Tests

Unit tests test isolated services, guards, and utilities.

Examples:

```txt
AuthService password hashing
AuthService token generation
RolesGuard role checks
OrganizationMemberGuard membership logic
Slug generation utility
Pagination utility
```

Mock Prisma and queues where necessary.

---

## 5. Integration Tests

Integration tests verify modules with real database behavior.

Examples:

```txt
Create organization creates owner membership
Accept invitation creates membership
Create task validates project belongs to organization
Change role creates audit log
Soft delete excludes deleted records
```

Use a test database.

---

## 6. E2E Tests

E2E tests verify real API behavior through HTTP using Supertest.

Examples:

```txt
POST /auth/register
POST /auth/login
POST /organizations
GET /organizations
POST /organizations/:organizationId/projects
POST /organizations/:organizationId/projects/:projectId/tasks
```

E2E tests should run against the Nest application instance.

---

## 7. Critical Test Areas

The most important tests are:

```txt
Authentication
Refresh token rotation
RBAC
Tenant isolation
Invitation acceptance
Task creation
Task assignment notification job
Error response shape
```

---

## 8. Authentication Tests

Required tests:

```txt
register creates user
register hashes password
register rejects duplicate email
login succeeds with valid credentials
login fails with invalid password
login fails with unknown email using generic error
refresh token returns new tokens
refresh token rotates stored hash
logout clears refresh token hash
protected route rejects missing token
protected route accepts valid token
```

---

## 9. RBAC Tests

Required tests:

```txt
owner can invite members
admin can invite members
member cannot invite members
guest cannot create project
project manager can create project
admin cannot remove owner
owner can remove admin
admin can remove member
```

---

## 10. Tenant Isolation Tests

These are mandatory.

Set up:

```txt
Organization A
Organization B
User A member of Organization A
User B member of Organization B
Project A belongs to Organization A
Project B belongs to Organization B
Task A belongs to Organization A
Task B belongs to Organization B
```

Tests:

```txt
User A cannot list Organization B projects
User A cannot get Project B
User A cannot update Project B
User A cannot delete Project B
User A cannot create task in Project B
User A cannot comment on Task B
Admin in Organization A has no admin permissions in Organization B
```

Expected results:

```txt
403 when user is not a member of organization
404 when resource does not belong to requested organization
```

---

## 11. Organization Tests

Required tests:

```txt
authenticated user can create organization
creating organization creates owner membership
organization slug must be unique
owner can update organization
admin can update organization
member cannot update organization
only owner can archive organization
```

---

## 12. Invitation Tests

Required tests:

```txt
owner can invite user
admin can invite user
member cannot invite user
invitation stores token hash
raw token is not stored
accept valid invitation creates membership
accept expired invitation fails
accept cancelled invitation fails
accept invitation twice fails
accept invitation creates audit log
```

---

## 13. Project Tests

Required tests:

```txt
owner can create project
admin can create project
project manager can create project
member cannot create project
project key must be unique within organization
same project key can exist in different organizations
project list returns only organization projects
archive project excludes it from normal list
```

---

## 14. Task Tests

Required tests:

```txt
member can create task if allowed
task must belong to organization
task project must belong to organization
assignee must belong to organization
task status can be changed
task status change creates activity log
task assignment queues notification job
deleted task is excluded from normal list
```

---

## 15. Comment Tests

Required tests:

```txt
member can comment on accessible task
comment author can update comment
another member cannot update comment unless admin/project manager
comment author can delete comment
deleted comment is excluded from normal list
comment creates activity log
```

---

## 16. Background Job Tests

Required tests:

```txt
invitation creation queues email job
forgot password queues email job
task assignment queues notification job
notification processor creates notification
audit job creates audit log
```

For most service tests, mock queues.

---

## 17. Error Handling Tests

Required tests:

```txt
validation errors follow standard shape
not found errors follow standard shape
forbidden errors follow standard shape
requestId appears in error response
duplicate email returns 409
duplicate organization slug returns 409
```

---

## 18. Test Database Strategy

Use a separate test database.

Example:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_saas_test
```

Before tests:

```bash
npx prisma migrate deploy
```

During tests:

```txt
Clean database between test suites.
Seed only what each test needs.
Avoid relying on global state.
```

---

## 19. Test Helpers

Create test helpers:

```txt
createTestUser()
loginTestUser()
createTestOrganization()
createTestMembership()
createTestProject()
createAuthHeader()
cleanDatabase()
```

Suggested folder:

```txt
test/
  helpers/
    auth.helper.ts
    database.helper.ts
    organization.helper.ts
```

---

## 20. Coverage Targets

Aim for:

```txt
Auth module: high coverage
RBAC guards: high coverage
Tenant isolation: high coverage
Core services: moderate to high coverage
Controllers: covered by e2e tests
```

Do not chase 100% coverage. Focus on critical risks.

---

## 21. CI Testing

GitHub Actions should run:

```bash
npm ci
npm run lint
npm run test
npm run test:e2e
npm run build
```

If e2e requires database services, CI should start PostgreSQL and Redis.

---

## 22. Codex Implementation Notes

When implementing tests:

- Add tests as modules are built.
- Do not leave testing until the end.
- Prioritize auth, RBAC, and tenant isolation first.
- Use factories/helpers to avoid repeated setup.
- Keep test names descriptive.
