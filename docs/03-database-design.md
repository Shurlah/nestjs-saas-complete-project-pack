# 03-database-design.md

# Database Design Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines the PostgreSQL database design for the Enterprise Multi-Tenant Project Management API.

The database must support:

- Users
- Organizations
- Memberships
- Teams
- Projects
- Tasks
- Comments
- Invitations
- Notifications
- Activity logs
- Audit logs
- Refresh tokens
- Password reset tokens
- Email verification tokens
- Multi-device refresh sessions
- Transactional outbox events

File attachments, task labels, and subtasks are deferred from the core V1 migration. Their draft models remain documented below for future implementation but are not present in the initial Prisma schema.

The database must enforce strong tenant isolation by ensuring organization-owned resources include `organizationId`.

---

## 2. Database Technology

Use:

```txt
PostgreSQL
Prisma ORM
UUID primary keys
Prisma migrations
```

---

## 3. Multi-Tenancy Model

The application uses:

```txt
Single database
Shared schema
Tenant-scoped rows
```

Each organization is a tenant.

Tenant-owned tables must include:

```txt
organizationId
```

The system must never query tenant-owned resources without checking `organizationId`.

---

## 4. Naming Conventions

Use:

- PascalCase for Prisma model names
- camelCase for Prisma fields
- UUID string IDs
- `createdAt` and `updatedAt` on all core tables
- `deletedAt` for soft-deletable business entities

---

## 5. Enums

### UserStatus

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
  DEACTIVATED
}
```

### OrganizationRole

```prisma
enum OrganizationRole {
  OWNER
  ADMIN
  PROJECT_MANAGER
  MEMBER
  GUEST
}
```

### MembershipStatus

```prisma
enum MembershipStatus {
  ACTIVE
  INVITED
  SUSPENDED
  REMOVED
}
```

### ProjectStatus

```prisma
enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}
```

### TaskStatus

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  BLOCKED
  DONE
  CANCELLED
}
```

### TaskPriority

```prisma
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### InvitationStatus

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  CANCELLED
  EXPIRED
}
```

### NotificationType

```prisma
enum NotificationType {
  INVITATION_RECEIVED
  TASK_ASSIGNED
  TASK_STATUS_CHANGED
  COMMENT_MENTION
  PROJECT_ARCHIVED
  DUE_DATE_REMINDER
}
```

### AuditAction

```prisma
enum AuditAction {
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
}
```

---

## 6. Core Models

## 6.1 User

Represents a platform user.

```prisma
model User {
  id                     String        @id @default(uuid())
  email                  String        @unique
  firstName              String
  lastName               String
  passwordHash           String
  status                 UserStatus    @default(ACTIVE)
  isEmailVerified        Boolean       @default(false)
  lastLoginAt            DateTime?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
  deletedAt              DateTime?

  ownedOrganizations     Organization[] @relation("OrganizationOwner")
  memberships            Membership[]
  projectMemberships     ProjectMember[]
  teamMemberships        TeamMember[]
  assignedTasks          Task[]         @relation("TaskAssignee")
  createdTasks           Task[]         @relation("TaskCreator")
  comments               Comment[]
  sentInvitations        Invitation[]   @relation("InvitationInviter")
  notifications          Notification[]
  auditLogs              AuditLog[]     @relation("AuditActor")
  activityLogs           ActivityLog[]  @relation("ActivityActor")
  passwordResetTokens    PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  refreshSessions        RefreshSession[]
}
```

Important indexes:

```prisma
@@index([email])
@@index([status])
```

---

## 6.2 Organization

Represents a tenant.

```prisma
model Organization {
  id             String       @id @default(uuid())
  name           String
  slug           String       @unique
  ownerId        String
  owner          User         @relation("OrganizationOwner", fields: [ownerId], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?

  memberships    Membership[]
  teams          Team[]
  projects       Project[]
  tasks          Task[]
  invitations    Invitation[]
  notifications  Notification[]
  auditLogs      AuditLog[]
  activityLogs   ActivityLog[]
  outboxEvents   OutboxEvent[]

  @@index([ownerId])
  @@index([slug])
}
```

---

## 6.3 Membership

Represents a user’s membership in an organization.

```prisma
model Membership {
  id             String             @id @default(uuid())
  userId         String
  organizationId String
  role           OrganizationRole
  status         MembershipStatus   @default(ACTIVE)
  joinedAt       DateTime?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  user           User               @relation(fields: [userId], references: [id])
  organization   Organization       @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@index([userId])
  @@index([role])
  @@index([status])
}
```

Rules:

- One user can have only one membership per organization.
- Every organization must have one owner.
- The owner cannot be removed by an admin.

---

## 6.4 Team

Represents a team within an organization.

