import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

import type { FastifyInstance } from 'fastify';

describe('SprintGrid API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Force test configuration
    process.env.NODE_ENV = 'test';
    const config = loadConfig();
    app = await buildApp(config);
  }, 30000);

  it('should return 200 and healthy status on GET /api/v1/health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.data.service).toBe('sprintgrid-api');
    expect(json.data.status).toBe('ok');
  });

  it('should reject unauthenticated request on GET /api/v1/projects', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(401);
    const json = JSON.parse(response.payload);
    expect(json.error.code).toBe('UNAUTHENTICATED');
  });
});
