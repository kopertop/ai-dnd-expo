import { resolve } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Use node environment for service tests
		environment: 'node',
		setupFiles: ['./tests/setup/vitest.services.setup.ts'],
		globals: true,
		mockReset: true,
		clearMocks: true,
		restoreMocks: true,
		// Include only service tests
		include: ['tests/unit/services/**/*.test.{js,ts,tsx}'],
		// Coverage configuration for services
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage/services',
			exclude: [
				'node_modules/**',
				'tests/**',
				'**/*.d.ts',
				'**/*.config.{js,ts}',
				'**/coverage/**',
				'scripts/**',
				'.expo/**',
				'ios/**',
				'android/**',
				'assets/**',
				'**/*.test.{js,ts,tsx}',
				'**/*.spec.{js,ts,tsx}',
			],
			include: ['services/**/*.{js,ts,tsx}'],
		},
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, '.'),
			'@/services': resolve(__dirname, './services'),
			'@/types': resolve(__dirname, './types'),
			'@/constants': resolve(__dirname, './constants'),
			'@/tests': resolve(__dirname, './tests'),
		},
	},
});
