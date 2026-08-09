import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSessionUserId, SESSION_COOKIE } from '../lib/session.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    userName: string;
  }
}

/**
 * Fastify preHandler that validates the session cookie.
 * Attaches userId, userEmail, userName to the request.
 * Returns 401 if session is missing, invalid, or expired.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies[SESSION_COOKIE];
  const userId = await getSessionUserId(token);

  if (!userId) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'You must be signed in to access this resource.',
        requestId: request.id
      }
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true }
  });

  if (!user) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Session is no longer valid.',
        requestId: request.id
      }
    });
  }

  request.userId = user.id;
  request.userEmail = user.email;
  request.userName = user.name;
}
