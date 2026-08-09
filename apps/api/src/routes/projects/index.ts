import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import { prisma } from '../../lib/prisma.js';
import { logActivity } from '../../lib/activity.js';
import { authenticate } from '../../middleware/authenticate.js';
import { assertProjectMember, assertProjectAdmin } from '../../middleware/authorize.js';

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Key must be uppercase letters and digits only'),
  description: z.string().max(500).optional()
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  archived: z.boolean().optional()
});

export async function projectRoutes(app: FastifyInstance) {
  /** GET /api/v1/projects — list projects where user is a member */
  app.get('/api/v1/projects', { preHandler: [authenticate] }, async (request, reply) => {
    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        memberships: { some: { userId: request.userId } }
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { stories: { where: { archived: false } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return reply.send({ data: projects });
  });

  /** POST /api/v1/projects — create a project */
  app.post('/api/v1/projects', { preHandler: [authenticate] }, async (request, reply) => {
    const result = createProjectSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', fields: result.error.issues }
      });
    }

    const { name, key, description } = result.data;
    const existing = await prisma.project.findUnique({ where: { key } });
    if (existing) {
      return reply.status(409).send({
        error: { code: 'KEY_TAKEN', message: `Project key "${key}" is already in use.` }
      });
    }

    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          name,
          key,
          ownerId: request.userId,
          ...(description !== undefined ? { description } : {})
        }
      });
      await tx.membership.create({
        data: { projectId: p.id, userId: request.userId, role: 'OWNER' }
      });
      return p;
    });

    await logActivity({
      projectId: project.id,
      actorId: request.userId,
      action: 'project.created',
      summary: `${request.userName} created project "${project.name}"`
    });

    return reply.status(201).send({ data: project });
  });

  /** GET /api/v1/projects/:projectId */
  app.get(
    '/api/v1/projects/:projectId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectMember(projectId, request.userId);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
          _count: {
            select: {
              stories: { where: { archived: false } }
            }
          }
        }
      });

      if (!project || project.archived) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      }

      return reply.send({ data: project });
    }
  );

  /** PATCH /api/v1/projects/:projectId */
  app.patch(
    '/api/v1/projects/:projectId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectAdmin(projectId, request.userId);

      const result = updateProjectSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' }
        });
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...(result.data.name !== undefined ? { name: result.data.name } : {}),
          ...(result.data.description !== undefined ? { description: result.data.description } : {}),
          ...(result.data.archived !== undefined ? { archived: result.data.archived } : {})
        }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        action: 'project.updated',
        summary: `${request.userName} updated project "${project.name}"`
      });

      return reply.send({ data: project });
    }
  );

  /** DELETE /api/v1/projects/:projectId — soft-delete (archive) */
  app.delete(
    '/api/v1/projects/:projectId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectAdmin(projectId, request.userId);

      const project = await prisma.project.update({
        where: { id: projectId },
        data: { archived: true }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        action: 'project.archived',
        summary: `${request.userName} archived project "${project.name}"`
      });

      return reply.send({ data: { archived: true } });
    }
  );
}
