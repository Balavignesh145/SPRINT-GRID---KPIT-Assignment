import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyError } from 'fastify';

import type { AppConfig } from './config.js';
import { authRoutes } from './routes/auth/index.js';
import { projectRoutes } from './routes/projects/index.js';
import { storyRoutes } from './routes/stories/index.js';
import { taskRoutes } from './routes/tasks/index.js';
import { memberRoutes } from './routes/members/index.js';
import { activityRoutes } from './routes/activity/index.js';
import { notificationRoutes } from './routes/notifications/index.js';
import { searchRoutes } from './routes/search/index.js';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    requestIdHeader: 'x-request-id',
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.body.password',
        'req.body.passwordHash'
      ]
    }
  });

  // ── OpenAPI / Swagger ─────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SprintGrid API',
        description: 'REST API for SprintGrid — Agile Project Workspace',
        version: '1.0.0'
      },
      servers: [{ url: `http://${config.API_HOST}:${config.API_PORT}` }],
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sg_session' }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list' },
    staticCSP: true
  });

  // ── Security & transport ──────────────────────────────────────
  await app.register(cookie, { secret: config.SESSION_SECRET, hook: 'onRequest' });

  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    allowList: config.NODE_ENV === 'test' ? ['127.0.0.1'] : []
  });

  await app.register(helmet, {
    contentSecurityPolicy:
      config.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              connectSrc: ["'self'", config.WEB_ORIGIN],
              fontSrc: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              imgSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"]
            }
          }
        : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });

  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true
  });

  // ── Error handler ─────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error, requestId: request.id }, 'Request failed');

    // Re-throw authorization errors with correct status
    if ((error as { code?: string }).code === 'FORBIDDEN') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: error.message, requestId: request.id }
      });
    }
    if ((error as { code?: string }).code === 'NOT_FOUND') {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: error.message, requestId: request.id }
      });
    }

    const statusCode =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;
    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: statusCode === 500 ? 'An unexpected error occurred.' : error.message,
        requestId: request.id
      }
    });
  });

  // ── Routes ───────────────────────────────────────────────────
  app.get('/api/v1/health', async () => ({
    data: { service: 'sprintgrid-api', status: 'ok', timestamp: new Date().toISOString() }
  }));

  await app.register(authRoutes, { config });
  await app.register(projectRoutes);
  await app.register(storyRoutes);
  await app.register(taskRoutes);
  await app.register(memberRoutes);
  await app.register(activityRoutes);
  await app.register(notificationRoutes);
  await app.register(searchRoutes);

  return app;
}
