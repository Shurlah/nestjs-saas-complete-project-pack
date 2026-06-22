# 05-auth-rbac-security.md

# Authentication, RBAC, and Security Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines authentication, authorization, tenant access control, and general security requirements for the Enterprise Multi-Tenant Project Management API.

The system must be secure enough to demonstrate senior-level backend engineering skill.

The key security goals are:

- Verify user identity.
- Protect user credentials.
- Protect organization data.
- Prevent cross-tenant access.
- Enforce role-based access.
- Record important security events.
- Avoid leaking sensitive information.
- Make security behavior testable.

---

## 2. Authentication Model

The application uses:

```txt
JWT access tokens
JWT refresh tokens
Refresh token rotation
Hashed refresh token storage
Password hashing
Email verification placeholder
Password reset token flow
```

---

## 3. Password Security

Passwords must never be stored in plaintext.

Use either:

```txt
argon2
bcrypt
```

Recommended:

```txt
argon2
```

Password requirements:

```txt
Minimum 8 characters
At least 1 uppercase letter
At least 1 lowercase letter
At least 1 number
At least 1 symbol
```

The password hash field should be:

```txt
User.passwordHash
```

Never return `passwordHash` in API responses.

---

## 4. Access Token

Access tokens are short-lived JWTs.

Recommended expiry:

```txt
15 minutes
```

Access token payload:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "type": "access"
}
```

Rules:

- Use `JWT_ACCESS_SECRET`.
- Do not include sensitive data.
- Do not include organization roles directly unless carefully synchronized.
- Always validate token signature and expiry.
- Use access token in `Authorization: Bearer <token>` header.

---

## 5. Refresh Token

Refresh tokens are longer-lived JWTs.

Recommended expiry:

```txt
7 days
```

Refresh token payload:

```json
{
  "sub": "user-id",
  "type": "refresh"
}
```

Rules:

- Use `JWT_REFRESH_SECRET`.
- Store only a hash of the refresh token in the database.
- Rotate refresh token on every refresh.
- Invalidate the old refresh token after use.
- Revoke the active refresh session on logout.
- Reject reuse of old refresh tokens.

Database model:

```txt
RefreshSession.tokenHash
```

Each client session has its own token family. Reuse of a rotated token revokes the entire family without invalidating unrelated devices.

---

## 6. Authentication Endpoints

Required endpoints:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
GET  /api/v1/users/me
```

---

## 7. Register Flow

Steps:

```txt
1. Validate payload.
2. Normalize email to lowercase.
3. Check if email already exists.
4. Hash password.
5. Create user.
6. Generate email verification token.
7. Queue email verification job.
8. Generate access token.
9. Generate refresh token.
10. Hash the refresh token and create a refresh session.
11. Create audit log.
12. Return user and tokens.
```

Security rules:

- Do not return password hash.
- Do not allow duplicate emails.
- Do not expose internal database errors.

---

## 8. Login Flow

Steps:

```txt
1. Validate payload.
2. Normalize email.
3. Find user by email.
4. If user does not exist, return generic invalid credentials error.
5. Compare password with password hash.
6. If invalid, return generic invalid credentials error.
7. Check user status.
8. Generate access token.
9. Generate refresh token.
10. Hash refresh token and store it.
11. Update lastLoginAt.
12. Create audit log.
13. Return user and tokens.
```

Security rule:

Use the same error message for wrong email and wrong password:

```txt
Invalid email or password
```

---

## 9. Refresh Token Flow

Steps:

```txt
1. Validate refresh token payload.
2. Confirm token type is refresh.
3. Find user.
4. Load the active refresh session and compare the raw token with its stored hash.
5. If invalid, reject request.
6. Generate new access token.
7. Generate new refresh token.
8. Hash the new refresh token and create the replacement session in the same family.
9. Revoke the previous session and link it to its replacement atomically.
10. Return new tokens.
```

Security rule:

Refresh token rotation is mandatory.

---

## 10. Logout Flow

Steps:

```txt
1. Authenticate user.
2. Revoke the current refresh session, or all sessions when explicitly requested.
3. Create audit log.
4. Return success.
```

---

## 11. Password Reset Flow

### 11.1 Forgot Password

Steps:

```txt
1. Accept email.
2. Normalize email.
3. If user exists, create password reset token.
4. Store token hash.
5. Queue password reset email.
6. Return generic response.
```

Response must not reveal whether the email exists.

Example message:

```txt
If the email exists, password reset instructions will be sent
```

### 11.2 Reset Password

Steps:

```txt
1. Accept raw reset token and new password.
2. Hash raw token and find token record.
3. Confirm token exists.
4. Confirm token has not expired.
5. Confirm token has not been used.
6. Hash new password.
7. Update user password hash.
8. Mark token as used.
9. Revoke all refresh sessions to log out old clients.
10. Create audit log.
11. Return success.
```

---

## 12. Email Verification Flow

Steps:

```txt
1. Create email verification token during registration.
2. Store token hash.
3. Queue email verification job.
4. Accept raw token from verification endpoint.
5. Hash token and find token record.
6. Confirm token has not expired.
7. Confirm token has not been used.
8. Set user.isEmailVerified to true.
9. Mark token as used.
10. Return success.
```

For portfolio version, actual email provider integration may be mocked, logged, or replaced by a development email provider.

---

## 13. Authorization Model

The system uses:

```txt
RBAC
organization membership checks
tenant resource checks
ownership checks where applicable
```

Authorization must answer:

