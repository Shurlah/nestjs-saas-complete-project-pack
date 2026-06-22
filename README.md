# Enterprise Multi-Tenant Project Management API

A production-grade NestJS backend for multi-tenant project management. The application is being implemented incrementally from the specifications in [`docs/`](docs/).

## Current Status

Phases 1–4 provide the NestJS foundation, PostgreSQL/Prisma persistence, JWT authentication with refresh-session rotation, account recovery and verification flows, organization and membership management, invitation acceptance, tenant isolation, RBAC guards, security audit records, and transactional email outbox events.

## Local Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate:dev -- --name init
npm run prisma:seed
npm run start:dev
```

Available endpoints:

- Health: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/docs`

Authentication endpoints are under `/api/v1/auth`; current-user endpoints are under `/api/v1/users/me`. Swagger documents request schemas and bearer authentication.

Tenant-root endpoints are under `/api/v1/organizations`. Creating an organization atomically assigns the current user its `OWNER` membership; organization invitations are accepted through `/api/v1/invitations/accept`.

Use independent values for the JWT and `OUTBOX_ENCRYPTION_KEY` secrets. Changing the outbox key before pending account emails are processed makes those encrypted token payloads unreadable.

Mailpit's local inbox is available at `http://localhost:8025`.

The seed creates five users covering every organization role. Their shared local-development password is `Password@123`.

## Verification

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

See [`docs/14-development-plan.md`](docs/14-development-plan.md) for the agreed implementation plan.
