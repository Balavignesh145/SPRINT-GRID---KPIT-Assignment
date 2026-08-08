# AGENTS.md

# SprintGrid — Engineering Constitution

## 1. Mission

You are the primary software engineer responsible for building and maintaining **SprintGrid — Agile Project Workspace**.

SprintGrid is a production-minded full-stack agile project-management application designed for small teams of approximately 3–10 users.

The fundamental domain hierarchy is:

Project → User Story → Task

The application must demonstrate:

* strong product thinking
* clean architecture
* maintainable code
* secure implementation
* responsive UX
* excellent usability
* reliable asynchronous processing
* automated testing
* browser verification
* accessibility
* clear API design
* clear database design
* professional documentation

The objective is not to produce a generic CRUD application.

The objective is to produce a polished, credible engineering product suitable for evaluation by professional software engineers.

---

# 2. Non-Negotiable Engineering Principles

Always prioritize:

1. Correctness
2. Security
3. Maintainability
4. Simplicity
5. Performance
6. Accessibility
7. User experience
8. Testability
9. Documentation

Do not optimize for lines of code.

Do not optimize for the number of dependencies.

Do not add technology merely because it is popular.

Prefer the simplest architecture that fully satisfies the requirement.

---

# 3. Product Identity

Product:

SprintGrid

Full name:

SprintGrid — Agile Project Workspace

Tagline:

Plan clearly. Execute confidently. Ship together.

Primary audience:

* small engineering teams
* startup teams
* student project teams
* technical leads
* project coordinators
* development teams

Target team size:

3–10 users.

Core workflow:

Plan → Break Down → Assign → Execute → Review → Complete

---

# 4. Core Domain Model

The application MUST preserve:

Project
└── User Story
└── Task

A User Story MUST belong to a Project.

A Task MUST belong to a User Story.

Do not allow orphaned stories or tasks.

Do not allow a client to arbitrarily associate a task or story with resources the authenticated user does not have access to.

All relationship validation must happen server-side.

---

# 5. Required Features

The application must include:

## Authentication

* registration
* login
* logout
* session management
* current-user endpoint
* password hashing
* session expiration
* protected routes

## Projects

* create
* view
* update
* archive
* list
* search/filter

## User Stories

* create
* view
* update
* delete/archive where appropriate
* status
* priority
* story points
* acceptance criteria
* assignee
* ordering

## Tasks

* create
* view
* update
* delete/archive where appropriate
* status
* priority
* assignee
* due date
* ordering

## Workflow

Provide Kanban-style workflow.

At minimum:

* Backlog
* Todo
* In Progress
* Blocked
* In Review
* Done

## Collaboration/productivity

Include:

* activity log
* notifications
* search
* command palette
* keyboard shortcuts
* useful empty states
* loading states
* error states
* toast notifications
* undo where appropriate
* breadcrumbs
* responsive navigation

---

# 6. Async Requirement

The application MUST contain a genuine background workflow.

Implement a persistent database-backed job system.

Recommended use cases:

* task reminders
* overdue task detection
* daily project digest
* notification generation

Do not fake asynchronous behavior with arbitrary setTimeout calls.

The background worker must have persistent state.

The Job model should track:

* id
* type
* payload
* status
* attempts
* maxAttempts
* availableAt
* startedAt
* completedAt
* lastError
* createdAt
* updatedAt

Implement retry handling with exponential backoff.

Failed jobs must eventually enter a terminal FAILED state after the configured maximum attempts.

The system must preserve useful failure information without exposing sensitive data.

---

# 7. Technology Stack

Use the following stack unless repository constraints make it technically unreasonable.

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Motion for React
* TanStack Query
* React Hook Form
* Zod
* dnd-kit
* Lucide React

## Backend

* Node.js
* TypeScript
* Fastify
* Prisma
* SQLite
* OpenAPI / Swagger
* Pino
* Argon2id

## Testing

* Vitest
* React Testing Library
* Playwright
* axe-core

## Quality

* TypeScript strict mode
* ESLint
* Prettier

Do not add Redux, Redis, Kafka, GraphQL, microservices, Kubernetes, Elasticsearch, or other infrastructure unless a concrete architectural requirement justifies it.

---

# 8. Database Rules

Use SQLite.

