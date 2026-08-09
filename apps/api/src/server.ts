import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
console.log('SprintGrid CONFIG DIAGNOSTIC:', {
  API_HOST: config.API_HOST,
  API_PORT: config.API_PORT,
  NODE_ENV: config.NODE_ENV,
  RENDER: process.env.RENDER,
  PORT: process.env.PORT,
  DATABASE_URL: config.DATABASE_URL
});
const app = await buildApp(config);

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  app.log.error(error, 'Unable to start SprintGrid API');
  process.exitCode = 1;
}
