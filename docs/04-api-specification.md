# 04-api-specification.md

# API Specification

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines the REST API contract for the Enterprise Multi-Tenant Project Management API.

The API must be implemented using Nest.js controllers, DTOs, validation pipes, guards, and Swagger decorators.

Base path:

```txt
/api/v1
```

---

## 2. API Standards

### 2.1 Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

### 2.2 Content Type

```http
Content-Type: application/json
```

### 2.3 Success Response Shape

Single resource:

```json
{
  "success": true,
  "message": "Resource created successfully",
  "data": {}
}
```

List resource:

```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2.4 Error Response Shape

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

---

## 3. Common Query Parameters

List endpoints should support these where applicable:

```txt
page
limit
search
sortBy
sortOrder
status
priority
assigneeId
projectId
teamId
```

Default pagination:

```txt
page = 1
limit = 20
```

Maximum limit:

```txt
100
```

---

# 4. Health API

## 4.1 Health Check

```http
GET /health
```

Response:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-06-21T00:00:00.000Z"
  }
}
```

---

# 5. Auth API

## 5.1 Register

```http
POST /auth/register
```

Request:

```json
{
  "email": "manny@example.com",
  "firstName": "Manny",
  "lastName": "Imion",
  "password": "Password@123"
}
```

Validation:

```txt
email: required, valid email
firstName: required, string, min 2
lastName: required, string, min 2
password: required, strong password
```

Response:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "manny@example.com",
      "firstName": "Manny",
      "lastName": "Imion",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt"
    }
  }
}
```

---

## 5.2 Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "manny@example.com",
  "password": "Password@123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "manny@example.com",
      "firstName": "Manny",
      "lastName": "Imion"
    },
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt"
    }
  }
}
```

---

## 5.3 Refresh Token

```http
POST /auth/refresh
```

Request:

```json
{
  "refreshToken": "jwt"
}
```

Response:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

---

## 5.4 Logout

```http
POST /auth/logout
```

Auth required.

Response:

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

## 5.5 Forgot Password

```http
POST /auth/forgot-password
```

Request:

```json
{
  "email": "manny@example.com"
}
```

Response:

```json
{
  "success": true,
  "message": "If the email exists, password reset instructions will be sent",
  "data": null
}
```

Security rule:

Do not reveal whether the email exists.

---

## 5.6 Reset Password

```http
POST /auth/reset-password
```

Request:

```json
{
  "token": "raw-reset-token",
  "newPassword": "NewPassword@123"
}
```

Response:

```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

---

## 5.7 Verify Email

```http
POST /auth/verify-email
```

Request:

```json
{
  "token": "raw-verification-token"
}
```

Response:

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

---

# 6. Users API

## 6.1 Get Current User

```http
GET /users/me
```

Auth required.

Response:

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "manny@example.com",
    "firstName": "Manny",
    "lastName": "Imion",
    "isEmailVerified": true,
    "createdAt": "2026-06-21T00:00:00.000Z"
  }
}
```

---

## 6.2 Update Current User

```http
PATCH /users/me
```

Auth required.

Request:

```json
{
  "firstName": "Manny",
  "lastName": "Imion"
}
```

Response:

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "manny@example.com",
    "firstName": "Manny",
    "lastName": "Imion"
  }
}
```

---

## 6.3 Change Password

```http
PATCH /users/me/password
```

Auth required.

Request:

```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@123"
}
```

Response:

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

---

# 7. Organizations API

## 7.1 Create Organization

```http
POST /organizations
```

Auth required.

Request:

```json
{
  "name": "Tracklio Technologies",
  "slug": "tracklio"
}
```

Response:

```json
{
  "success": true,
  "message": "Organization created successfully",
  "data": {
    "id": "uuid",
    "name": "Tracklio Technologies",
    "slug": "tracklio",
    "ownerId": "uuid"
  }
}
```

Side effects:

```txt
Create OWNER membership for current user.
Create audit log.
Create activity log.
```

---

## 7.2 List My Organizations

```http
GET /organizations
```

Auth required.

Response:

```json
{
  "success": true,
  "message": "Organizations retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Tracklio Technologies",
      "slug": "tracklio",
      "role": "OWNER"
    }
  ]
}
```

---

## 7.3 Get Organization

```http
GET /organizations/:organizationId
```

Auth required.

Tenant membership required.

---

## 7.4 Update Organization

```http
PATCH /organizations/:organizationId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Request:

```json
{
  "name": "Tracklio Labs"
}
```

---

## 7.5 Archive Organization

```http
DELETE /organizations/:organizationId
```

Auth required.

Allowed roles:

```txt
OWNER
```

Soft delete only.

---

# 8. Memberships API