Use Prisma for database access.

The schema should include at minimum:

* User
* Session
* Project
* Membership
* UserStory
* Task
* ActivityLog
* Notification
* Job

Use:

* primary keys
* foreign keys
* unique constraints
* indexes
* timestamps
* explicit relationship rules

Important indexes should cover common lookups such as:

* user email
* project creator
* project membership
* story project
* story status
* task story
* task status
* task assignee
* task due date

Do not commit local database files containing runtime data.

Use migrations.

Provide seed data for demonstration.

---

# 9. Authentication Rules

Do NOT store authentication tokens in localStorage.

Prefer secure cookie-based sessions.

Production cookies should use:

* HttpOnly
* Secure
* SameSite
* appropriate expiration

Password storage MUST use Argon2id.

Never store plaintext passwords.

Never log:

* passwords
* session tokens
* cookies
* secrets
* sensitive authentication information

Logout must invalidate the session.

Protected endpoints must verify authentication.

---

# 10. Authorization Rules

Authentication is not authorization.

Every protected resource must verify that the authenticated user has permission to access the resource.

Never trust client-provided:

* userId
* role
* projectId
* assigneeId
* membership
* permissions

Perform authorization checks on the server.

Prevent IDOR-style access.

A user must not be able to access another project's stories or tasks simply by changing an ID in the URL.

---

# 11. API Rules

Use versioned REST APIs:

/api/v1

Use consistent naming.

Prefer:

GET
POST
PATCH
DELETE

Use explicit request schemas.

Validate:

* path parameters
* query parameters
* request bodies

Use consistent response structures.

Successful responses should follow a predictable format.

Errors should contain:

* machine-readable error code
* human-readable message
* field errors when applicable
* request/correlation ID where useful

Never expose stack traces in production.

Document APIs using OpenAPI.

---

# 12. API Architecture

Prefer:

Request
↓
Validation
↓
Authentication
↓
Authorization
↓
Controller/Route
↓
Service
↓
Repository/Prisma
↓
Database

Do not place all business logic directly in route handlers.

Avoid giant files.

Separate responsibilities clearly.

---

# 13. Frontend Architecture

Use feature-oriented organization.

Prefer a structure similar to:

apps/web/src/

* app/
* pages/
* components/
* features/
* hooks/
* api/
* lib/
* types/
* styles/

Keep reusable UI primitives separate from domain-specific components.

Avoid unnecessary global state.

Use TanStack Query for server state.

Use local React state for local UI state.

Use Context only when it provides clear value.

Do not introduce Redux unless a demonstrated requirement appears.

---

# 14. Frontend Design System

The visual design should feel like a professional engineering SaaS application.

Do NOT make it look like a generic AI-generated website.

Avoid:

* excessive gradients
* generic purple SaaS themes
* excessive glassmorphism
* unnecessary 3D
* excessive rounded cards
* oversized typography
* excessive animation
* decorative elements without purpose
* emoji as primary UI icons

Prefer:

* strong typography
* information density
* whitespace
* subtle borders
* restrained shadows
* consistent spacing
* semantic colors
* meaningful interactions
* clear hierarchy

Use a design token system.

---

# 15. Color Tokens

Base:

Background: #F8FAFC
Surface: #FFFFFF
Surface subtle: #F1F5F9
Border: #E2E8F0

Text:

Primary: #0F172A
Secondary: #475569
Muted: #64748B

Brand:

Primary: #2563EB
Primary hover: #1D4ED8
Accent: #7C3AED

Semantic:

Success: #16A34A
Warning: #D97706
Danger: #DC2626
Info: #0891B2

Do not scatter raw colors throughout the application.

Use semantic tokens.

---

# 16. Animation Rules

Use Motion for React.

Animation must communicate state or interaction.

Appropriate uses:

* page transitions
* modal entrance/exit
* drag/drop
* status changes
* hover/press feedback
* layout transitions
* notifications
* skeleton states

Avoid:

* constantly moving backgrounds
* excessive bouncing
* decorative animations
* slow transitions
* animation that interferes with usability

Respect prefers-reduced-motion.

Prefer transform and opacity-based animations.

---

# 17. Responsive Design

The application MUST be responsive.

Verify at:

* 320px
* 375px
* 390px
* 768px
* 1024px
* 1280px
* 1440px
* 1920px

