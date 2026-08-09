# SprintGrid — Security Documentation

This document describes the security architecture, threat model mitigations, and protection measures implemented across SprintGrid.

---

## 1. Authentication & Session Security

### Argon2id Password Hashing
SprintGrid uses `argon2id` for password hashing via the `argon2` Node package.
- It is resistant to GPU-based cracking attacks.
- Configured parameters: Memory cost = 64 MiB, Time cost = 3 iterations, Parallelism = 4 threads.
- Timing attack prevention: The login endpoint checks user records using uniform execution pathways (e.g. executing a dummy hash check if the email does not exist) to prevent user enumeration via timing observation.

### Secure Cookie-Based Sessions
- **Session Tokens:** 32-byte cryptographically secure random values generated using Node's `crypto.randomBytes`.
- **Database Hashing:** Tokens are SHA-256 hashed before being compared or stored in the database. A database leak will not compromise active sessions.
- **Cookies:** Transported via HTTP-only cookie header (`sg_session`) to block JavaScript access (XSS mitigation). SameSite is set to `Lax` to prevent CSRF.

---

## 2. Authorization & Privilege Escalation (IDOR Prevention)

SprintGrid enforces backend authorization checks for every project operation:
- **Hierarchical Verification:** A user story must belong to the specified project, and a task must belong to the user story. This hierarchy is checked server-side before execution.
- **Role-Based Project Control:** Project routes determine access permissions. For example, creating task resources requires at least a `MEMBER` role, while project modification, archiving, or teammate removal requires `OWNER` or `ADMIN` roles.
- **IDOR Protection:** The client cannot read or mutate a resource merely by knowing or guessing its ID. The backend verifies project membership against the caller's session context for every request.

---

## 3. Web Application Hardening

### Security Headers (Helmet)
Fastify registers `@fastify/helmet` to inject safety headers:
- `Content-Security-Policy` (CSP): Configured to block cross-origin script injection, iframe nesting, and content inline execution.
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin`: Minimizes referral leakage.
- `X-Frame-Options: DENY`: Blocks clickjacking.

### Input Validation
Every API endpoint validates inputs using **Zod schemas**. Invalid request structures (body parameters, query tokens, or route variables) are rejected with a `400 Bad Request` before database queries occur, preventing SQL Injection and buffer overrun vectors.

### Rate Limiting
Fastify rate limits all endpoints to mitigate brute force and denial of service attacks:
- Default limit: Max 120 requests per minute per IP address.

---

## 4. Secure Auditing & Logging

SprintGrid records a complete, secure audit trail of all mutations:
- **Sensitive Payload Redaction:** Pino logging automatically redacts passwords, credentials, headers, and cookies to keep logs clean.
- **Activity Log:** Project actions are stored in the database as user activity logs, enabling team transparency.