## 8.1 List Organization Members

```http
GET /organizations/:organizationId/members
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
```

---

## 8.2 Change Member Role

```http
PATCH /organizations/:organizationId/members/:memberId/role
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Request:

```json
{
  "role": "PROJECT_MANAGER"
}
```

Rules:

- Admin cannot change owner role.
- Admin cannot promote another user to owner.
- Owner can transfer ownership only if explicitly implemented.
- Guest cannot manage roles.

---

## 8.3 Remove Member

```http
DELETE /organizations/:organizationId/members/:memberId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Rules:

- Owner cannot be removed by admin.
- A user may leave an organization if not owner.
- Removing a member should not delete historical audit/activity logs.

---

# 9. Invitations API

## 9.1 Create Invitation

```http
POST /organizations/:organizationId/invitations
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Request:

```json
{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

Response:

```json
{
  "success": true,
  "message": "Invitation created successfully",
  "data": {
    "id": "uuid",
    "email": "member@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-06-28T00:00:00.000Z"
  }
}
```

Side effects:

```txt
Queue invitation email job.
Create audit log.
```

---

## 9.2 List Invitations

```http
GET /organizations/:organizationId/invitations
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

---

## 9.3 Accept Invitation

```http
POST /invitations/accept
```

Auth required.

Request:

```json
{
  "token": "raw-invitation-token"
}
```

Response:

```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "organizationId": "uuid",
    "role": "MEMBER"
  }
}
```

---

## 9.4 Cancel Invitation

```http
DELETE /organizations/:organizationId/invitations/:invitationId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

---

# 10. Teams API

## 10.1 Create Team

```http
POST /organizations/:organizationId/teams
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Request:

```json
{
  "name": "Backend Team",
  "description": "Backend API engineering team"
}
```

---

## 10.2 List Teams

```http
GET /organizations/:organizationId/teams
```

Auth required.

---

## 10.3 Get Team

```http
GET /organizations/:organizationId/teams/:teamId
```

Auth required.

---

## 10.4 Update Team

```http
PATCH /organizations/:organizationId/teams/:teamId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

---

## 10.5 Delete Team

```http
DELETE /organizations/:organizationId/teams/:teamId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Soft delete.

---

## 10.6 Add Team Member

```http
POST /organizations/:organizationId/teams/:teamId/members
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Request:

```json
{
  "userId": "uuid"
}
```

---

## 10.7 Remove Team Member

