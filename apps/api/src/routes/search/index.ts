import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';

export async function searchRoutes(app: FastifyInstance) {
  /** GET /api/v1/search */
  app.get(
    '/api/v1/search',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { q = '' } = request.query as { q?: string };
      const userId = request.userId;

      if (!q.trim()) {
        return reply.send({
          data: { projects: [], stories: [], tasks: [], users: [] }
        });
      }

      // 1. Find projects where user is a member and name/key matches query
      const userMemberships = await prisma.membership.findMany({
        where: { userId },
        select: { projectId: true }
      });
      const memberProjectIds = userMemberships.map(m => m.projectId);

      const projects = await prisma.project.findMany({
        where: {
          id: { in: memberProjectIds },
          archived: false,
          OR: [
            { name: { contains: q } },
            { key: { contains: q } }
          ]
        },
        take: 10
      });

      // 2. Find stories in user's projects matching query
      const stories = await prisma.userStory.findMany({
        where: {
          projectId: { in: memberProjectIds },
          archived: false,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } }
          ]
        },
        include: {
          project: { select: { id: true, name: true, key: true } }
        },
        take: 10
      });

      // 3. Find tasks in user's projects matching query
      const tasks = await prisma.task.findMany({
        where: {
          story: {
            projectId: { in: memberProjectIds }
          },
          archived: false,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } }
          ]
        },
        include: {
          story: {
            include: {
              project: { select: { id: true, name: true, key: true } }
            }
          }
        },
        take: 10
      });

      // 4. Find matching users (limited metadata for security)
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 10
      });

      return reply.send({
        data: { projects, stories, tasks, users }
      });
    }
  );
}