Mobile is not simply a smaller desktop version.

Use appropriate responsive transformations.

Examples:

Desktop sidebar
→
Mobile drawer

Large table
→
Responsive cards where appropriate

Multi-column form
→
Single-column mobile layout

Kanban
→
Usable horizontal interaction on smaller screens

---

# 18. Accessibility

Target WCAG 2.1 AA practices.

Verify:

* keyboard navigation
* visible focus
* semantic HTML
* labels
* ARIA only where necessary
* color contrast
* dialogs
* form errors
* screen-reader names
* reduced motion
* sufficient touch targets

Use automated accessibility tests, but do not assume automated checks cover everything.

---

# 19. Performance

Optimize for:

* fast first load
* low JavaScript overhead
* minimal unnecessary renders
* efficient API queries
* appropriate caching
* lazy loading where beneficial
* efficient images/assets
* responsive interactions

Avoid premature optimization.

Measure before making complex optimizations.

---

# 20. TanStack Query Rules

Use TanStack Query for server state.

Use appropriate:

* query keys
* caching
* invalidation
* stale times
* mutations
* optimistic updates
* rollback

For Kanban status changes:

User drag
↓
Optimistic UI update
↓
API request
↓
Success → retain
Failure → rollback + notify

Do not leave the UI in a false state after an API failure.

---

# 21. Search

Provide global search.

Recommended shortcut:

Ctrl/Cmd + K

Search across:

* projects
* stories
* tasks
* users

The command palette should also support useful navigation/actions.

---

# 22. Activity Log

Record important mutations.

Examples:

* project created
* story created
* task created
* task assigned
* status changed
* priority changed
* task reordered
* task completed
* project archived
* member added

Activity entries should contain enough information to understand what happened.

Do not store secrets in activity logs.

---

# 23. Error Handling

Every important operation must have:

* loading state
* success state
* failure state
* empty state where applicable

Do not show generic:

"Something went wrong"

when a useful recovery message is possible.

Do not expose backend stack traces.

Use centralized error handling.

---

# 24. Security Headers

Implement appropriate production security headers.

Consider:

* Content Security Policy
* X-Content-Type-Options
* Referrer-Policy
* frame protections
* Permissions Policy
* secure cookies

Do not blindly copy security headers without understanding their effect on the application.

---

# 25. CORS

Restrict CORS to the known frontend origin(s).

Do not use wildcard origins with credentials.

Development and production configuration should be explicit.

---

# 26. Rate Limiting

Rate-limit sensitive endpoints, especially:

* login
* registration
* session operations
* expensive searches
* potentially abusive mutation endpoints

Do not apply arbitrary aggressive limits that make normal usage difficult.

Document important limits.

---

# 27. Logging

Use structured logging.

Include useful metadata such as:

* timestamp
* request ID
* route
* status
* duration
* error code

Do not log:

* passwords
* session tokens
* cookies
* authentication secrets
* sensitive payloads

Use different logging levels for development and production.

---

# 28. Testing Requirements

Use:

* unit tests
* integration/API tests
* E2E tests
* accessibility tests

Critical E2E flow:

Register
→ Login
→ Create Project
→ Create Story
→ Create Task
→ Assign Task
→ Move Task
→ Verify Activity
→ Verify Notification
→ Logout

The complete flow must pass.

---

# 29. Browser Verification

Use Playwright.

Verify:

* Chromium
* Firefox
* WebKit

Also verify mobile/tablet/desktop viewports.

Do not claim browser verification unless it was actually executed.

---

# 30. Security Verification

Before declaring the project complete, run appropriate checks including:

* dependency audit
* secret scanning
* authentication tests
* authorization tests
* invalid-input tests
* security header verification
* CORS verification
* cookie verification
* rate-limit verification
* production error behavior
* OWASP ZAP baseline scan where practical

Never claim "100% secure".

Report what was actually tested.

---

# 31. Documentation

Maintain:

README.md

docs/architecture.md
docs/database.md
docs/api.md
docs/security.md
docs/decisions.md

Documentation must stay synchronized with implementation.

If architecture changes, update documentation in the same task.

---

# 32. AI Usage

The project may use AI-assisted development.

Document honestly that AI tools were used for:

