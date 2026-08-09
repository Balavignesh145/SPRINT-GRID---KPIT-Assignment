import { prisma } from './prisma.js';

type LogActivityParams = {
  projectId: string;
  actorId?: string | null;
  storyId?: string | null;
  taskId?: string | null;
  action: string;
  summary: string;
};

/** Records an activity event. Never throws — logging failures must not break requests. */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({ data: params });
  } catch (err) {
    console.error('[activity] Failed to log activity', err);
  }
}
