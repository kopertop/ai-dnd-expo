import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		// Use jsdom environment for component tests (React Native components can be tested in jsdom)
		environment: 'jsdom',
		setupFiles: ['./tests/setup/vitest.setup.ts'],
		globals: true,
		mockReset: true,
		clearMocks: true,
		restoreMocks: true,

		// Performance settings for fast execution
		maxConcurrency: 5,

		// Include only our project test files
		include: [
			'tests/**/*.test.{js,ts,tsx}',
			'app/**/*.test.{js,ts,tsx}',
			'components/**/*.test.{js,ts,tsx}',
			'hooks/**/*.test.{js,ts,tsx}',
		],
		exclude: [
			'node_modules/**',
			'tests/unit/services/**/*.test.{js,ts,tsx}', // Services use separate config
			'**/*.spec.{js,ts,tsx}', // Exclude spec files (e2e tests)
		],

		// Coverage configuration for 100% coverage requirement
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage',
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
			// 100% coverage thresholds as per requirements
			thresholds: {
				global: {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
			},
			// Include all source files for coverage analysis
			include: [
				'app/**/*.{js,ts,tsx}',
				'components/**/*.{js,ts,tsx}',
				'hooks/**/*.{js,ts,tsx}',
				'constants/**/*.{js,ts}',
				'types/**/*.{js,ts}',
				'styles/**/*.{js,ts}',
			],
			// Ensure all files are included even if not imported in tests
			all: true,
		},

		// Test timeout for fast execution (under 30 seconds total)
		testTimeout: 10000,

		// Environment-specific configurations
		environmentOptions: {
			jsdom: {
				resources: 'usable',
				runScripts: 'dangerously',
			},
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, '.'),
			'@/assets': resolve(__dirname, './assets'),
			'@/components': resolve(__dirname, './components'),
			'@/constants': resolve(__dirname, './constants'),
			'@/hooks': resolve(__dirname, './hooks'),
			'@/services': resolve(__dirname, './services'),
			'@/styles': resolve(__dirname, './styles'),
			'@/types': resolve(__dirname, './types'),
			'@/tests': resolve(__dirname, './tests'),
		},
	},
});
