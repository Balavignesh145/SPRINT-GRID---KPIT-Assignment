import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton — one connection shared across the process.
 * In development tsx reloads the module; the global guard prevents
 * creating multiple PrismaClient instances which would exhaust the
 * SQLite write connection.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'production' ? ['error'] : ['error', 'warn']
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
