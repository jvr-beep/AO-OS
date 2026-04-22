import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: '/tmp/playwright-results.json' }], ['html', { open: 'never', outputFolder: '/tmp/playwright-html' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'member-setup',
      testMatch: /member\.setup\.ts/,
    },
    {
      name: 'staff',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/staff.json',
      },
      dependencies: ['setup'],
      testIgnore: /kiosk.*\.spec\.ts|auth\.spec\.ts|member\.spec\.ts/,
    },
    {
      name: 'auth-flows',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: 'kiosk',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /kiosk.*\.spec\.ts/,
    },
    {
      name: 'member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/member.json',
      },
      dependencies: ['member-setup'],
      testMatch: /member\.spec\.ts/,
    },
  ],
  globalSetup: './e2e/global-setup.ts',
})
