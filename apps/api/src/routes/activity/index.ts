import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { assertProjectMember } from '../../middleware/authorize.js';

export async function activityRoutes(app: FastifyInstance) {
  /** GET /api/v1/projects/:projectId/activity */
  app.get(
    '/api/v1/projects/:projectId/activity',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { limit = '25', cursor } = request.query as { limit?: string; cursor?: string };

      await assertProjectMember(projectId, request.userId);

      const take = Math.min(parseInt(limit, 10) || 25, 100);
      const activities = await prisma.activityLog.findMany({
        where: {
          projectId,
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
        },
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take
      });

      const nextCursor =
        activities.length === take
          ? activities[activities.length - 1]?.createdAt.toISOString()
          : null;

      return reply.send({ data: activities, meta: { nextCursor } });
    }
  );
}
