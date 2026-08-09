import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import { prisma } from '../../lib/prisma.js';
import { logActivity } from '../../lib/activity.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  assertProjectMember,
  assertProjectAdmin,
  assertStoryInProject,
  assertTaskInStory
} from '../../middleware/authorize.js';

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  position: z.number().optional()
});

const updateTaskSchema = taskSchema.partial();

export async function taskRoutes(app: FastifyInstance) {
  /** GET /api/v1/projects/:projectId/stories/:storyId/tasks */
  app.get(
    '/api/v1/projects/:projectId/stories/:storyId/tasks',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId } = request.params as { projectId: string; storyId: string };
      await assertProjectMember(projectId, request.userId);
      await assertStoryInProject(storyId, projectId);

      const tasks = await prisma.task.findMany({
        where: { storyId, archived: false },
        include: { assignee: { select: { id: true, name: true, email: true } } },
        orderBy: [{ status: 'asc' }, { position: 'asc' }]
      });

      return reply.send({ data: tasks });
    }
  );

  /** POST /api/v1/projects/:projectId/stories/:storyId/tasks */
  app.post(
    '/api/v1/projects/:projectId/stories/:storyId/tasks',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId } = request.params as { projectId: string; storyId: string };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);
      await assertStoryInProject(storyId, projectId);

      const result = taskSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', fields: result.error.issues }
        });
      }

      const maxPos = await prisma.task.aggregate({
        where: { storyId, archived: false },
        _max: { position: true }
      });
      const position = (maxPos._max.position ?? 0) + 1000;

      const d = result.data;
      const task = await prisma.task.create({
        data: {
          title: d.title,
          storyId,
          position,
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.priority !== undefined ? { priority: d.priority } : {}),
          ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
          ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {})
        },
        include: { assignee: { select: { id: true, name: true, email: true } } }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId,
        taskId: task.id,
        action: 'task.created',
        summary: `${request.userName} created task "${task.title}"`
      });

      return reply.status(201).send({ data: task });
    }
  );

  /** GET /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId */
  app.get(
    '/api/v1/projects/:projectId/stories/:storyId/tasks/:taskId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId, taskId } = request.params as {
        projectId: string;
        storyId: string;
        taskId: string;
      };
      await assertProjectMember(projectId, request.userId);
      await assertStoryInProject(storyId, projectId);
      await assertTaskInStory(taskId, storyId);

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: { select: { id: true, name: true, email: true } } }
      });

      return reply.send({ data: task });
    }
  );

  /** PATCH /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId */
  app.patch(
    '/api/v1/projects/:projectId/stories/:storyId/tasks/:taskId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId, taskId } = request.params as {
        projectId: string;
        storyId: string;
        taskId: string;
      };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);
      await assertStoryInProject(storyId, projectId);
      const existing = await assertTaskInStory(taskId, storyId);

      const result = updateTaskSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' } });
      }

      const prevStatus = existing.status;
      const d = result.data;
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(d.title !== undefined ? { title: d.title } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.priority !== undefined ? { priority: d.priority } : {}),
          ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
          ...(d.position !== undefined ? { position: d.position } : {}),
          ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {})
        },
        include: { assignee: { select: { id: true, name: true, email: true } } }
      });

      const summaries: string[] = [];
      if (d.status && d.status !== prevStatus) summaries.push(`moved to ${d.status}`);
      if (d.assigneeId !== undefined) summaries.push(`assignee updated`);

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId,
        taskId,
        action: 'task.updated',
        summary: `${request.userName} updated task "${task.title}"${summaries.length ? ` (${summaries.join(', ')})` : ''}`
      });

      return reply.send({ data: task });
    }
  );

  /** DELETE /api/v1/projects/:projectId/stories/:storyId/tasks/:taskId */
  app.delete(
    '/api/v1/projects/:projectId/stories/:storyId/tasks/:taskId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId, taskId } = request.params as {
        projectId: string;
        storyId: string;
        taskId: string;
      };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);
      await assertStoryInProject(storyId, projectId);
      const task = await assertTaskInStory(taskId, storyId);

      await prisma.task.update({ where: { id: taskId }, data: { archived: true } });

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId,
        taskId,
        action: 'task.archived',
        summary: `${request.userName} archived task "${task.title}"`
      });

      return reply.send({ data: { archived: true } });
    }
  );

  /** GET /api/v1/projects/:projectId/kanban — all tasks grouped by status */
  app.get(
    '/api/v1/projects/:projectId/kanban',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectMember(projectId, request.userId);

      const tasks = await prisma.task.findMany({
        where: {
          story: { projectId, archived: false },
          archived: false
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          story: { select: { id: true, title: true } }
        },
        orderBy: [{ position: 'asc' }]
      });

      const columns: Record<string, typeof tasks> = {
        BACKLOG: [],
        TODO: [],
        IN_PROGRESS: [],
        BLOCKED: [],
        IN_REVIEW: [],
        DONE: []
      };
      for (const task of tasks) {
        columns[task.status]?.push(task);
      }

      return reply.send({ data: columns });
    }
  );
}
