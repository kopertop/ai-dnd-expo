/**
 * Test environment configurations for different types of tests
 */

export const testEnvironments = {
	/**
	 * Configuration for React Native component tests
	 */
	reactNative: {
		environment: 'react-native',
		setupFiles: ['./tests/setup/vitest.setup.ts'],
		testMatch: [
			'tests/unit/components/**/*.test.{ts,tsx}',
			'tests/unit/hooks/**/*.test.{ts,tsx}',
		],
	},

	/**
	 * Configuration for Node.js service tests
	 */
	node: {
		environment: 'node',
		setupFiles: ['./tests/setup/vitest.services.setup.ts'],
		testMatch: [
			'tests/unit/services/**/*.test.{ts,tsx}',
			'tests/unit/utils/**/*.test.{ts,tsx}',
		],
	},
};

/**
 * Common test configuration shared across environments
 */
export const commonTestConfig = {
	globals: true,
	mockReset: true,
	clearMocks: true,
	restoreMocks: true,
	testTimeout: 10000,

	coverage: {
		provider: 'v8' as const,
		reporter: ['text', 'json', 'html', 'lcov'] as const,
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
	},
};

/**
 * Coverage thresholds for different parts of the application
 */
export const coverageThresholds = {
	// Start with achievable targets and increase over time
	components: {
		branches: 80,
		functions: 80,
		lines: 80,
		statements: 80,
	},

	hooks: {
		branches: 85,
		functions: 85,
		lines: 85,
		statements: 85,
	},

	services: {
		branches: 90,
		functions: 90,
		lines: 90,
		statements: 90,
	},

	utils: {
		branches: 95,
		functions: 95,
		lines: 95,
		statements: 95,
	},
};

/**
 * Test file patterns for different test types
 */
export const testPatterns = {
	unit: '**/*.test.{js,ts,tsx}',
	integration: '**/*.integration.test.{js,ts,tsx}',
	e2e: '**/*.spec.{js,ts,tsx}',
	performance: '**/*.perf.test.{js,ts,tsx}',
};
