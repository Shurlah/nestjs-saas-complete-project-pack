# 06-multi-tenancy-strategy.md

# Multi-Tenancy Strategy Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines the multi-tenancy strategy for the API.

The application is a SaaS backend where multiple organizations use the same API and database. Each organization is a tenant.

The most important security requirement is:

```txt
A user must never access data belonging to an organization they do not belong to.
```

---

## 2. Chosen Multi-Tenancy Model

The system uses:

```txt
Single database
Shared schema
Tenant-scoped rows
```

Each organization-owned entity includes:

```txt
organizationId
```

This is the recommended model for this portfolio project because it is realistic, easy to deploy on Railway, and not over-engineered.

---

## 3. Why This Model?

Advantages:

- Simple to implement.
- Easy to deploy.
- Works well with Prisma.
- Works well with PostgreSQL.
- Supports multiple organizations per user.
- Demonstrates real SaaS design.
- Easier than schema-per-tenant or database-per-tenant.
- Good enough for many early-stage SaaS systems.

Trade-offs:

- Requires disciplined tenant filtering.
- Bugs can cause cross-tenant data exposure.
- Strong automated tests are required.
- Some very large tenants may later need isolation.

---

## 4. Tenant Identity

The tenant is represented by:

```txt
Organization
```

Every organization has:

```txt
id
name
slug
ownerId
```

The primary tenant identifier is:

```txt
organizationId
```

---

## 5. User Membership

A user gains access to an organization through a membership.

Membership fields:

```txt
userId
organizationId
role
status
```

A user can belong to many organizations.

An organization can have many users.

---

## 6. Tenant-Scoped Entities

These entities must include `organizationId` directly:

```txt
Team
Project
Task
Comment
Invitation
Notification
ActivityLog
AuditLog
FileAttachment
TaskLabel
```

Some entities are globally scoped:

```txt
User
PasswordResetToken
EmailVerificationToken
```

Some entities are relationship-scoped:

```txt
Membership
TeamMember
ProjectMember
TaskLabelOnTask
```

---

## 7. URL Strategy

Tenant-scoped routes should include `organizationId`.

Examples:

```http
GET /api/v1/organizations/:organizationId/projects
POST /api/v1/organizations/:organizationId/projects
GET /api/v1/organizations/:organizationId/projects/:projectId/tasks
POST /api/v1/organizations/:organizationId/projects/:projectId/tasks
```

This makes tenant context explicit.

---

## 8. Tenant Resolution

Tenant context is resolved from route parameter:

```txt
organizationId
```

The system should not rely on request body `organizationId` for protected tenant-scoped actions.

Bad request body:

```json
{
  "organizationId": "org-id",
  "name": "Project"
}
```

Good route:

```http
POST /organizations/:organizationId/projects
```

---

## 9. Tenant Access Flow

Every tenant-scoped request must follow:

```txt
1. Authenticate user.
2. Read organizationId from route.
3. Check user has ACTIVE membership in organization.
4. Check user's role permits the action.
5. Check requested resource belongs to organization.
6. Execute business operation.
```

---

## 10. Organization Member Guard

The guard must:

```txt
Read organizationId from params.
Read userId from authenticated request.
Find active membership by userId and organizationId.
Reject request if membership does not exist.
Attach membership to request for later guards/services.
```

Pseudo-code:

```ts
const membership = await prisma.membership.findFirst({
  where: {
    userId,
    organizationId,
    status: 'ACTIVE',
  },
});

if (!membership) {
  throw new ForbiddenException('You do not belong to this organization');
}

request.membership = membership;
```

---

## 11. Service-Level Tenant Filtering

Every service method for tenant data must require `organizationId`.

Bad:

```ts
async findProject(projectId: string) {}
```

Good:

```ts
async findProject(organizationId: string, projectId: string) {}
```

Bad query:

```ts
await prisma.project.findUnique({
  where: { id: projectId },
});
```

Good query:

```ts
await prisma.project.findFirst({
  where: {
    id: projectId,
    organizationId,
    deletedAt: null,
  },
});
```

---

## 12. Create Resource Rules

When creating tenant-owned resources:

- `organizationId` must come from route.
- Do not trust `organizationId` from request body.
- Validate parent resources belong to the same organization.

Example task creation:

```txt
1. Read organizationId from route.
2. Read projectId from route.
3. Confirm project belongs to organization.
4. Confirm assignee belongs to organization if assigneeId exists.
5. Create task with organizationId and projectId.
```

---

## 13. Parent-Child Resource Checks

Nested resources must belong to the same tenant.

Examples:

- Project must belong to organization.
- Task must belong to project and organization.
- Comment must belong to task and organization.
- File attachment must belong to organization and target entity.

Do not trust only nested IDs.

---

## 14. Cross-Tenant Attack Example

Malicious request:

```http
PATCH /api/v1/organizations/org-A/projects/project-from-org-B
```

The API must reject it because the project does not belong to `org-A`.

Correct query:

```ts
await prisma.project.findFirst({
  where: {
    id: projectId,
    organizationId: organizationIdFromRoute,
  },
});
```

If no project is found, return:

```txt
404 Not Found
```

Do not reveal that the project exists in another organization.

---

## 15. Error Strategy

When a tenant-scoped resource is not found under the requested organization, return:

```txt
404 Not Found
```

Do not return:

```txt
403 Forbidden because this resource belongs to another organization
```

That leaks information.

For membership failure, return:

```txt
403 Forbidden
```

---

## 16. Membership Status

Only active memberships can access organization data.

Valid statuses:

```txt
ACTIVE
INVITED
SUSPENDED
REMOVED
```

Access allowed only for:

```txt
ACTIVE
```

---

## 17. Guest Access

Guests are organization members with limited access.

For v1:

- Guest can view explicitly shared resources only.
- If project-level sharing is not implemented yet, guest access may be limited to organization summary or disabled for project/task routes.
- Document guest limitations clearly.

---

## 18. Admin and Owner Rules

Owner rules:

- Owner has full control.
- Owner cannot be removed by admin.
- Owner role cannot be changed by admin.
- Organization archive requires owner role.

Admin rules:

- Admin can invite members.
- Admin can remove non-owner members.
- Admin can manage teams and projects.
- Admin can view audit logs.
- Admin cannot remove or demote owner.

---

## 19. Data Modeling Rule

Every tenant-scoped table should have an index on:

```txt
organizationId
```

Common compound indexes:

```txt
organizationId + status
organizationId + createdAt
organizationId + projectId
organizationId + assigneeId
```

---

## 20. Tests Required

Tenant isolation tests must prove:

```txt
User from org A cannot list org B projects.
User from org A cannot access org B task by ID.
User from org A cannot update org B project.
User from org A cannot comment on org B task.
Admin in org A has no admin power in org B.
Project ID from another org returns 404.
Membership failure returns 403.
```

---

## 21. Codex Implementation Notes

When generating code:

- Route params should carry tenant context.
- DTOs should not include organizationId unless strictly needed.
- Guards should run before controllers.
- Services should always accept organizationId for tenant-scoped methods.
- Prisma queries must include organizationId.
- Tests must include at least two organizations to catch isolation bugs.
