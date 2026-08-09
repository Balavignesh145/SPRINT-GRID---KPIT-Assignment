// ── Enums ──────────────────────────────────────────────────────
export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type StoryStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'RETRYING' | 'COMPLETED' | 'FAILED';

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// ── Project ──────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  archived: boolean;
  ownerId: string;
  owner: User;
  memberships: Membership[];
  _count?: { stories: number };
  createdAt: string;
  updatedAt: string;
}

// ── Membership ───────────────────────────────────────────────
export interface Membership {
  id: string;
  projectId: string;
  userId: string;
  role: MembershipRole;
  user: User;
  createdAt: string;
}

// ── UserStory ────────────────────────────────────────────────
export interface UserStory {
  id: string;
  projectId: string;
  assigneeId: string | null;
  assignee: User | null;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  status: StoryStatus;
  priority: Priority;
  storyPoints: number | null;
  position: number;
  archived: boolean;
  _count?: { tasks: number };
  tasks?: Task[];
  project?: { id: string; name: string; key: string };
  createdAt: string;
  updatedAt: string;
}

// ── Task ─────────────────────────────────────────────────────
export interface Task {
  id: string;
  storyId: string;
  story?: { id: string; title: string; projectId: string; project?: { id: string; name: string; key: string } };
  assigneeId: string | null;
  assignee: User | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Activity ─────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  projectId: string;
  actorId: string | null;
  actor: User | null;
  storyId: string | null;
  taskId: string | null;
  action: string;
  summary: string;
  createdAt: string;
}

// ── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

// ── API Responses ─────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Array<{ path: string[]; message: string }>;
    requestId?: string;
  };
}

// ── Kanban ────────────────────────────────────────────────────
export type KanbanColumns = Record<TaskStatus, Task[]>;
