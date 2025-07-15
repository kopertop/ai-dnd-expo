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

		// Performance settings for fast execution
		maxConcurrency: 5,

		// Include only service tests
		include: ['tests/unit/services/**/*.test.{js,ts,tsx}'],

		// Coverage configuration for services - 100% coverage requirement
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
				'**/mock*.{js,ts,tsx}',
			],
			// 100% coverage thresholds for services
			thresholds: {
				global: {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
			},
			include: ['services/**/*.{js,ts,tsx}'],
			// Ensure all service files are included even if not imported in tests
			all: true,
		},

		// Test timeout for fast execution
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
