import { defineConfig, devices } from '@playwright/test';

const PORTA = 4300;
const noCi = !!process.env['CI'];
const urlExterna = process.env['E2E_URL'];

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: noCi,
  retries: noCi ? 1 : 0,
  reporter: noCi ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: urlExterna ?? `http://localhost:${PORTA}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: urlExterna
    ? undefined
    : {
        command: `npx ng serve --configuration production --port ${PORTA}`,
        url: `http://localhost:${PORTA}`,
        reuseExistingServer: !noCi,
        timeout: 180_000,
      },
});
