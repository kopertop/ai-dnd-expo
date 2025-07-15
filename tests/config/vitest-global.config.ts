import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Global Vitest configuration shared across all test environments
 */
export const globalTestConfig = defineConfig({
	test: {
		// Global test settings
		globals: true,
		mockReset: true,
		clearMocks: true,
		restoreMocks: true,
		testTimeout: 10000,

		// Performance settings
		maxConcurrency: 5,

		// Reporter configuration
		reporters: ['verbose', 'json', 'html'],
		outputFile: {
			json: './coverage/test-results.json',
			html: './coverage/test-results.html',
		},

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage',

			// Exclude patterns
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

			// Coverage thresholds - progressive targets
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
				'services/**/*.{js,ts,tsx}',
				'constants/**/*.{js,ts}',
				'types/**/*.{js,ts}',
				'styles/**/*.{js,ts}',
			],

			// Ensure all files are included even if not imported in tests
			all: true,
		},

		// Environment-specific configurations
		environmentOptions: {
			jsdom: {
				resources: 'usable',
				runScripts: 'dangerously',
			},
		},
	},

	// Path resolution
	resolve: {
		alias: {
			'@': resolve(__dirname, '../..'),
			'@/assets': resolve(__dirname, '../../assets'),
			'@/components': resolve(__dirname, '../../components'),
			'@/constants': resolve(__dirname, '../../constants'),
			'@/hooks': resolve(__dirname, '../../hooks'),
			'@/services': resolve(__dirname, '../../services'),
			'@/styles': resolve(__dirname, '../../styles'),
			'@/types': resolve(__dirname, '../../types'),
			'@/tests': resolve(__dirname, '..'),
		},
	},
});

/**
 * Test patterns for different test types
 */
export const testPatterns = {
	components: 'tests/unit/components/**/*.test.{ts,tsx}',
	hooks: 'tests/unit/hooks/**/*.test.{ts,tsx}',
	services: 'tests/unit/services/**/*.test.{ts,tsx}',
	utils: 'tests/unit/utils/**/*.test.{ts,tsx}',
	integration: 'tests/integration/**/*.test.{ts,tsx}',
	e2e: 'tests/e2e/**/*.spec.{ts,tsx}',
};

/**
 * Coverage thresholds by module type
 */
export const coverageThresholds = {
	components: {
		branches: 95,
		functions: 95,
		lines: 95,
		statements: 95,
	},
	hooks: {
		branches: 100,
		functions: 100,
		lines: 100,
		statements: 100,
	},
	services: {
		branches: 100,
		functions: 100,
		lines: 100,
		statements: 100,
	},
	utils: {
		branches: 100,
		functions: 100,
		lines: 100,
		statements: 100,
	},
};
