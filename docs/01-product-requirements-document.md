# 01-product-requirements-document.md

# Product Requirements Document

## Product Name

Enterprise Multi-Tenant Project Management API

---

## 1. Objective

The objective of this product is to provide a secure backend API that allows multiple organizations to manage projects, teams, tasks, comments, files, invitations, notifications, roles, and activity history.

The product is designed as a SaaS backend where each organization’s data is logically isolated from other organizations.

---

## 2. Target Users

### 2.1 Organization Owner

The organization owner is the user who creates an organization. This user has full control over the organization, members, billing, teams, projects, and permissions.

### 2.2 Organization Admin

The organization admin manages organization members, teams, projects, and settings.

### 2.3 Project Manager

The project manager manages projects, tasks, assignments, comments, and project workflows.

### 2.4 Team Member

The team member works on assigned tasks, creates comments, updates task status, and receives notifications.

### 2.5 Guest Member

The guest member has limited access to selected projects or tasks.

---

## 3. Product Scope

### 3.1 In Scope

The system must include:

* User authentication
* Organization management
* Organization invitations
* Membership management
* Team management
* Project management
* Task management
* Comments
* File attachment metadata
* Notifications
* Audit logs
* Activity logs
* Role-based authorization
* Multi-tenancy
* Background jobs
* API documentation
* Testing
* Railway deployment

### 3.2 Out of Scope for Version 1

The following features are not required in the first version:

* Frontend application
* Real-time WebSocket collaboration
* Real payment integration
* Native mobile application
* Advanced analytics dashboard
* AI task generation
* Calendar integration
* External OAuth login

These may be added in later versions.

---

## 4. Functional Requirements

## 4.1 Authentication

The system must allow users to:

* Register
* Login
* Logout
* Refresh access tokens
* Verify email
* Request password reset
* Reset password
* View their own profile
* Update their profile
* Change password

Authentication must use:

```txt
JWT access tokens
Refresh tokens
Password hashing
Token expiration
Refresh token rotation
```

---

## 4.2 Organizations

The system must allow users to:

* Create an organization
* View organizations they belong to
* View organization details
* Update organization details
* Archive an organization
* View organization members
* Invite users to an organization
* Remove members from an organization
* Change member roles

Each organization must have:

```txt
id
name
slug
ownerId
createdAt
updatedAt
deletedAt
```

---

## 4.3 Memberships

A user can belong to multiple organizations.

Each membership must include:

```txt
userId
organizationId
role
status
joinedAt
```

Valid organization roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
GUEST
```

---

## 4.4 Teams

The system must allow organization admins and owners to:

* Create teams
* Update teams
* Delete teams
* Add members to teams
* Remove members from teams
* View team members
* View team projects

Each team belongs to one organization.

---

## 4.5 Projects

The system must allow authorized users to:

* Create projects
* View projects
* Update projects
* Archive projects
* Assign projects to teams
* Add project members
* Remove project members

Each project belongs to one organization.

Project statuses:

```txt
PLANNING
ACTIVE
ON_HOLD
COMPLETED
ARCHIVED
```

---

## 4.6 Tasks

The system must allow authorized users to:

* Create tasks
* Update tasks
* Delete tasks
* Assign tasks
* Change task status
* Change task priority
* Add due dates
* Add labels
* View tasks by project
* View tasks assigned to a user
* Filter and search tasks

Task statuses:

```txt
TODO
IN_PROGRESS
IN_REVIEW
BLOCKED
DONE
CANCELLED
```

Task priorities:

```txt
LOW
MEDIUM
HIGH
URGENT
```

---

## 4.7 Comments

The system must allow users to:

* Add comments to tasks
* Edit their own comments
* Delete their own comments
* Mention users
* View comment history

---

## 4.8 File Attachments

The first version should store file metadata only.

File metadata includes:

```txt
id
organizationId
uploadedById
entityType
entityId
fileName
fileUrl
mimeType
size
createdAt
```

Actual file storage can later be integrated with S3, Cloudinary, or UploadThing.

---

## 4.9 Invitations

The system must allow organization owners and admins to:

* Invite users by email
* Assign a role during invitation
* Resend invitations
* Cancel pending invitations
* Accept invitations
* Expire old invitations

Invitation statuses:

```txt
PENDING
ACCEPTED
CANCELLED
EXPIRED
```

Invitation emails should be handled through background jobs.

---

## 4.10 Notifications

The system must create notifications when:

* A user is invited to an organization
* A task is assigned
* A user is mentioned in a comment
* A task status changes
* A project is archived
* A due date is near

Notifications should be processed asynchronously using BullMQ.

---

## 4.11 Activity Logs

The system must record user-facing activity events such as:

* Task created
* Task updated
* Comment added
* Project created
* Member added
* Member removed

Activity logs are visible inside the organization.

---

## 4.12 Audit Logs

The system must record security and administrative actions such as:

* Login
* Logout
* Password reset requested
* Password changed
* Role changed
* Member removed
* Organization archived
* Invitation created
* Invitation accepted

Audit logs are mainly for administrators.

---

## 5. Authorization Rules

The system must enforce role-based access control.

### OWNER

Can perform all organization actions.

### ADMIN

Can manage members, teams, projects, and tasks but cannot remove the owner.

### PROJECT_MANAGER

Can manage assigned projects and tasks.

### MEMBER

Can work on assigned tasks and comment on accessible projects.

### GUEST

Can only view or comment on explicitly shared projects/tasks.

---

## 6. Multi-Tenancy Rules

Every organization-owned resource must include an `organizationId`.

The application must never allow users to access data from an organization they do not belong to.

Tenant checks must happen at the service or guard level.

The following entities must be tenant-scoped:

```txt
teams
projects
tasks
comments
files
invitations
notifications
activityLogs
auditLogs
```

---

## 7. API Requirements

The API must follow REST conventions.

All protected routes must require authentication.

All list endpoints must support pagination.

Common query features:

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

---

## 8. Error Handling Requirements

The system must return consistent error responses.

Example:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-06-21T00:00:00.000Z",
  "path": "/api/tasks"
}
```

---

## 9. Security Requirements

The system must implement:

* Password hashing
* JWT authentication
* Refresh token rotation
* Request validation
* Rate limiting
* CORS configuration
* Helmet security headers
* Role-based authorization
* Tenant isolation
* Audit logs
* Safe error responses
* Environment variable validation

---

## 10. Success Criteria

The project is successful when:

* The API can be deployed on Railway
* Swagger documentation is available
* Authentication works end-to-end
* Multi-tenancy works correctly
* RBAC rules are enforced
* Background jobs work with Redis
* PostgreSQL migrations run successfully
* Tests are available
* README is professional
* The project is good enough to show recruiters
