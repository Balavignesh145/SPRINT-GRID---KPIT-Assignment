import type { ApiError } from '../types';

const BASE = '/api/v1';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: ApiError['error']['fields']
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options
  });

  if (!res.ok) {
    let body: ApiError | null = null;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(
      res.status,
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? `HTTP ${res.status}`,
      body?.error.fields
    );
  }

  return res.json() as Promise<T>;
}

function get<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}
function post<T>(path: string, body?: unknown) {
  const options: RequestInit = { method: 'POST' };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return request<T>(path, options);
}
function patch<T>(path: string, body?: unknown) {
  const options: RequestInit = { method: 'PATCH' };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return request<T>(path, options);
}
function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

// ── Auth ────────────────────────────────────────────────────
export const auth = {
  register: (data: { name: string; email: string; password: string }) =>
    post<{ data: import('../types').User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    post<{ data: import('../types').User }>('/auth/login', data),
  logout: () => post('/auth/logout', {}),
  me: () => get<{ data: import('../types').User }>('/auth/me')
};

// ── Projects ────────────────────────────────────────────────
export const projects = {
  list: () => get<{ data: import('../types').Project[] }>('/projects'),
  get: (id: string) => get<{ data: import('../types').Project }>(`/projects/${id}`),
  create: (data: { name: string; key: string; description?: string }) =>
    post<{ data: import('../types').Project }>('/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; archived: boolean }>) =>
    patch<{ data: import('../types').Project }>(`/projects/${id}`, data),
  archive: (id: string) => del<{ data: { archived: boolean } }>(`/projects/${id}`)
};

// ── Stories ─────────────────────────────────────────────────
export const stories = {
  list: (projectId: string) =>
    get<{ data: import('../types').UserStory[] }>(`/projects/${projectId}/stories`),
  get: (projectId: string, storyId: string) =>
    get<{ data: import('../types').UserStory }>(`/projects/${projectId}/stories/${storyId}`),
  create: (projectId: string, data: Partial<import('../types').UserStory> & { title: string }) =>
    post<{ data: import('../types').UserStory }>(`/projects/${projectId}/stories`, data),
  update: (projectId: string, storyId: string, data: Partial<import('../types').UserStory>) =>
    patch<{ data: import('../types').UserStory }>(`/projects/${projectId}/stories/${storyId}`, data),
  delete: (projectId: string, storyId: string) =>
    del<{ data: { archived: boolean } }>(`/projects/${projectId}/stories/${storyId}`)
};

// ── Tasks ───────────────────────────────────────────────────
export const tasks = {
  list: (projectId: string, storyId: string) =>
    get<{ data: import('../types').Task[] }>(`/projects/${projectId}/stories/${storyId}/tasks`),
  get: (projectId: string, storyId: string, taskId: string) =>
    get<{ data: import('../types').Task }>(`/projects/${projectId}/stories/${storyId}/tasks/${taskId}`),
  create: (projectId: string, storyId: string, data: Partial<import('../types').Task> & { title: string }) =>
    post<{ data: import('../types').Task }>(`/projects/${projectId}/stories/${storyId}/tasks`, data),
  update: (projectId: string, storyId: string, taskId: string, data: Partial<import('../types').Task>) =>
    patch<{ data: import('../types').Task }>(`/projects/${projectId}/stories/${storyId}/tasks/${taskId}`, data),
  delete: (projectId: string, storyId: string, taskId: string) =>
    del<{ data: { archived: boolean } }>(`/projects/${projectId}/stories/${storyId}/tasks/${taskId}`)
};

// ── Kanban ───────────────────────────────────────────────────
export const kanban = {
  board: (projectId: string) =>
    get<{ data: import('../types').KanbanColumns }>(`/projects/${projectId}/kanban`)
};

// ── Members ─────────────────────────────────────────────────
export const members = {
  list: (projectId: string) =>
    get<{ data: import('../types').Membership[] }>(`/projects/${projectId}/members`),
  invite: (projectId: string, data: { email: string; role?: string }) =>
    post<{ data: import('../types').Membership }>(`/projects/${projectId}/members`, data),
  updateRole: (projectId: string, userId: string, role: string) =>
    patch(`/projects/${projectId}/members/${userId}`, { role }),
  remove: (projectId: string, userId: string) =>
    del(`/projects/${projectId}/members/${userId}`)
};

// ── Activity ─────────────────────────────────────────────────
export const activity = {
  list: (projectId: string, params?: { limit?: number; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    const query = qs.toString();
    return get<{ data: import('../types').ActivityLog[]; meta: { nextCursor: string | null } }>(
      `/projects/${projectId}/activity${query ? `?${query}` : ''}`
    );
  }
};

// ── Notifications ─────────────────────────────────────────────
export const notifications = {
  list: () =>
    get<{ data: import('../types').Notification[]; meta: { unreadCount: number } }>('/notifications'),
  markRead: (id: string) => patch(`/notifications/${id}/read`),
  markAllRead: () => post('/notifications/read-all')
};

// ── Search ───────────────────────────────────────────────────
export const search = {
  find: (q: string) =>
    get<{
      data: {
        projects: import('../types').Project[];
        stories: import('../types').UserStory[];
        tasks: import('../types').Task[];
        users: import('../types').User[];
      };
    }>(`/search?q=${encodeURIComponent(q)}`)
};
