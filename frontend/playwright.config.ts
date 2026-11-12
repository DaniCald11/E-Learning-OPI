import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', workers: 1,
  use: { baseURL: 'http://localhost:5173', headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) }, trace: 'off' },
})
