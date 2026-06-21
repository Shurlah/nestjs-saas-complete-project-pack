# Enterprise Multi-Tenant Project Management API

A production-grade NestJS backend for multi-tenant project management. The application is being implemented incrementally from the specifications in [`docs/`](docs/).

## Current Status

Phase 1 provides the NestJS foundation, validated configuration, structured logging, throttling, Swagger, global response/error handling, and a health endpoint.

## Local Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run start:dev
```

Available endpoints:

- Health: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/docs`

Mailpit's local inbox is available at `http://localhost:8025`.

## Verification

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

See [`docs/14-development-plan.md`](docs/14-development-plan.md) for the agreed implementation plan.
