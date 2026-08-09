import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      cwd: '../../',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: 'file:./dev.db',
        NODE_ENV: 'test',
        API_PORT: '3000',
        API_HOST: '127.0.0.1',
      }
    },
    {
      command: 'npm run dev:web',
      cwd: '../../',
      port: 5180,
      reuseExistingServer: !process.env.CI,
    }
  ]
});
