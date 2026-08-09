# SprintGrid — Agile Project Workspace

> Plan clearly. Execute confidently. Ship together.

SprintGrid is a full-stack, production-minded agile project management application designed for small engineering teams (3–10 users). It organizes work into a clean hierarchy: **Project** $\rightarrow$ **User Story** $\rightarrow$ **Task**, and features a Kanban-style dashboard, cursor-paginated activity logs, automatic in-app notifications, and a database-backed background job worker.

---

## Technical Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query (v5), React Router (v7), React Hook Form, Zod, dnd-kit, Lucide React.
- **Backend:** Node.js, TypeScript, Fastify, Prisma ORM, Argon2id.
- **Database:** SQLite (file-based).
- **Testing:** Vitest (API & Unit), Playwright (E2E & Browsers), axe-core.
- **Background Processing:** Database-backed Job Worker process with optimistic locking, exponential backoff, and failure state management.

---

## Features

1. **Authentication:** HttpOnly, SameSite secure cookie session validation. Argon2id hashed passwords with timing attack resistance.
2. **Project CRUD:** Create and archive project workspaces. Short keys are auto-generated from project names.
3. **User Stories:** Break projects down into requirements with statuses, priority tags, and story points.
4. **Tasks:** Add multiple tasks to each user story. Complete tasks, change statuses, assign due dates, and update task assignees.
5. **Kanban Board:** Drag and drop tasks between: *Backlog*, *Todo*, *In Progress*, *Blocked*, *In Review*, and *Done*. Features optimistic UI updates and auto-rollback on API failure.
6. **Activity Log:** A paginated project changes feed (audit trail).
7. **Notifications:** Real-time badge indicators and list panel for invited members, overdue tasks, and digests.
8. **Asynchronous Worker:** Runs task reminders, daily activity digest generators, and overdue detection.

---

## Architectural Decisions & Tradeoffs (ADRs)

Detailed documentation is available under the `docs/` directory:
- [Architecture Overview](docs/architecture.md)
- [Database Schema Specification](docs/database.md)
- [API Spec Reference](docs/api.md)
- [Security Auditing & Hardening Controls](docs/security.md)
- [Architectural Decision Records (ADRs)](docs/decisions.md)

### Key Decisions:
- **Why SQLite?** SQLite provides zero-latency, local disk operations with zero setup, perfect for small team scales. If scaling limits are hit, the Prisma schema can be easily migrated to PostgreSQL.
- **Why Fastify?** Fastify router matching is significantly faster than Express and includes built-in async/await error handling.
- **Why a Database-backed Worker?** Rather than running complex infra like Redis/Sidekiq, a simple DB-backed worker maintains transactional integrity and ensures job scheduling state is persisted inside `dev.db`.
- **Why TanStack Query?** It manages loading states, caching, and optimistic rollbacks out of the box, reducing boilerplate state management code.

---

## Getting Started

### 1. Prerequisites
- **Node.js:** $\ge$ 20.19.0
- **npm:** $\ge$ 10.0.0

### 2. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Key configuration settings inside `.env`:
- `DATABASE_URL`: Path to the database sqlite file (`file:./dev.db`)
- `SESSION_SECRET`: Cryptographically secure session secret (min. 32 characters)
- `SESSION_TTL_SECONDS`: Session duration (default: 604800 / 7 days)
- `RATE_LIMIT_MAX`: Request limit per IP per minute (default: 120)

### 3. Database Initialization & Seeding
Install monorepo dependencies, run database migrations, and seed the demo account:
```bash
# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate dev --schema prisma/schema.prisma

# Seed demo data
npm run db:seed --workspace=@sprintgrid/api
```
*Note: Seeding creates demo users including `balavignesh10thactive2020@gmail.com` (password: `Bala@2005`) and team members `arun@sprintgrid.local`, `jane@sprintgrid.local`, `bob@sprintgrid.local` (password: `Password123!`).*

### 4. Running the Application
Launch the services simultaneously in three terminal shells:
```bash
# 1. Start Fastify API (runs at http://localhost:3000)
npm run dev:api

# 2. Start Vite Frontend (runs at http://localhost:5173)
npm run dev:web

# 3. Start Background Worker
npm run dev:worker
```

---

## Verification & Testing

### 1. Run Static Code Quality Checks
```bash
# Typecheck
npm run typecheck

# Lint (ESLint)
npm run lint

# Format (Prettier)
npm run format
```

### 2. Run API Integration Tests
Runs the Fastify route injection unit/integration test suite:
```bash
npm run test
```

### 3. Run Playwright E2E Tests
E2E browser automated verification testing registration, login, projects, stories, task assignment, notifications, activity logs, and logout:
```bash
# Install Playwright browser engines (if first time)
npx playwright install

# Run E2E tests
npm run test:e2e
```

---

## AI Usage Transparency
This codebase was developed with the assistance of Antigravity, an AI agentic coding assistant designed by Google DeepMind. AI was utilized for schema verification, layout responsiveness adjustments, route handler generation, E2E test structures, and documentation formatting. Technical judgment, database constraints, auth sessions, and worker locking mechanisms were engineered and validated for correctness.
