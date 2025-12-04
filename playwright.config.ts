import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 60_000,
	expect: {
		timeout: 5_000,
	},
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8081',
		headless: true,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'bun run start:full',
		port: 8081,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI,
	},
});