```txt
1. Is the user authenticated?
2. Is the user a member of this organization?
3. Does the user have the required role?
4. Does the resource belong to this organization?
5. Does the user have special ownership over this resource if required?
```

---

## 14. Roles

Valid organization roles:

```txt
OWNER
ADMIN
PROJECT_MANAGER
MEMBER
GUEST
```

---

## 15. Role Hierarchy

Role strength:

```txt
OWNER > ADMIN > PROJECT_MANAGER > MEMBER > GUEST
```

However, do not rely only on numeric hierarchy. Some permissions need explicit rules.

Example:

- Admin cannot remove owner.
- Project manager can manage projects but cannot invite members.
- Member can update tasks they created or are assigned to.
- Guest has limited access.

---

## 16. Permission Matrix

| Action | OWNER | ADMIN | PROJECT_MANAGER | MEMBER | GUEST |
|---|---:|---:|---:|---:|---:|
| Update organization | Yes | Yes | No | No | No |
| Archive organization | Yes | No | No | No | No |
| Invite members | Yes | Yes | No | No | No |
| Change member role | Yes | Yes* | No | No | No |
| Remove member | Yes | Yes* | No | No | No |
| Create team | Yes | Yes | No | No | No |
| Update team | Yes | Yes | No | No | No |
| Delete team | Yes | Yes | No | No | No |
| Create project | Yes | Yes | Yes | No | No |
| Update project | Yes | Yes | Yes | No | No |
| Archive project | Yes | Yes | Yes | No | No |
| Create task | Yes | Yes | Yes | Yes | No |
| Update any task | Yes | Yes | Yes | No | No |
| Update own/assigned task | Yes | Yes | Yes | Yes | No |
| Comment on task | Yes | Yes | Yes | Yes | Limited |
| View audit logs | Yes | Yes | No | No | No |
| View activity logs | Yes | Yes | Yes | Yes | Limited |

`*` Admin cannot modify or remove owner.

---

## 17. Guards

Required guards:

```txt
JwtAuthGuard
OrganizationMemberGuard
RolesGuard
ProjectAccessGuard
OptionalAuthGuard
```

### JwtAuthGuard

Responsibilities:

- Validate access token.
- Attach authenticated user to request.

### OrganizationMemberGuard

Responsibilities:

- Read `organizationId` from route params.
- Confirm current user has active membership in the organization.
- Attach membership to request.

### RolesGuard

Responsibilities:

- Read required roles from route metadata.
- Check current user's organization role.
- Allow or reject access.

### ProjectAccessGuard

Responsibilities:

- Confirm project belongs to organization.
- Confirm user can access the project.
- Useful for future guest/project-specific access.

---

## 18. Decorators

Required decorators:

```txt
@CurrentUser()
@CurrentUserId()
@OrganizationId()
@Roles(...)
@Public()
```

Example:

```ts
@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
@UseGuards(JwtAuthGuard, OrganizationMemberGuard, RolesGuard)
@Post('/organizations/:organizationId/invitations')
createInvitation() {}
```

---

## 19. Tenant Isolation Security

Every organization-owned resource must be filtered by `organizationId`.

Bad:

```ts
await prisma.task.findUnique({
  where: { id: taskId },
});
```

Good:

```ts
await prisma.task.findFirst({
  where: {
    id: taskId,
    organizationId,
  },
});
```

Tenant isolation must be tested.

---

## 20. Resource Ownership Rules

Some actions require resource ownership checks.

Examples:

- A user can edit their own comment.
- A user can update a task they created or are assigned to.
- Admins and project managers can update any task within allowed projects.

---

## 21. Rate Limiting

Apply rate limiting to sensitive endpoints:

```txt
POST /auth/login
POST /auth/register
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/refresh
```

Recommended:

```txt
Login: 5 attempts per minute per IP/email combination
Forgot password: 3 attempts per hour per email
Register: 5 attempts per hour per IP
```

For v1, implement simple Nest throttling globally and document stronger production options.

---

## 22. CORS

Configure CORS using environment variable:

```txt
CORS_ORIGIN
```

Development may allow:

```txt
http://localhost:3000
```

Production should use explicit frontend domain only.

---

## 23. Security Headers

Use Helmet.

Recommended setup:

```txt
helmet()
```

Do not disable security headers unless necessary.

---

## 24. Input Validation

Use global validation pipe.

Recommended config:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

---

## 25. Safe API Responses

Never return:

```txt
passwordHash
refresh session token hashes
tokenHash
internal stack trace
database error object
```

Use response DTOs or explicit response mapping.

---

## 26. Audit Events

Record audit logs for:

```txt
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
```

Audit log should capture:

```txt
actorId
organizationId
action
entityType
entityId
ipAddress
userAgent
metadata
createdAt
```

---

## 27. Environment Variables

Required security variables:

```txt
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
CORS_ORIGIN
NODE_ENV
```

Never commit real secrets.

Create `.env.example`.

---

## 28. Testing Requirements

Security tests must cover:

```txt
register hashes password
login rejects invalid credentials
login returns tokens
refresh rotates token
logout clears refresh token hash
protected route rejects missing token
role guard rejects insufficient role
organization guard rejects non-member
tenant query prevents cross-organization access
admin cannot remove owner
```

---

## 29. Codex Implementation Notes

When implementing security:

- Start with auth module.
- Build guards early.
- Do not implement tenant-scoped modules before tenant guard exists.
- Use tests to prove tenant isolation.
- Never skip refresh token hashing.
- Never return sensitive fields.
