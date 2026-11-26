import { defineConfig } from '@playwright/test'

const fixtureUrl = 'http://127.0.0.1:4180'
const remoteUrl = process.env.NEXROAD_TEST_BASE_URL

export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  use: {
    baseURL: remoteUrl || fixtureUrl,
    launchOptions: { executablePath: process.env.NEXROAD_CHROMIUM_PATH },
  },
  webServer: remoteUrl ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4180 --strictPort',
    url: fixtureUrl,
    env: { VITE_SUPABASE_URL: fixtureUrl, VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-key' },
  },
})
