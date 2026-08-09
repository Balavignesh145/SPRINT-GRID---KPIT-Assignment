# SprintGrid — Full-Stack Intern Assignment Submission

> **Agile Project Management Tool for a Small Team**
> Submitted by: **Balavignesh P**
> Email: balavignesh10thactive2020@gmail.com

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Setup Instructions](#2-setup-instructions)
3. [Architecture Notes](#3-architecture-notes)
4. [API Documentation](#4-api-documentation)
5. [Database Schema](#5-database-schema)
6. [Design Decisions and Tradeoffs](#6-design-decisions-and-tradeoffs)
7. [Security Considerations](#7-security-considerations)
8. [AI Usage Disclosure](#8-ai-usage-disclosure)
9. [What I Would Improve or Build Next](#9-what-i-would-improve-or-build-next)
10. [Demo Credentials](#10-demo-credentials)

---

## 1. Project Overview

**SprintGrid** is a full-stack, production-minded agile project management application designed for small engineering teams of 3-10 users. It organises work into a clean domain hierarchy:

```
Project -> User Story -> Task
```

### Core Features Implemented

| Feature | Description |
|---------|-------------|
| **Authentication** | Register, login, logout with secure HttpOnly cookie sessions. Passwords hashed with Argon2id. |
| **Projects** | Create, view, update, archive project workspaces. Auto-generated project keys (e.g. NSTAR). |
| **User Stories** | Create, view, update, delete/archive. Status (Backlog, Todo, In Progress, In Review, Done), priority (Low/Medium/High), story points, acceptance criteria, assignee. |
| **Tasks** | Create, view, update, delete/archive per story. Status includes Blocked column. Assignee, due date, position ordering. |
| **Kanban Board** | Drag-and-drop tasks across 6 columns: Backlog, Todo, In Progress, Blocked, In Review, Done. Optimistic UI updates with automatic rollback on API failure. |
| **Team Management** | Add members by email, assign roles (Owner/Admin/Member/Viewer), remove members. |
| **Activity Log** | Cursor-paginated audit trail of all project mutations (story created, task moved, member added, etc.). |
| **Notifications** | In-app notification panel with unread count badge. Auto-generated for: member invited, task overdue, daily digest. Mark read / mark all read. |
| **Global Search** | Command palette (Ctrl+K) searching across projects, stories, tasks, and users. |
| **Project Progress** | Visual progress bar showing Done / In Progress / Pending story counts. |
| **Async Background Worker** | Database-backed job queue with retry and exponential backoff for overdue detection, task reminders, and daily digest generation. |

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4, TanStack Query v5, React Router v7, dnd-kit, Lucide React, Zod |
| **Backend** | Node.js 20+, TypeScript, Fastify 5, Prisma ORM, Argon2id, Zod |
| **Database** | SQLite (file-based via Prisma) |
| **Testing** | Vitest (unit/integration), Playwright (E2E/browser), axe-core (accessibility) |
| **Quality** | TypeScript strict mode, ESLint, Prettier |
| **Documentation** | OpenAPI/Swagger at /api/docs |

---

## 2. Setup Instructions

### Prerequisites

- **Node.js** >= 20.19.0
- **npm** >= 10.0.0

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd sprintgrid

# 2. Copy environment configuration
cp .env.example .env

# 3. Install all dependencies (monorepo workspace)
npm install

# 4. Generate Prisma client
npx prisma generate --schema prisma/schema.prisma

# 5. Run database migrations
npx prisma migrate dev --schema prisma/schema.prisma

# 6. Seed demo data (creates users, projects, stories, tasks)
npm run db:seed --workspace=@sprintgrid/api
```

### Running the Application

Open three terminals:

```bash
# Terminal 1 - API Server (http://localhost:3000)
npm run dev:api

# Terminal 2 - Frontend Dev Server (http://localhost:5173 or 5180)
npm run dev:web

# Terminal 3 - Background Worker (overdue checks, reminders, digests)
npm run dev:worker
```

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | file:./dev.db | Path to SQLite database file |
| SESSION_SECRET | Auto-generated | Cryptographic session secret (min 32 chars). Required in production. |
| SESSION_TTL_SECONDS | 604800 | Session duration (default: 7 days) |
| RATE_LIMIT_MAX | 120 | Max requests per IP per minute |
| WEB_ORIGIN | http://localhost:5173 | Frontend URL for CORS |
| API_HOST | 127.0.0.1 | API bind address |
| API_PORT | 3000 | API port |

### Running Tests

```bash
# TypeScript type checking
npm run typecheck

# ESLint
npm run lint

# Prettier format check
npm run format

# Unit + Integration tests (Vitest)
npm run test

# E2E browser tests (Playwright)
npx playwright install   # first-time only
npm run test:e2e
```

---

## 3. Architecture Notes

### Monorepo Structure

```
sprintgrid/
  apps/
    api/                  # Fastify backend REST API
      src/
        app.ts            # Fastify app builder (plugins, security, routes)
        server.ts         # Entry point - starts HTTP server
        worker.ts         # Background job worker process
        config.ts         # Zod-validated environment config
        lib/              # Shared utilities (prisma, session, password, activity)
        middleware/       # authenticate.ts, authorize.ts
        routes/           # auth/, projects/, stories/, tasks/, members/,
                          # activity/, notifications/, search/
      package.json
    web/                  # React + Vite frontend SPA
      src/
        app/              # App.tsx (routing, auth guards)
        pages/            # LandingPage, LoginPage, RegisterPage,
                          # DashboardPage, ProjectPage, KanbanPage
        components/       # layout/AppShell, command/CommandPalette,
                          # notifications/NotificationPanel
        api/              # client.ts (typed HTTP client)
        styles/           # index.css (design tokens + Tailwind)
        types/            # TypeScript interfaces
      e2e/                # Playwright E2E tests
      package.json
  prisma/
    schema.prisma         # Database models and relations
    seed.ts               # Demo data seeder
    migrations/           # Prisma migration history
  docs/                   # Technical documentation
    architecture.md
    database.md
    api.md
    security.md
    decisions.md
  logo/                   # Brand assets
  package.json            # Root workspace config
```

### Component Architecture

```
+---------------------+
|   React Frontend    |  (Vite dev server)
|   SPA (TypeScript)  |
+---------+-----------+
          | REST API calls (fetch + cookies)
          v
+---------------------+
|  Fastify API Server |  (Node.js)
|  - Auth middleware   |
|  - Zod validation    |
|  - Rate limiting     |
|  - Helmet headers    |
+---------+-----------+
          | Prisma ORM queries
          v
+---------------------+    +---------------------+
|   SQLite Database   |<---|  Background Worker  |
|   (prisma/dev.db)   |    |  - Overdue checks   |
|                     |    |  - Task reminders   |
|                     |    |  - Daily digest     |
+---------------------+    +---------------------+
```

### Request Flow (API)

```
Client Request
    |
Rate Limiter (@fastify/rate-limit)
    |
Security Headers (@fastify/helmet)
    |
Cookie Parser (@fastify/cookie)
    |
Zod Schema Validation
    |
Authentication (preHandler: authenticate)
    |
Authorization (assertProjectMember / assertProjectAdmin)
    |
Route Handler (business logic)
    |
Prisma ORM -> SQLite
    |
Activity Logging (logActivity)
    |
JSON Response
```

---

## 4. API Documentation

All endpoints use the /api/v1 prefix. Interactive Swagger documentation is available at /api/docs when the server is running.

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/v1/auth/register | Register new account | No |
| POST | /api/v1/auth/login | Login with credentials | No |
| POST | /api/v1/auth/logout | Revoke session | Yes |
| GET | /api/v1/auth/me | Get current user info | Yes |

### Project Endpoints

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | /api/v1/projects | List user's projects | Member |
| POST | /api/v1/projects | Create new project | (any user) |
| GET | /api/v1/projects/:projectId | Get project details | Member |
| PATCH | /api/v1/projects/:projectId | Update project | Admin |
| DELETE | /api/v1/projects/:projectId | Archive project | Admin |

### User Story Endpoints

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | /api/v1/projects/:projectId/stories | List stories | Viewer |
| POST | /api/v1/projects/:projectId/stories | Create story | Member |
| GET | /api/v1/projects/:projectId/stories/:storyId | Get story + tasks | Viewer |
| PATCH | /api/v1/projects/:projectId/stories/:storyId | Update story | Member |
| DELETE | /api/v1/projects/:projectId/stories/:storyId | Archive story | Member |

### Task Endpoints

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | /api/v1/projects/:projectId/stories/:storyId/tasks | List tasks | Viewer |
| POST | /api/v1/projects/:projectId/stories/:storyId/tasks | Create task | Member |
| GET | /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId | Get task | Viewer |
| PATCH | /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId | Update task | Member |
| DELETE | /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId | Archive task | Member |

### Kanban, Members, Activity, Notifications, Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/projects/:projectId/kanban | Tasks grouped by status columns |
| GET | /api/v1/projects/:projectId/members | List project members |
| POST | /api/v1/projects/:projectId/members | Invite member by email |
| PATCH | /api/v1/projects/:projectId/members/:userId | Update member role |
| DELETE | /api/v1/projects/:projectId/members/:userId | Remove member |
| GET | /api/v1/projects/:projectId/activity | Paginated activity feed |
| GET | /api/v1/notifications | User's notifications |
| PATCH | /api/v1/notifications/:id/read | Mark notification read |
| POST | /api/v1/notifications/read-all | Mark all read |
| GET | /api/v1/search?q=... | Global search |

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "fields": [{ "path": ["body", "email"], "message": "Invalid email" }],
    "requestId": "req-1"
  }
}
```

Standard error codes: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, KEY_TAKEN, EMAIL_TAKEN, INVALID_CREDENTIALS, INTERNAL_ERROR.

---

## 5. Database Schema

SprintGrid uses SQLite through Prisma ORM. The schema is defined in prisma/schema.prisma.

### Entity Relationship Diagram

```
User
  +-- Session (1:N)        - cookie-based auth sessions
  +-- Project (1:N)        - owned projects
  +-- Membership (1:N)     - project memberships with roles
  +-- UserStory (1:N)      - assigned stories
  +-- Task (1:N)           - assigned tasks
  +-- ActivityLog (1:N)    - actions performed
  +-- Notification (1:N)   - received notifications

Project
  +-- Membership (1:N)     - team members
  +-- UserStory (1:N)      - requirements
  +-- ActivityLog (1:N)    - audit trail

UserStory
  +-- Task (1:N)           - implementation steps
  +-- ActivityLog (1:N)

Task
  +-- ActivityLog (1:N)

Job (standalone)           - background worker queue
```

### Models Summary

| Model | Fields | Key Constraints |
|-------|--------|-----------------|
| User | id, email (unique), name, passwordHash, timestamps | Email uniquely indexed |
| Session | id, tokenHash (unique), userId (FK), expiresAt, revokedAt | Index on [userId, expiresAt] |
| Project | id, name, key (unique), description, archived, ownerId (FK), timestamps | Index on [ownerId, archived] |
| Membership | id, projectId (FK), userId (FK), role (enum), createdAt | Unique on [projectId, userId] |
| UserStory | id, projectId (FK), assigneeId (FK nullable), title, description, acceptanceCriteria, status (enum), priority (enum), storyPoints, position, archived, timestamps | Index on [projectId, status, position] |
| Task | id, storyId (FK), assigneeId (FK nullable), title, description, status (enum), priority (enum), dueDate, position, archived, timestamps | Index on [storyId, status, position], [dueDate, status] |
| ActivityLog | id, projectId (FK), actorId (FK nullable), storyId (FK nullable), taskId (FK nullable), action, summary, createdAt | Index on [projectId, createdAt] |
| Notification | id, userId (FK), type, title, body, readAt, createdAt | Index on [userId, readAt, createdAt] |
| Job | id, type, payload (JSON), status (enum), attempts, maxAttempts, availableAt, startedAt, completedAt, lastError, timestamps | Index on [status, availableAt] |

### Cascade Rules

- Deleting a User cascades to Sessions, Memberships; sets null on assigned Stories/Tasks.
- Deleting a Project cascades to Memberships, UserStories, ActivityLogs.
- Deleting a UserStory cascades to Tasks and related ActivityLogs.

### Indexing Strategy (10 indexes)

1. User.email - unique index for login lookup
2. Session [userId, expiresAt] - fast session validation
3. Project [ownerId, archived] - owner project listing
4. Membership [userId, projectId] - membership check
5. UserStory [projectId, status, position] - project board sorting
6. UserStory [assigneeId, status] - assigned stories lookup
7. Task [storyId, status, position] - story task listing
8. Task [assigneeId, status] - assigned tasks lookup
9. Task [dueDate, status] - overdue detection worker
10. Job [status, availableAt] - worker queue polling

---

## 6. Design Decisions and Tradeoffs

### ADR-001: TypeScript npm Workspaces Monorepo

Context: The project needs a backend API, frontend SPA, and shared types.
Decision: Use npm workspaces to organise apps/api, apps/web, and packages/shared.
Tradeoff: Slightly more complex build setup, but unified development toolchain, shared linting/formatting, and easy cross-project type sharing.

### ADR-002: SQLite Instead of PostgreSQL

Context: Target audience is 3-10 user teams. PostgreSQL adds deployment complexity.
Decision: Use SQLite - zero-config, file-based, runs in-process with no network overhead.
Tradeoff: Single-writer limitation. Acceptable for small teams. Prisma schema is database-agnostic, so migration to PostgreSQL requires only changing the datasource provider.

### ADR-003: Fastify Instead of Express

Context: Express lacks native async/await error catching and has a slower router.
Decision: Use Fastify for its built-in async support, fast routing, and plugin architecture.
Tradeoff: Smaller ecosystem than Express, but Fastify has excellent plugin support for cookies, CORS, Helmet, rate limiting, and Swagger.

### ADR-004: Cookie-Based Sessions Instead of JWT

Context: JWT stored in localStorage is vulnerable to XSS. Refresh token rotation adds complexity.
Decision: Use HttpOnly, SameSite=Lax cookies with SHA-256-hashed tokens stored in the database.
Tradeoff: Requires database lookup per request, but with SQLite's in-process nature, this adds negligible latency. Major security gain: cookies cannot be read by JavaScript.

### ADR-005: Database-Backed Job Worker Instead of Redis/BullMQ

Context: A genuine asynchronous background process is required.
Decision: Use the SQLite Job table as the queue. Worker polls every 15 seconds.
Tradeoff: Not as performant as Redis-backed queues, but zero additional infrastructure. Jobs persist across crashes. Retry with exponential backoff (30s x 2^attempts, capped at 1 hour). Failed jobs are preserved for debugging.

### ADR-006: TanStack Query Instead of Redux

Context: Almost all frontend state is server state (projects, stories, tasks).
Decision: Use TanStack Query for caching, refetching, and optimistic mutations.
Tradeoff: No global state store. Local UI state (modals, form fields) uses React useState. This matches the data-fetching-heavy nature of the app perfectly.

### ADR-007: Soft Delete (Archive) Instead of Hard Delete

Context: Users might accidentally delete stories or tasks.
Decision: All delete operations set archived: true rather than removing rows.
Tradeoff: Slightly more complex queries (must filter archived: false), but data is never permanently lost, and audit trails remain intact.

---

## 7. Security Considerations

### Password Security

- Argon2id hashing with parameters: memory 64 MiB, time cost 3 iterations, parallelism 4 threads.
- Login endpoint performs a dummy hash comparison when the email is not found, preventing user enumeration via timing attacks.
- Passwords are never logged (Pino redaction configured).

### Session Security

- 32-byte cryptographically random tokens generated via crypto.randomBytes.
- Tokens are SHA-256 hashed before database storage - a database leak does not compromise active sessions.
- Cookies are set with: HttpOnly (blocks JavaScript access), SameSite=Lax (prevents CSRF), Secure (in production), path=/.
- Logout revokes the session server-side (sets revokedAt).
- Expired/revoked sessions are rejected by the middleware.

### Authorization and IDOR Prevention

- Every API endpoint checks project membership before allowing access.
- Hierarchical verification: a Task must belong to its Story, which must belong to the specified Project.
- Role-based access: creating resources requires at least MEMBER role; project modification requires ADMIN/OWNER.
- Clients cannot access resources merely by knowing or guessing IDs.

### HTTP Security Headers (Helmet)

- Content-Security-Policy: Blocks cross-origin scripts, iframes, and inline execution.
- X-Content-Type-Options: nosniff - prevents MIME-type sniffing.
- Referrer-Policy: strict-origin-when-cross-origin.
- X-Frame-Options: DENY - prevents clickjacking.

### Input Validation

- Every API endpoint validates inputs using Zod schemas before database queries.
- Invalid structures are rejected with 400 Bad Request.
- Uses Prisma's parameterised queries - no raw SQL, preventing SQL injection.

### Rate Limiting

- Global rate limit: 120 requests per IP per minute.
- Test environment allowlists 127.0.0.1.

### CORS

- Origin restricted to the known frontend URL (WEB_ORIGIN).
- No wildcard origins with credentials.

### Logging

- Structured JSON logging via Pino.
- Sensitive fields automatically redacted: req.headers.cookie, req.headers.authorization, req.body.password, req.body.passwordHash.
- Internal errors return generic messages; stack traces are never exposed to clients.

---

## 8. AI Usage Disclosure

This project was developed with the assistance of Antigravity (Google DeepMind), an AI agentic coding assistant.

### What AI Assisted With

- Code generation: Route handler scaffolding, React component creation, Prisma schema modelling.
- Debugging: Identifying TypeScript type errors, fixing API response shapes, resolving import paths.
- Test generation: E2E test flow structure, API integration test scaffolding.
- Documentation: Formatting README, API specification tables, ADR documentation.
- Design iteration: Tailwind CSS styling adjustments, responsive layout tuning.
- Refactoring: Extracting shared middleware patterns, consolidating error handling.

### What I (the Developer) Was Responsible For

- Architecture decisions: Choosing SQLite, Fastify, cookie-based sessions, the database-backed job worker approach.
- Security design: Argon2id configuration, session token hashing, IDOR prevention patterns, role-based authorization.
- Domain modelling: The Project -> UserStory -> Task hierarchy, membership roles, activity log schema.
- Validation and review: Every generated piece of code was reviewed, tested, and validated for correctness.
- Final engineering judgment: Tradeoff decisions, dependency choices, what to include vs. what to defer.

AI tools are productivity multipliers, but the developer remains accountable for architecture, security, correctness, and final quality.

---

## 9. What I Would Improve or Build Next

Given more time, these are the areas I would prioritise:

### High Priority

1. Comprehensive E2E Test Suite: Expand Playwright tests to cover all flows - project archiving, member role changes, Kanban drag-and-drop, notification interactions. Run across Chromium, Firefox, and WebKit.
2. Accessibility Audit: Integrate axe-core into E2E tests (the dependency is already installed). Add proper ARIA labels to modals, improve keyboard navigation on the Kanban board, ensure full WCAG 2.1 AA compliance.
3. Story-Kanban Sync: When a User Story's status is changed, automatically update the default status for new tasks created under it, improving workflow consistency.
4. Real-Time Updates: Add WebSocket or Server-Sent Events so team members see changes live without page refresh (task status changes, new stories, notifications).

### Medium Priority

5. File Attachments: Allow attaching files/images to tasks and stories (use a local upload directory or S3-compatible storage).
6. Sprint Planning: Add Sprint/Iteration concept - group stories into time-boxed sprints with burndown charts.
7. User Profile Page: Allow users to update their name, change password, and view their assigned work across all projects.
8. Advanced Filtering: Add filter/sort controls on the dashboard and project pages - filter by status, priority, assignee, due date range.
9. Email Notifications: Extend the notification system to send actual emails (via SMTP/SendGrid) for task assignments and overdue alerts.

### Polish

10. Dark/Light Theme Toggle: The current design is dark-only. Add a theme switcher with light mode support.
11. Onboarding Flow: A guided tour for new users explaining the Project -> Story -> Task workflow.
12. Export/Import: Export project data as JSON or CSV for backup and migration.
13. Mobile-Optimised Kanban: While the current board scrolls horizontally, a mobile-specific UX with swipeable columns would improve the experience.
14. Production Deployment Guide: Docker Compose configuration, Nginx reverse proxy setup, systemd service files for the worker process.

---

## 10. Demo Credentials

After running the seed script, the following accounts are available:

| Email | Password | Notes |
|-------|----------|-------|
| balavignesh10thactive2020@gmail.com | Bala@2005 | Primary demo account (Owner) |
| arun@sprintgrid.local | Password123! | Team member |
| jane@sprintgrid.local | Password123! | Team member |
| bob@sprintgrid.local | Password123! | Team member |

### Quick Demo Walkthrough

1. Open http://localhost:5180 (or 5173) -> Landing page
2. Click "Get Started" or "Sign in"
3. Login with the primary demo account credentials
4. Dashboard -> See project cards with member avatars and story counts
5. Click a project -> Project Page with:
   - Progress bar showing completion percentage
   - User Stories list with status dropdowns and delete buttons
   - Team section with Add Member button
   - Activity feed timeline
6. Click "Kanban" -> Drag-and-drop task board
7. Press Ctrl+K -> Global search / command palette
8. Click Bell icon -> Notification panel
9. Click "+ Add story" -> Create new user story modal

---

## Repository Structure Summary

```
Files:   ~45 source files across API and Web
Lines:   ~4,500 lines of TypeScript/TSX (excluding node_modules)
Models:  9 database models with 10 strategic indexes
Routes:  8 route modules covering 25+ API endpoints
Tests:   4 unit/integration tests + 1 E2E test file (12 assertions)
Docs:    5 documentation files + this submission document
```

---

Document generated for KPIT Full-Stack Intern Assignment submission.
SprintGrid - Plan clearly. Execute confidently. Ship together.
