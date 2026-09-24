import { defineConfig, devices } from '@playwright/test';

const webPort = process.env.HOMISTA_WEB_PORT || '8081';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `cd ../mobile && npx expo start --web --port ${webPort}`,
    url: `http://127.0.0.1:${webPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
