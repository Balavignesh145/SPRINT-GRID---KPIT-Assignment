import { randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';
import type { AppConfig } from '../config.js';

const SESSION_COOKIE = 'sg_session';

/** Generates a secure random session token (hex, 64 chars = 32 bytes). */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/** Creates a session record, returns the raw token (sent in cookie). */
export async function createSession(userId: string, config: AppConfig): Promise<string> {
  const token = generateToken();
  const { createHash } = await import('node:crypto');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({ data: { tokenHash, userId, expiresAt } });
  return token;
}

/** Looks up a valid session by raw token. Returns userId or null. */
export async function getSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const { createHash } = await import('node:crypto');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return null;
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  return session.userId;
}

/** Revokes a session by raw token. */
export async function revokeSession(token: string): Promise<void> {
  const { createHash } = await import('node:crypto');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

/** Returns the session cookie name. */
export { SESSION_COOKIE };
