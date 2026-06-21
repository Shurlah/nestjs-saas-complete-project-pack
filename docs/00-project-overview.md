# 00-project-overview.md

# Enterprise Multi-Tenant Project Management API

## 1. Project Summary

This project is a production-grade backend API for a multi-tenant SaaS project management platform. The system allows organizations to manage users, teams, projects, tasks, comments, invitations, role-based access, notifications, file attachments, activity logs, and audit trails.

The application is built with Nest.js, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, Docker, and Railway.

The goal of this project is to demonstrate senior-level backend engineering skill using Nest.js and Node.js. The project should not be treated as a simple CRUD application. It must demonstrate production backend concerns such as authentication, authorization, multi-tenancy, database design, validation, background jobs, logging, testing, deployment, and clean modular architecture.

---

## 2. Business Problem

Small and medium-sized teams need a secure way to manage work across organizations, teams, projects, and tasks. Many project management systems require strict isolation between companies, strong role-based access control, clear activity history, and reliable notification flows.

The system should allow multiple organizations to use the same application while keeping their data isolated.

---

## 3. Core Users

The system supports the following user types:

1. Platform User
2. Organization Owner
3. Organization Admin
4. Project Manager
5. Team Member
6. Guest Member

---

## 4. Core Capabilities

The system must support:

* User registration and login
* Email verification
* Password reset
* Refresh token authentication
* Organization creation
* Organization membership
* Team management
* Project management
* Task and subtask management
* Task assignment
* Task comments
* File attachments
* Activity logs
* Audit logs
* Organization invitations
* Role-based access control
* Background notification jobs
* Search and filtering
* Pagination
* Soft deletes
* API documentation
* Health checks
* Railway deployment

---

## 5. Main Modules

The backend should be organized into the following modules:

```txt
auth
users
organizations
memberships
teams
projects
tasks
comments
files
invitations
notifications
audit-logs
activity-logs
billing
health
```

---

## 6. Technical Stack

```txt
Runtime: Node.js
Framework: Nest.js
Language: TypeScript
Database: PostgreSQL
ORM: Prisma
Cache/Queue: Redis
Job Queue: BullMQ
Authentication: JWT + Refresh Tokens
Authorization: RBAC
Validation: class-validator + class-transformer
Documentation: Swagger/OpenAPI
Testing: Jest + Supertest
Containerization: Docker
Deployment: Railway
CI/CD: GitHub Actions
```

---

## 7. Non-Functional Requirements

The application must be:

* Secure
* Modular
* Testable
* Deployable
* Observable
* Maintainable
* Well-documented
* Portfolio-ready

---

## 8. Senior Engineering Goals

This project must prove the following skills:

* Nest.js module architecture
* Dependency injection
* DTO validation
* Custom guards and decorators
* JWT authentication
* Refresh token rotation
* Role-based access control
* Multi-tenant database modeling
* PostgreSQL schema design
* Prisma migrations
* Background jobs with BullMQ
* Redis usage
* API documentation with Swagger
* Centralized error handling
* Logging
* Health checks
* Unit and integration testing
* Docker deployment
* Railway deployment
* Clean GitHub documentation

---

## 9. Deployment Target

The project will be deployed on Railway.

Railway services required:

```txt
API Service
PostgreSQL Service
Redis Service
```

The API service should connect to PostgreSQL and Redis through Railway environment variables.

---

## 10. Portfolio Positioning

This project should be presented as:

> A production-grade multi-tenant SaaS backend built with Nest.js, PostgreSQL, Prisma, Redis, BullMQ, JWT authentication, RBAC, audit logging, background jobs, Docker, and Railway.

The GitHub repository should make it clear that this is not a tutorial project. It should look like a backend system that could realistically be used by a SaaS startup.