* code generation
* refactoring
* debugging
* test generation
* documentation assistance
* design iteration

The developer remains responsible for:

* architecture
* security decisions
* validation
* testing
* final code quality
* engineering decisions

Never blindly trust generated code.

---

# 33. Plan Mode Policy

Use Plan Mode for any change that is:

* architectural
* security-sensitive
* difficult to reverse
* cross-cutting
* likely to affect multiple modules

Examples:

* database schema
* authentication
* authorization
* API contract
* design system
* routing architecture
* async worker
* deployment
* major refactoring

Workflow:

Shift + Tab
→ Plan Mode
→ inspect repository
→ create implementation plan
→ review plan
→ approve/modify
→ execute
→ validate

For isolated and easy-to-revert changes, execute directly.

---

# 34. Task Isolation

Never implement unrelated improvements during a task.

If a task is:

"Implement project creation"

do not simultaneously:

* redesign authentication
* change database architecture
* rewrite unrelated components
* add random features

If you discover an unrelated issue:

1. Record it.
2. Determine severity.
3. Fix immediately only if it blocks correctness/security.
4. Otherwise defer it to the appropriate task.

---

# 35. Mid-Turn Steering

If implementation begins drifting from the established architecture, stop.

Do not continue generating more code on top of a bad direction.

Reassess:

* architecture
* requirements
* existing code
* tests
* security implications

Then correct course.

---

# 36. Dependency Policy

Before adding a dependency:

Ask:

1. Is it necessary?
2. Can the existing stack solve this cleanly?
3. Does it increase bundle size?
4. Does it introduce security risk?
5. Is it actively maintained?
6. Does it create architectural coupling?

Avoid dependencies for trivial functionality.

---

# 37. Database Migration Policy

Never modify production-like schema casually.

When changing schema:

1. Inspect current schema.
2. Use Plan Mode if the change is substantial.
3. Update Prisma schema.
4. Create migration.
5. Test migration.
6. Test existing functionality.
7. Update database documentation.

Never delete data simply to make a migration pass.

---

# 38. API Contract Policy

Treat public API contracts as stable interfaces.

Before changing:

* endpoint paths
* request shape
* response shape
* authentication behavior
* status codes

inspect all frontend consumers.

Update API documentation in the same task.

---

# 39. Git Policy

Make small, meaningful commits.

Preferred format:

feat:
fix:
refactor:
test:
docs:
security:
perf:
chore:

Examples:

feat: add project management
feat: implement story hierarchy
feat: add kanban workflow
feat: add background job worker
security: harden session authentication
test: add project workflow e2e coverage
docs: document async architecture

Do not create meaningless commits such as:

"changes"
"update"
"final"
"stuff"

---

# 40. Definition of Done

A task is not complete merely because code was written.

A task is complete when:

* implementation is complete
* TypeScript passes
* lint passes
* relevant tests pass
* application starts
* affected UI was browser-tested
* error states were considered
* loading states were considered
* responsive behavior was checked
* accessibility was considered
* security implications were reviewed
* documentation was updated
* Git diff was reviewed

---

# 41. Final Release Gate

Before final completion:

1. Install from a clean checkout.
2. Configure environment.
3. Run migrations.
4. Seed demo data.
5. Start application.
6. Run typecheck.
7. Run lint.
8. Run unit tests.
9. Run integration tests.
10. Run E2E tests.
11. Run accessibility checks.
12. Verify Chromium.
13. Verify Firefox.
14. Verify WebKit.
15. Verify responsive layouts.
16. Run dependency audit.
17. Run secret scan.
18. Verify security headers.
19. Verify authentication.
20. Verify authorization.
21. Verify async worker.
22. Force a job failure and verify retry behavior.
23. Verify production build.
24. Review README from a clean-user perspective.
25. Confirm no secrets/database artifacts are committed.

Only then declare the project complete.

---

# 42. Final Reporting

When completing a task, report:

## Changed

List files/features changed.

## Verified

List exact commands/tests/browser checks executed.

## Security

List security implications and checks.

## Documentation

List documentation updated.

## Remaining

List known issues or deferred improvements.

Never say "everything works" without evidence.
Never claim a test passed if it was not run.
Never claim browser verification if a browser was not actually used.
Never claim security verification without actual checks.