```prisma
model Team {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  description    String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])
  members        TeamMember[]
  projects       Project[]

  @@index([organizationId])
  @@unique([organizationId, name])
}
```

---

## 6.5 TeamMember

Represents a user assigned to a team.

```prisma
model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String
  createdAt DateTime @default(now())

  team      Team     @relation(fields: [teamId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}
```

---

## 6.6 Project

Represents a project inside an organization.

```prisma
model Project {
  id             String        @id @default(uuid())
  organizationId String
  teamId         String?
  name           String
  key            String
  description    String?
  status         ProjectStatus @default(PLANNING)
  startDate      DateTime?
  dueDate        DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedAt      DateTime?

  organization   Organization  @relation(fields: [organizationId], references: [id])
  team           Team?         @relation(fields: [teamId], references: [id])
  tasks          Task[]
  members        ProjectMember[]

  @@index([organizationId])
  @@index([teamId])
  @@index([status])
  @@unique([organizationId, key])
}
```

---

## 6.7 ProjectMember

Represents explicit project access.

```prisma
model ProjectMember {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  createdAt DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}
```

---

## 6.8 Task

Represents a project task.

```prisma
model Task {
  id             String       @id @default(uuid())
  organizationId String
  projectId      String
  title          String
  description    String?
  status         TaskStatus   @default(TODO)
  priority       TaskPriority @default(MEDIUM)
  assigneeId     String?
  createdById    String
  dueDate        DateTime?
  completedAt    DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])
  project        Project      @relation(fields: [projectId], references: [id])
  assignee       User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdBy      User         @relation("TaskCreator", fields: [createdById], references: [id])
  comments       Comment[]

  @@index([organizationId])
  @@index([projectId])
  @@index([assigneeId])
  @@index([createdById])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
}
```

Rules:

- Task must belong to one project.
- Task must belong to one organization.
- Task project must belong to the same organization.
- Assignee must be a member of the organization.

---

## 6.9 TaskLabel (Deferred)

Represents reusable task labels inside an organization.

