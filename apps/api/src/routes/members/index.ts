import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import { prisma } from '../../lib/prisma.js';
import { logActivity } from '../../lib/activity.js';
import { authenticate } from '../../middleware/authenticate.js';
import { assertProjectMember, assertProjectAdmin } from '../../middleware/authorize.js';

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER')
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'])
});

export async function memberRoutes(app: FastifyInstance) {
  /** GET /api/v1/projects/:projectId/members */
  app.get(
    '/api/v1/projects/:projectId/members',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectMember(projectId, request.userId);

      const members = await prisma.membership.findMany({
        where: { projectId },
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' }
      });

      return reply.send({ data: members });
    }
  );

  /** POST /api/v1/projects/:projectId/members — invite by email */
  app.post(
    '/api/v1/projects/:projectId/members',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await assertProjectAdmin(projectId, request.userId);

      const result = inviteSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' }
        });
      }

      const { email, role } = result.data;
      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'No user with that email exists.' }
        });
      }

      const existing = await prisma.membership.findUnique({
        where: { projectId_userId: { projectId, userId: targetUser.id } }
      });
      if (existing) {
        return reply.status(409).send({
          error: { code: 'ALREADY_MEMBER', message: 'This user is already a member.' }
        });
      }

      const membership = await prisma.membership.create({
        data: { projectId, userId: targetUser.id, role },
        include: { user: { select: { id: true, name: true, email: true } } }
      });

      await logActivity({
        projectId,
        actorId: request.userId,
        action: 'member.added',
        summary: `${request.userName} added ${targetUser.name} as ${role}`
      });

      // Create notification for the new member
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: 'MEMBER_INVITED',
          title: 'You were added to a project',
          body: `${request.userName} added you to a project as ${role}.`
        }
      });

      return reply.status(201).send({ data: membership });
    }
  );

  /** PATCH /api/v1/projects/:projectId/members/:userId */
  app.patch(
    '/api/v1/projects/:projectId/members/:userId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, userId } = request.params as { projectId: string; userId: string };
      await assertProjectAdmin(projectId, request.userId);

      const result = updateRoleSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role.' } });
      }

      const membership = await prisma.membership.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (!membership) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found.' } });
      }
      if (membership.role === 'OWNER') {
        return reply.status(400).send({ error: { code: 'CANNOT_CHANGE_OWNER', message: 'Cannot change the owner role.' } });
      }

      const updated = await prisma.membership.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role: result.data.role },
        include: { user: { select: { id: true, name: true, email: true } } }
      });

      return reply.send({ data: updated });
    }
  );

  /** DELETE /api/v1/projects/:projectId/members/:userId */
  app.delete(
    '/api/v1/projects/:projectId/members/:userId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId, userId } = request.params as { projectId: string; userId: string };
      await assertProjectAdmin(projectId, request.userId);

      const membership = await prisma.membership.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (!membership) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found.' } });
      }
      if (membership.role === 'OWNER') {
        return reply.status(400).send({ error: { code: 'CANNOT_REMOVE_OWNER', message: 'Cannot remove the project owner.' } });
      }

      await prisma.membership.delete({ where: { projectId_userId: { projectId, userId } } });
      return reply.send({ data: { removed: true } });
    }
  );
}
