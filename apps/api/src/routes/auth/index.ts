import type { FastifyInstance } from 'fastify';
import { z } from 'zod/v4';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createSession, revokeSession, SESSION_COOKIE } from '../../lib/session.js';
import { authenticate } from '../../middleware/authenticate.js';
import type { AppConfig } from '../../config.js';

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

function cookieOptions(config: AppConfig) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: config.SESSION_TTL_SECONDS
  };
}

export async function authRoutes(app: FastifyInstance, { config }: { config: AppConfig }) {
  /** POST /api/v1/auth/register */
  app.post('/api/v1/auth/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', fields: result.error.issues }
      });
    }

    const { name, email, password } = result.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' }
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    const token = await createSession(user.id, config);

    return reply
      .status(201)
      .setCookie(SESSION_COOKIE, token, cookieOptions(config))
      .send({
        data: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
      });
  });

  /** POST /api/v1/auth/login */
  app.post('/api/v1/auth/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' }
      });
    }

    const { email, password } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison equivalent — always verify even if user not found
    const hashToCheck = user?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$dummy';
    const valid = user ? await verifyPassword(hashToCheck, password) : false;

    if (!user || !valid) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }
      });
    }

    const token = await createSession(user.id, config);

    return reply
      .status(200)
      .setCookie(SESSION_COOKIE, token, cookieOptions(config))
      .send({
        data: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
      });
  });

  /** POST /api/v1/auth/logout */
  app.post('/api/v1/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await revokeSession(token);
    return reply
      .clearCookie(SESSION_COOKIE, { path: '/' })
      .status(200)
      .send({ data: { message: 'Signed out successfully.' } });
  });

  /** GET /api/v1/auth/me */
  app.get('/api/v1/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });
    return reply.send({ data: user });
  });
}