```prisma
model TaskLabel {
  id             String            @id @default(uuid())
  organizationId String
  name           String
  color          String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  labelsOnTasks  TaskLabelOnTask[]

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

---

## 6.10 TaskLabelOnTask (Deferred)

Join table for tasks and labels.

```prisma
model TaskLabelOnTask {
  taskId  String
  labelId String

  task    Task      @relation(fields: [taskId], references: [id])
  label   TaskLabel @relation(fields: [labelId], references: [id])

  @@id([taskId, labelId])
  @@index([labelId])
}
```

---

## 6.11 Comment

Represents comments on tasks.

```prisma
model Comment {
  id             String   @id @default(uuid())
  organizationId String
  taskId         String
  authorId       String
  body           String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  task           Task     @relation(fields: [taskId], references: [id])
  author         User     @relation(fields: [authorId], references: [id])

  @@index([organizationId])
  @@index([taskId])
  @@index([authorId])
}
```

---

## 6.12 Invitation

Represents an invitation to join an organization.

```prisma
model Invitation {
  id             String           @id @default(uuid())
  organizationId String
  email          String
  role           OrganizationRole
  tokenHash      String
  status         InvitationStatus @default(PENDING)
  invitedById    String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  organization   Organization     @relation(fields: [organizationId], references: [id])
  invitedBy      User             @relation("InvitationInviter", fields: [invitedById], references: [id])

  @@index([organizationId])
  @@index([email])
  @@index([status])
  @@index([expiresAt])
}
```

Rules:

- Store invitation token as a hash.
- Do not store raw invitation token.
- Invitations must expire.
- A user accepting an invitation must receive the role attached to the invitation.

---

## 6.13 Notification

Represents an in-app notification.

```prisma
model Notification {
  id             String           @id @default(uuid())
  organizationId String?
  userId         String
  type           NotificationType
  title          String
  message        String
  readAt         DateTime?
  metadata       Json?
  createdAt      DateTime         @default(now())

  organization   Organization?    @relation(fields: [organizationId], references: [id])
  user           User             @relation(fields: [userId], references: [id])

  @@index([organizationId])
  @@index([userId])
  @@index([type])
  @@index([readAt])
  @@index([createdAt])
}
```

---

## 6.14 ActivityLog

Represents user-facing business activity.

```prisma
model ActivityLog {
  id             String       @id @default(uuid())
  organizationId String
  actorId        String?
  action         String
  entityType     String
  entityId       String
  message        String
  metadata       Json?
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])
  actor          User?        @relation("ActivityActor", fields: [actorId], references: [id])

  @@index([organizationId])
  @@index([actorId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 6.15 AuditLog

Represents security and administrative audit events.

```prisma
model AuditLog {
  id             String       @id @default(uuid())
  organizationId String?
  actorId        String?
  action         AuditAction
  entityType     String?
  entityId       String?
  ipAddress      String?
  userAgent      String?
  metadata       Json?
  createdAt      DateTime     @default(now())

  organization   Organization? @relation(fields: [organizationId], references: [id])
  actor          User?         @relation("AuditActor", fields: [actorId], references: [id])

  @@index([organizationId])
  @@index([actorId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 6.16 FileAttachment (Deferred)

Stores metadata for uploaded files.

```prisma
model FileAttachment {
  id             String       @id @default(uuid())
  organizationId String
  uploadedById   String
  entityType     String
  entityId       String
  fileName       String
  fileUrl        String
  mimeType       String
  size           Int
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([uploadedById])
  @@index([entityType, entityId])
}
```

---

## 6.17 PasswordResetToken

Represents password reset tokens.

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([expiresAt])
}
```

Rules:

- Store token hash only.
- Token should expire.
- Token can only be used once.

---

## 6.18 EmailVerificationToken

Represents email verification tokens.

```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([expiresAt])
}
```

---

## 6.19 RefreshSession

Stores one hashed rotating refresh token per client session. Session families support concurrent devices, targeted logout, and reuse detection.

Key fields:

```txt
userId
familyId
tokenHash
expiresAt
lastUsedAt
revokedAt
replacedBySessionId
ipAddress
userAgent
createdAt
updatedAt
```

The token hash is unique and raw refresh tokens are never persisted.

---

## 6.20 OutboxEvent

Stores domain events in the same transaction as business changes before an idempotent relay publishes them to BullMQ.

Key fields:

```txt
organizationId
topic
eventType
aggregateType
aggregateId
payload
status
attempts
availableAt
lockedAt
processedAt
lastError
createdAt
updatedAt
```

Workers claim pending events using `status` and `availableAt`; event IDs provide the downstream idempotency key.

---

## 7. Relationship Summary

```txt
User
  has many Memberships
  has many RefreshSessions
  has many Notifications

Organization
  has many Memberships
  has many Teams
  has many Projects
  has many Tasks
  has many Invitations
  has many AuditLogs
  has many ActivityLogs

Project
  belongs to Organization
  optionally belongs to Team
  has many Tasks
  has many ProjectMembers

Task
  belongs to Organization
  belongs to Project
  optionally belongs to an Assignee Membership
  belongs to a Creator Membership
  has many Comments

Comment
  belongs to Task
  belongs to Author

Invitation
  belongs to Organization
  belongs to an Inviter Membership

OutboxEvent
  optionally belongs to Organization
```

---

## 8. Important Transactional Operations

Use database transactions for:

### 8.1 Create Organization

Steps:

```txt
1. Create organization.
2. Create OWNER membership for current user.
3. Create audit log.
```

### 8.2 Accept Invitation

Steps:

```txt
1. Validate invitation token.
2. Check invitation status.
3. Check invitation expiry.
4. Create or update membership.
5. Mark invitation as accepted.
6. Create audit log.
7. Create activity log.
```

### 8.3 Create Task

Steps:

```txt
1. Confirm project belongs to organization.
2. Confirm assignee belongs to organization if provided.
3. Create task.
4. Create activity log.
5. Queue notification if task has assignee.
```

### 8.4 Change Member Role

Steps:

```txt
1. Confirm actor has OWNER or ADMIN role.
2. Prevent changing owner role unless actor is owner.
3. Update membership role.
4. Create audit log.
5. Create activity log.
```

---

## 9. Soft Delete Strategy

Use `deletedAt` for:

```txt
User
Organization
Team
Project
Task
Comment
```

Soft-deleted records should be excluded from normal queries.

Do not physically delete important business records unless required.

---

## 10. Indexing Strategy

Required indexes:

```txt
User.email
Organization.slug
Membership.userId
Membership.organizationId
Project.organizationId
Task.organizationId
Task.projectId
Task.assigneeId
Task.status
Task.priority
Comment.taskId
Invitation.email
Invitation.status
Notification.userId
AuditLog.organizationId
ActivityLog.organizationId
```

---

## 11. Seed Data

The seed script should create:

```txt
1 owner user
1 admin user
2 member users
1 guest user
1 organization
2 teams
2 projects
10 tasks
5 comments
sample notifications
sample activity logs
sample audit logs
```

This makes Swagger demos and portfolio screenshots easier.

---

## 12. Prisma Migration Strategy

Development:

```bash
npx prisma migrate dev
```

Production:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

---

## 13. Prisma Schema File

The final Prisma schema should be created at:

```txt
prisma/schema.prisma
```

The implementation should use this document as the reference.
