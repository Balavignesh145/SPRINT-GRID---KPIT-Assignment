import { randomBytes } from 'node:crypto';

import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().startsWith('file:').default('file:./dev.db'),
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(900).max(2_592_000).default(604_800),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(10_000).default(120)
});

export type AppConfig = z.infer<typeof environmentSchema> & { SESSION_SECRET: string };

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = environmentSchema.parse(environment);
  if (config.NODE_ENV === 'production' && !config.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be configured in production');
  }

  return {
    ...config,
    API_HOST: environment.API_HOST ?? (config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
    SESSION_SECRET: config.SESSION_SECRET ?? randomBytes(32).toString('hex')
  };
}
