# Architecture Decision Records (ADR)

This file documents the key technical decisions made during the design and development of SprintGrid.

---

## ADR-001: TypeScript npm Workspace
- **Context:** The project requires a backend API, frontend SPA, and shared typings. We need an integrated development structure without managing multiple Git repositories or complex artifact publishing.
- **Decision:** Use npm workspaces to split the monorepo into `apps/api` (Fastify), `apps/web` (Vite/React), and `packages/shared` (Zod schemas and contracts).
- **Consequences:** Easier code sharing, unified testing/typechecking routines, and zero runtime cross-origin mapping complications when building.

---

## ADR-002: Same-origin Production Baseline
- **Context:** Storing authentication tokens in local storage exposes the app to XSS token theft. CORS preflight requests add latency to every API call.
- **Decision:** Build the backend so it serves both static assets (frontend) and REST APIs from the same production origin, utilizing `HttpOnly` cookie-based session identifiers.
- **Consequences:** Eliminates XSS session token access, prevents CSRF via `SameSite=Lax` cookie properties, and avoids permissive CORS configuration hazards.

---

## ADR-003: SQLite instead of PostgreSQL
- **Context:** We are targetting small teams of 3–10 users with low-to-medium write volume.
- **Decision:** Use SQLite as the persistent database engine.
- **Consequences:** SQLite runs in-process with zero network overhead for database operations. SQLite's write-ahead log (WAL) mode enables concurrent reads and fast writes. It avoids database server management tasks and fits easily within typical project budgets. If scaling limits are hit, migrations can easily port the schema to PostgreSQL.

---

## ADR-004: Fastify instead of Express
- **Context:** Node.js Express is popular but has a slow router and does not natively support async/await error catching without wrapper middleware.
- **Decision:** Use Fastify for the API server framework.
- **Consequences:** Native async/await support, rapid router matching, standard schema validation integration (Zod), and structured JSON logging.

---

## ADR-005: Database-backed Job Worker instead of Redis
- **Context:** An asynchronous background worker is required. Using Redis or RabbitMQ adds system dependency overhead and deploy complexity.
- **Decision:** Build a database-backed worker using a `Job` table in SQLite with optimistic locking.
- **Consequences:** Consistent transactions between state mutations and job scheduling. If the main server crashes, scheduled jobs persist in the SQLite DB file. Retries, exponential backoffs, and stalled job recovery are simple to implement using SQL queries.

---

## ADR-006: TanStack Query instead of Redux
- **Context:** Frontend state in project workspaces is almost entirely server state (projects, stories, tasks). Redux is verbose and doesn't handle caching or automatic background refreshing cleanly.
- **Decision:** Use TanStack Query for server state cache management, leaving standard React `useState` for local UI state (modals, active fields).
- **Consequences:** Automatic out-of-the-box caching, refetching on window focus, loading state handling, and simple optimistic mutations with rollbacks.
