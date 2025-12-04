import { resolve } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	esbuild: {
		target: 'es2020',
	},
	test: {
		name: 'services',
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
			enabled: false,
		},

		// Test timeout for fast execution
		testTimeout: 10000,
		deps: {
			inline: [
				'react-native',
				'expo-modules-core',
				'expo-file-system',
				'@expo/vector-icons',
				'@react-native-async-storage/async-storage',
			],
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, '.'),
			'@/services': resolve(__dirname, './services'),
			'@/types': resolve(__dirname, './types'),
			'@/constants': resolve(__dirname, './constants'),
			'@/tests': resolve(__dirname, './tests'),
			'react-native': resolve(__dirname, './tests/setup/react-native-mock.ts'),
			'@expo/vector-icons$': resolve(__dirname, './tests/setup/expo-vector-icons-mock.ts'),
			'@expo/vector-icons/build/createIconSet': resolve(__dirname, './tests/setup/expo-vector-icons-mock.ts'),
			'expo-modules-core': resolve(__dirname, './tests/setup/expo-modules-core-mock.ts'),
			'expo-file-system': resolve(__dirname, './tests/setup/expo-file-system-mock.ts'),
		},
	},
});
