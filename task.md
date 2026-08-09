# SprintGrid — Task Tracker

## Phase A — Install Dependencies
- [x] Install API deps: argon2, @fastify/swagger, @fastify/swagger-ui
- [x] Install web deps: react-router-dom, tailwindcss, @tailwindcss/vite, radix-ui, react-hook-form, zod, dnd-kit, motion, cmdk

## Phase B — Backend API
- [x] lib/prisma.ts
- [x] lib/password.ts (Argon2id)
- [x] lib/session.ts
- [x] lib/activity.ts
- [x] middleware/authenticate.ts
- [x] middleware/authorize.ts
- [x] routes/auth/index.ts (register, login, logout, me)
- [x] routes/projects/index.ts
- [x] routes/stories/index.ts
- [x] routes/tasks/index.ts
- [x] routes/members/index.ts
- [x] routes/activity/index.ts
- [x] routes/notifications/index.ts
- [x] routes/search/index.ts (Secure query endpoint)
- [x] worker.ts
- [x] Update app.ts to register all routes

## Phase C — Frontend SPA
- [x] Configure Tailwind + vite.config
- [x] Update index.css (Tailwind + tokens)
- [x] api/ — typed fetch client with search endpoint
- [x] types/ — shared TypeScript types (extended UserStory and Task relations)
- [x] pages/LandingPage.tsx (custom brand logo integrated)
- [x] pages/LoginPage.tsx (custom brand logo + default credentials hint callout)
- [x] pages/RegisterPage.tsx (custom brand logo)
- [x] pages/DashboardPage.tsx
- [x] pages/ProjectPage.tsx
- [x] pages/KanbanPage.tsx
- [x] components/layout/ (Sidebar, TopBar, Breadcrumbs, AppShell custom search triggers)
- [x] components/kanban/ (Board, Column, Card)
- [x] components/command/CommandPalette.tsx (Ctrl+K search overlay panel)
- [x] components/notifications/
- [x] App.tsx — React Router root
- [x] main.tsx — updated

## Phase D — Seed + Docs + Testing
- [x] Enhanced seed.ts with real Argon2id hashes, team members, and stories
- [x] docs/api.md
- [x] docs/architecture.md
- [x] docs/database.md
- [x] docs/decisions.md
- [x] docs/security.md
- [x] README.md
- [x] Vitest integration tests (search endpoints integration check)
- [x] Playwright E2E integration tests (full user journey verified on port 5180)
