# 10-deployment-railway.md

# Railway Deployment Document

## Project Name

Enterprise Multi-Tenant Project Management API

## 1. Purpose

This document defines how to deploy the Nest.js API to Railway.

The deployment must include:

```txt
Nest.js API service
PostgreSQL service
Redis service
Environment variables
Prisma migration strategy
Production start command
Health check endpoint
```

---

## 2. Railway Services

Create the following Railway services:

```txt
API Service
PostgreSQL Service
Redis Service
```

The API service connects to PostgreSQL and Redis using environment variables.

---

## 3. Required Environment Variables

Set these in Railway for the API service:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

JWT_ACCESS_SECRET=replace-with-secure-value
JWT_REFRESH_SECRET=replace-with-secure-value
OUTBOX_ENCRYPTION_KEY=replace-with-an-independent-secure-value
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

APP_URL=https://your-railway-app-url
CORS_ORIGIN=https://your-frontend-url-or-localhost
```

For portfolio API-only deployment, `CORS_ORIGIN` can temporarily include a Swagger/testing frontend origin.

Never commit real secret values.

---

## 4. Local .env.example

Create:

```txt
.env.example
```

Content:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_saas
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=local-access-secret-change-me
JWT_REFRESH_SECRET=local-refresh-secret-change-me
OUTBOX_ENCRYPTION_KEY=local-outbox-secret-change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

---

## 5. Railway Start Command

Recommended production start command:

```bash
npm run start:prod
```

Build command:

```bash
npm run build
```

However, Prisma client must be generated before build or during install.

Recommended package scripts:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "postinstall": "prisma generate"
  }
}
```

---

## 6. Prisma Production Migration

For Railway production, migrations should be run intentionally.

Option 1: Railway pre-deploy command if available:

```bash
npx prisma migrate deploy
```

Option 2: Manual Railway shell command:

```bash
railway run npx prisma migrate deploy
```

Option 3: Start command with migration:

```bash
npx prisma migrate deploy && npm run start:prod
```

For real production, be careful with automatic migrations. For portfolio deployment, option 3 is acceptable if documented.

Recommended for this project:

```bash
npx prisma migrate deploy && npm run start:prod
```

---

## 7. Dockerfile

Create a production-ready Dockerfile:

```Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

Note:

Railway injects the actual `PORT`. The Nest app must listen on `process.env.PORT`.

---

## 8. main.ts Requirements

The app must listen on Railway's port:

```ts
const port = process.env.PORT || 3000;
await app.listen(port);
```

Swagger should be available at:

```txt
/api/docs
```

Health endpoint:

```txt
/api/v1/health
```

---

## 9. Health Check

Create endpoint:

```http
GET /api/v1/health
```

Response:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok"
  }
}
```

Optional:

Check database and Redis connectivity.

---

## 10. railway.json

Create:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 11. Local Docker Compose

Create `docker-compose.yml` for local dev:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: nest_saas_postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nest_saas
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: nest_saas_redis
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

---

## 12. Deployment Steps

### Step 1: Push Project to GitHub

```bash
git add .
git commit -m "Initial Nest.js SaaS API"
git push origin main
```

### Step 2: Create Railway Project

Create a new Railway project.

### Step 3: Add PostgreSQL

Add Railway PostgreSQL service.

### Step 4: Add Redis

Add Railway Redis service.

### Step 5: Connect GitHub Repository

Connect the API repository to Railway.

### Step 6: Configure Environment Variables

Add all variables from this document.

### Step 7: Deploy

Railway should build and deploy the API.

### Step 8: Run Migration

If migration is not part of start command:

```bash
railway run npx prisma migrate deploy
```

### Step 9: Verify

Open:

```txt
https://your-app.up.railway.app/api/v1/health
https://your-app.up.railway.app/api/docs
```

---

## 13. Production Checklist

Before showing project publicly:

```txt
Swagger works
Health endpoint works
Register works
Login works
PostgreSQL connected
Redis connected
Migrations applied
Seed data available if needed
No secrets committed
README contains deployed API URL
README contains Swagger URL
```

---

## 14. Common Railway Issues

### App crashes immediately

Check:

```txt
PORT usage
DATABASE_URL
REDIS_URL
Prisma generate
Build output
Start command
```

### Prisma client not found

Ensure:

```bash
npx prisma generate
```

runs during build or postinstall.

### Migrations not applied

Run:

```bash
railway run npx prisma migrate deploy
```

### Redis connection fails

Check:

```txt
REDIS_URL variable
Redis service is linked
TLS requirement if applicable
```

---

## 15. Codex Implementation Notes

When implementing deployment:

- Add `.env.example`.
- Add Dockerfile.
- Add railway.json.
- Add health endpoint.
- Add Prisma generate scripts.
- Ensure app listens on `process.env.PORT`.
- Document deployment URL in README after deployment.