```http
DELETE /organizations/:organizationId/teams/:teamId/members/:userId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

---

# 11. Projects API

## 11.1 Create Project

```http
POST /organizations/:organizationId/projects
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
```

Request:

```json
{
  "name": "SaaS Backend API",
  "key": "SBA",
  "description": "Project management backend API",
  "teamId": "uuid",
  "startDate": "2026-06-21T00:00:00.000Z",
  "dueDate": "2026-08-21T00:00:00.000Z"
}
```

---

## 11.2 List Projects

```http
GET /organizations/:organizationId/projects
```

Auth required.

Query:

```txt
page
limit
search
status
teamId
```

---

## 11.3 Get Project

```http
GET /organizations/:organizationId/projects/:projectId
```

Auth required.

---

## 11.4 Update Project

```http
PATCH /organizations/:organizationId/projects/:projectId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
```

---

## 11.5 Archive Project

```http
DELETE /organizations/:organizationId/projects/:projectId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
```

Soft delete or status set to ARCHIVED.

---

## 11.6 Add Project Member

```http
POST /organizations/:organizationId/projects/:projectId/members
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
```

Request:

```json
{
  "userId": "uuid"
}
```

---

## 11.7 Remove Project Member

```http
DELETE /organizations/:organizationId/projects/:projectId/members/:userId
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
```

---

# 12. Tasks API

## 12.1 Create Task

```http
POST /organizations/:organizationId/projects/:projectId/tasks
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
```

Request:

```json
{
  "title": "Implement authentication module",
  "description": "Build register, login, logout and refresh token flow",
  "priority": "HIGH",
  "assigneeId": "uuid",
  "dueDate": "2026-06-30T00:00:00.000Z"
}
```

Side effects:

```txt
Create activity log.
Create notification for assignee.
Queue notification job.
```

---

## 12.2 List Project Tasks

```http
GET /organizations/:organizationId/projects/:projectId/tasks
```

Auth required.

Query:

```txt
page
limit
search
status
priority
assigneeId
sortBy
sortOrder
```

---

## 12.3 Get Task

```http
GET /organizations/:organizationId/projects/:projectId/tasks/:taskId
```

Auth required.

---

## 12.4 Update Task

```http
PATCH /organizations/:organizationId/projects/:projectId/tasks/:taskId
```

Auth required.

Request:

```json
{
  "title": "Implement secure authentication module",
  "description": "Updated description",
  "priority": "URGENT",
  "assigneeId": "uuid",
  "dueDate": "2026-07-01T00:00:00.000Z"
}
```

---

## 12.5 Change Task Status

```http
PATCH /organizations/:organizationId/projects/:projectId/tasks/:taskId/status
```

Auth required.

Request:

```json
{
  "status": "IN_PROGRESS"
}
```

Side effects:

```txt
Create activity log.
Create notification if needed.
```

---

## 12.6 Delete Task

```http
DELETE /organizations/:organizationId/projects/:projectId/tasks/:taskId
```

Auth required.

Soft delete.

---

## 12.7 List My Assigned Tasks

```http
GET /tasks/assigned-to-me
```

Auth required.

Query:

```txt
page
limit
status
priority
organizationId
```

---

# 13. Comments API

## 13.1 Add Comment

```http
POST /organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
```

Auth required.

Request:

```json
{
  "body": "This task is ready for review."
}
```

Side effects:

```txt
Create activity log.
Create mention notifications if mentions are supported.
```

---

## 13.2 List Task Comments

```http
GET /organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
```

Auth required.

---

## 13.3 Update Comment

```http
PATCH /organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId
```

Auth required.

Rule:

```txt
Only comment author, OWNER, ADMIN, or PROJECT_MANAGER can edit.
```

---

## 13.4 Delete Comment

```http
DELETE /organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId
```

Auth required.

Rule:

```txt
Only comment author, OWNER, ADMIN, or PROJECT_MANAGER can delete.
```

Soft delete.

---

# 14. Notifications API

## 14.1 List My Notifications

```http
GET /notifications
```

Auth required.

Query:

```txt
page
limit
read
organizationId
```

---

## 14.2 Mark Notification As Read

```http
PATCH /notifications/:notificationId/read
```

Auth required.

---

## 14.3 Mark All Notifications As Read

```http
PATCH /notifications/read-all
```

Auth required.

Optional request:

```json
{
  "organizationId": "uuid"
}
```

---

# 15. Activity Logs API

## 15.1 List Organization Activity Logs

```http
GET /organizations/:organizationId/activity-logs
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
```

Query:

```txt
page
limit
entityType
entityId
actorId
```

---

# 16. Audit Logs API

## 16.1 List Organization Audit Logs

```http
GET /organizations/:organizationId/audit-logs
```

Auth required.

Allowed roles:

```txt
OWNER
ADMIN
```

Query:

```txt
page
limit
action
actorId
entityType
entityId
```

---

# 17. Authorization Matrix

| Resource | OWNER | ADMIN | PROJECT_MANAGER | MEMBER | GUEST |
|---|---:|---:|---:|---:|---:|
| Create organization | Yes | Yes | Yes | Yes | Yes |
| Update organization | Yes | Yes | No | No | No |
| Archive organization | Yes | No | No | No | No |
| Invite members | Yes | Yes | No | No | No |
| Change member roles | Yes | Yes* | No | No | No |
| Remove members | Yes | Yes* | No | No | No |
| Create team | Yes | Yes | No | No | No |
| Create project | Yes | Yes | Yes | No | No |
| Update project | Yes | Yes | Yes | No | No |
| Archive project | Yes | Yes | Yes | No | No |
| Create task | Yes | Yes | Yes | Yes | No |
| Update task | Yes | Yes | Yes | Assigned/Created only | No |
| Comment on task | Yes | Yes | Yes | Yes | Limited |
| View audit logs | Yes | Yes | No | No | No |

`*` Admin cannot modify or remove the owner.

---

# 18. Swagger Requirements

Every controller must include Swagger decorators:

```txt
@ApiTags
@ApiOperation
@ApiResponse
@ApiBearerAuth
@ApiParam
@ApiQuery
@ApiBody
```

Swagger should be available at:

```txt
/api/docs
```

---

# 19. Version 1 Implementation Priority

Implement endpoints in this order:

```txt
1. Health
2. Auth
3. Users
4. Organizations
5. Memberships
6. Invitations
7. Teams
8. Projects
9. Tasks
10. Comments
11. Notifications
12. Activity logs
13. Audit logs
```

---

# 20. Codex Instruction

When implementing this API:

- Create DTOs before controllers.
- Add validation decorators to all DTOs.
- Add Swagger decorators to all endpoints.
- Use guards on protected routes.
- Always check organization membership.
- Always filter tenant-owned resources by `organizationId`.
- Use service methods for business logic.
- Use Prisma transactions for multi-step writes.
- Add tests for critical flows.
