import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';

export async function notificationRoutes(app: FastifyInstance) {
  /** GET /api/v1/notifications — current user's notifications */
  app.get('/api/v1/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: request.userId, readAt: null }
    });
    return reply.send({ data: notifications, meta: { unreadCount } });
  });

  /** PATCH /api/v1/notifications/:notificationId/read */
  app.patch(
    '/api/v1/notifications/:notificationId/read',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { notificationId } = request.params as { notificationId: string };

      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId: request.userId }
      });
      if (!notification) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() }
      });

      return reply.send({ data: { read: true } });
    }
  );

  /** POST /api/v1/notifications/read-all */
  app.post(
    '/api/v1/notifications/read-all',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await prisma.notification.updateMany({
        where: { userId: request.userId, readAt: null },
        data: { readAt: new Date() }
      });
      return reply.send({ data: { message: 'All notifications marked as read.' } });
    }
  );
}
