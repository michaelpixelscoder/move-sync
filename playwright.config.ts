import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8081';

export default defineConfig({ testDir: './e2e', timeout: 90_000, expect: { timeout: 20_000 }, use: { baseURL, browserName: 'chromium', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure', launchOptions: { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] } }, reporter: [['list']] });
