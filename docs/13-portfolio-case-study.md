# 13-portfolio-case-study.md

# Portfolio Case Study

## Project Title

Enterprise Multi-Tenant Project Management API

## Short Description

A production-grade SaaS backend API that allows multiple organizations to manage teams, projects, tasks, comments, invitations, notifications, and audit logs with strong tenant isolation and role-based access control.

---

## Problem

Many project management systems must support multiple companies on the same platform while keeping each company’s data isolated.

A backend system like this must solve more than CRUD. It must handle authentication, authorization, tenant boundaries, role permissions, secure invitations, activity tracking, audit logs, background jobs, and production deployment.

---

## Solution

I built a multi-tenant project management backend using Nest.js, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, JWT authentication, RBAC, Docker, and Railway.

The system allows users to create organizations, invite members, assign roles, create teams, create projects, manage tasks, comment on tasks, receive notifications, and track organization activity.

---

## Key Technical Decisions

### Modular Monolith

I used a modular monolith architecture instead of microservices for version 1.

This keeps deployment simple while still enforcing clean module boundaries.

### Shared Database Multi-Tenancy

I used a shared PostgreSQL database with tenant-scoped rows.

Every organization-owned table includes `organizationId`.

This makes the system practical for an early-stage SaaS product while still demonstrating real tenant isolation.

### JWT Authentication with Refresh Token Rotation

Access tokens are short-lived.

Refresh tokens are rotated and stored as hashes.

This improves security compared to long-lived static tokens.

### RBAC and Tenant Guards

The system uses organization membership checks and role guards to ensure users can only perform actions allowed by their role.

### Background Jobs

I used BullMQ and Redis for asynchronous work such as invitation emails, notifications, and audit processing.

### Railway Deployment

The system is designed to be deployed with Railway using PostgreSQL and Redis managed services.

---

## Core Features

- User registration and login
- JWT authentication
- Refresh token rotation
- Password reset
- Email verification placeholder
- Organization management
- Team management
- Project management
- Task management
- Task assignment
- Comments
- Invitations
- Notifications
- Activity logs
- Audit logs
- RBAC
- Tenant isolation
- Swagger API docs
- Railway deployment

---

## Architecture

```txt
Client
  -> Nest.js REST API
    -> Guards
    -> DTO validation
    -> Controllers
    -> Services
    -> Prisma
    -> PostgreSQL
    -> BullMQ
    -> Redis
```

---

## What I Learned / Demonstrated

This project demonstrates my ability to:

- Design production-grade backend architecture.
- Build secure authentication flows.
- Implement role-based authorization.
- Protect multi-tenant data.
- Model relational data in PostgreSQL.
- Use Prisma effectively.
- Build background processing with Redis and BullMQ.
- Write maintainable Nest.js modules.
- Document APIs with Swagger.
- Prepare a backend for cloud deployment.
- Think like a senior backend engineer.

---

## Recruiter Summary

This project proves I can build backend systems that go beyond basic CRUD.

It demonstrates real-world backend concerns such as security, permissions, data isolation, background jobs, testing, logging, and deployment.
