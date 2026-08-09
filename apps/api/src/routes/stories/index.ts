import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import { prisma } from '../../lib/prisma.js';
import { logActivity } from '../../lib/activity.js';
import { authenticate } from '../../middleware/authenticate.js';
import { assertProjectMember, assertProjectAdmin, assertStoryInProject } from '../../middleware/authorize.js';

const storySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  acceptanceCriteria: z.string().max(2000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  storyPoints: z.number().int().min(1).max(100).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  position: z.number().optional()
});

const updateStorySchema = storySchema.partial();

export async function storyRoutes(app: FastifyInstance) {
  /** GET /api/v1/projects/:projectId/stories */
  app.get(
    '/api/v1/projects/:projectId/stories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectMember(projectId, request.userId);

      const stories = await prisma.userStory.findMany({
        where: { projectId, archived: false },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: { where: { archived: false } } } }
        },
        orderBy: [{ status: 'asc' }, { position: 'asc' }]
      });

      return reply.send({ data: stories });
    }
  );

  /** POST /api/v1/projects/:projectId/stories */
  app.post(
    '/api/v1/projects/:projectId/stories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);

      const result = storySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', fields: result.error.issues }
        });
      }

      const maxPos = await prisma.userStory.aggregate({
        where: { projectId, archived: false },
        _max: { position: true }
      });
      const position = (maxPos._max.position ?? 0) + 1000;

      const d = result.data;
      const story = await prisma.userStory.create({
        data: {
          title: d.title,
          projectId,
          position,
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.acceptanceCriteria !== undefined ? { acceptanceCriteria: d.acceptanceCriteria } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.priority !== undefined ? { priority: d.priority } : {}),
          ...(d.storyPoints !== undefined ? { storyPoints: d.storyPoints } : {}),
          ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {})
        },
        include: { assignee: { select: { id: true, name: true, email: true } } }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId: story.id,
        action: 'story.created',
        summary: `${request.userName} created story "${story.title}"`
      });

      return reply.status(201).send({ data: story });
    }
  );

  /** GET /api/v1/projects/:projectId/stories/:storyId */
  app.get(
    '/api/v1/projects/:projectId/stories/:storyId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId } = request.params as { projectId: string; storyId: string };
      await assertProjectMember(projectId, request.userId);
      const story = await assertStoryInProject(storyId, projectId);

      const full = await prisma.userStory.findUnique({
        where: { id: story.id },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          tasks: {
            where: { archived: false },
            include: { assignee: { select: { id: true, name: true, email: true } } },
            orderBy: [{ status: 'asc' }, { position: 'asc' }]
          }
        }
      });

      return reply.send({ data: full });
    }
  );

  /** PATCH /api/v1/projects/:projectId/stories/:storyId */
  app.patch(
    '/api/v1/projects/:projectId/stories/:storyId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId } = request.params as { projectId: string; storyId: string };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);
      await assertStoryInProject(storyId, projectId);

      const result = updateStorySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' }
        });
      }

      const d = result.data;
      const story = await prisma.userStory.update({
        where: { id: storyId },
        data: {
          ...(d.title !== undefined ? { title: d.title } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.acceptanceCriteria !== undefined ? { acceptanceCriteria: d.acceptanceCriteria } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.priority !== undefined ? { priority: d.priority } : {}),
          ...(d.storyPoints !== undefined ? { storyPoints: d.storyPoints } : {}),
          ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
          ...(d.position !== undefined ? { position: d.position } : {})
        },
        include: { assignee: { select: { id: true, name: true, email: true } } }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId,
        action: 'story.updated',
        summary: `${request.userName} updated story "${story.title}"`
      });

      return reply.send({ data: story });
    }
  );

  /** DELETE /api/v1/projects/:projectId/stories/:storyId */
  app.delete(
    '/api/v1/projects/:projectId/stories/:storyId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, storyId } = request.params as { projectId: string; storyId: string };
      await assertProjectMember(projectId, request.userId, ['OWNER', 'ADMIN', 'MEMBER']);
      const story = await assertStoryInProject(storyId, projectId);

      await prisma.userStory.update({ where: { id: storyId }, data: { archived: true } });

      await logActivity({
        projectId,
        actorId: request.userId,
        storyId,
        action: 'story.archived',
        summary: `${request.userName} archived story "${story.title}"`
      });

      return reply.send({ data: { archived: true } });
    }
  );
}
