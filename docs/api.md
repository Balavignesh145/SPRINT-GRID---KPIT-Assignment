# SprintGrid — API Specification v1

All API endpoints use the `/api/v1` prefix.

## Authentication & Session Management

SprintGrid uses secure cookie-based session management. Upon successful registration or login, the server sets a secure, HTTP-only cookie named `sg_session` containing a cryptographically secure token. The token is hashed using SHA-256 before storage in the database to prevent database leakage exploitation.

- **Authentication Cookie:** `sg_session`
- **Security Attributes:** `HttpOnly`, `SameSite=Lax`, `Secure` (production only), and expiration configured by `SESSION_TTL_SECONDS`.

---

## Error Response Format

All error responses from the API share a consistent JSON payload layout to simplify client integration:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of what went wrong.",
    "fields": [
      {
        "path": ["body", "email"],
        "message": "Invalid email address format"
      }
    ],
    "requestId": "req-1"
  }
}
```

### Standard Error Codes
- `UNAUTHENTICATED`: Missing, invalid, or expired session cookie.
- `FORBIDDEN`: User does not have sufficient project permissions (membership authorization check failed).
- `NOT_FOUND`: The requested project, story, or task does not exist or has been archived.
- `VALIDATION_ERROR`: Zod schema validation failed for path, query, or body parameters.
- `KEY_TAKEN`: The project key is already in use by another project.
- `EMAIL_TAKEN`: An account with that email is already registered.
- `INVALID_CREDENTIALS`: Password/email combo does not match.

---

## Endpoint Index

### 1. System Health
* `GET /api/v1/health` - Check API and server status. Returns a 200 OK block with current timestamp.

---

### 2. Authentication API
* `POST /api/v1/auth/register` - Register a new user and start session.
  * **Request Body:** `{ name, email, password }` (Password must be >= 8 chars)
  * **Response:** `201 Created` with User object. Set-Cookie: `sg_session`.
* `POST /api/v1/auth/login` - Authenticate credentials and start session.
  * **Request Body:** `{ email, password }`
  * **Response:** `200 OK` with User object. Set-Cookie: `sg_session`.
* `POST /api/v1/auth/logout` - Revoke current session.
  * **Request:** Auth cookie required.
  * **Response:** `200 OK`. Clear-Cookie: `sg_session`.
* `GET /api/v1/auth/me` - Get current authenticated user details.
  * **Request:** Auth cookie required.
  * **Response:** `200 OK` with User object.

---

### 3. Projects API
* `GET /api/v1/projects` - List active projects where the authenticated user is a member.
  * **Response:** `200 OK` with array of Project objects, owner details, membership counts, and active story count.
* `POST /api/v1/projects` - Create a new project. Author becomes the owner.
  * **Request Body:** `{ name, key, description? }` (Key: 2-8 uppercase letters/numbers)
  * **Response:** `201 Created` with Project details.
* `GET /api/v1/projects/:projectId` - Retrieve single project details.
  * **Response:** `200 OK` with Project object including members and story count.
* `PATCH /api/v1/projects/:projectId` - Update project details. Admin/Owner role required.
  * **Request Body:** `{ name?, description?, archived? }`
  * **Response:** `200 OK` with updated Project details.
* `DELETE /api/v1/projects/:projectId` - Archive (soft-delete) project. Admin/Owner role required.
  * **Response:** `200 OK` with `{ archived: true }`.

---

### 4. User Stories API
* `GET /api/v1/projects/:projectId/stories` - List active user stories under a project.
  * **Response:** `200 OK` with list of stories, their assignee, and task count.
* `POST /api/v1/projects/:projectId/stories` - Create a user story.
  * **Request Body:** `{ title, description?, status?, priority?, storyPoints?, assigneeId? }`
  * **Response:** `201 Created` with created UserStory.
* `GET /api/v1/projects/:projectId/stories/:storyId` - Get a specific story with all tasks.
  * **Response:** `200 OK` with story object including tasks.
* `PATCH /api/v1/projects/:projectId/stories/:storyId` - Update user story.
  * **Request Body:** `{ title?, description?, status?, priority?, storyPoints?, assigneeId?, position? }`
  * **Response:** `200 OK` with updated story.
* `DELETE /api/v1/projects/:projectId/stories/:storyId` - Soft-delete (archive) story.
  * **Response:** `200 OK` with `{ archived: true }`.

---

### 5. Tasks API
* `GET /api/v1/projects/:projectId/stories/:storyId/tasks` - List active tasks under a story.
  * **Response:** `200 OK` with array of Task objects.
* `POST /api/v1/projects/:projectId/stories/:storyId/tasks` - Create a task under a story.
  * **Request Body:** `{ title, description?, status?, priority?, assigneeId?, dueDate? }`
  * **Response:** `201 Created` with Task.
* `GET /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId` - Get task details.
  * **Response:** `200 OK` with Task object.
* `PATCH /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId` - Update task.
  * **Request Body:** `{ title?, description?, status?, priority?, assigneeId?, position?, dueDate? }`
  * **Response:** `200 OK` with updated Task.
* `DELETE /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId` - Soft-delete task.
  * **Response:** `200 OK` with `{ archived: true }`.

---

### 6. Kanban Board API
* `GET /api/v1/projects/:projectId/kanban` - Retrieve all active tasks grouped by Kanban status.
  * **Response:** `200 OK` with columns object:
    ```json
    {
      "data": {
        "BACKLOG": [...tasks],
        "TODO": [...tasks],
        "IN_PROGRESS": [...tasks],
        "BLOCKED": [...tasks],
        "IN_REVIEW": [...tasks],
        "DONE": [...tasks]
      }
    }
    ```

---

### 7. Team Members API
* `GET /api/v1/projects/:projectId/members` - List project members and their roles.
  * **Response:** `200 OK` with list of memberships, role, and joined date.
* `POST /api/v1/projects/:projectId/members` - Invite user to project by email.
  * **Request Body:** `{ email, role? }` (role: `ADMIN`, `MEMBER`, `VIEWER`)
  * **Response:** `201 Created` with new Membership.
* `PATCH /api/v1/projects/:projectId/members/:userId` - Update user role in project. Admin/Owner only.
  * **Request Body:** `{ role }`
  * **Response:** `200 OK` with updated Membership.
* `DELETE /api/v1/projects/:projectId/members/:userId` - Remove member from project. Admin/Owner only.
  * **Response:** `200 OK` with `{ removed: true }`.

---

### 8. Project Activities API
* `GET /api/v1/projects/:projectId/activity` - Cursor-paginated activity feed of project changes.
  * **Query Params:** `limit` (max 100, default 25), `cursor` (ISO timestamp of previous page cut-off)
  * **Response:** `200 OK` with list of activity logs and a `meta.nextCursor` token.

---

### 9. Notifications API
* `GET /api/v1/notifications` - Retrieve list of user notifications.
  * **Response:** `200 OK` with notifications array and `meta.unreadCount`.
* `PATCH /api/v1/notifications/:notificationId/read` - Mark a notification as read.
  * **Response:** `200 OK` with `{ read: true }`.
* `POST /api/v1/notifications/read-all` - Mark all notifications as read.
  * **Response:** `200 OK` with confirmation message.
