import path from 'node:path';

import { defineConfig } from 'vitest/config';

const rootDir = path.resolve(__dirname, '.');

export default defineConfig({
	test: {
		name: 'frontend',
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup/vitest.setup.ts'],
		include: [
			'tests/**/*.{spec,test}.{js,ts,tsx}',
			'components/**/*.{spec,test}.{js,ts,tsx}',
			'hooks/**/*.{spec,test}.{js,ts,tsx}',
			'utils/**/*.{spec,test}.{js,ts,tsx}',
		],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.expo/**',
			'**/build/**',
			'**/ios/**',
			'**/android/**',
			'api/**',
			'tests/api/**',
			'api/tests/**',
			'tests/unit/services/**',
			'tests/e2e/**',
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: [
				'components/**/*.{js,ts,tsx}',
				'hooks/**/*.{js,ts,tsx}',
				'utils/**/*.{js,ts,tsx}',
				'services/**/*.{js,ts,tsx}',
			],
			exclude: [
				'**/*.{spec,test}.{js,ts,tsx}',
				'**/__tests__/**',
				'**/*.d.ts',
				'**/node_modules/**',
				'**/dist/**',
				'**/.expo/**',
				'**/build/**',
				'**/ios/**',
				'**/android/**',
				'tests/setup/**',
			],
			thresholds: {
				global: {
					branches: 60,
					functions: 60,
					lines: 60,
					statements: 60,
				},
			},
		},
	},
	resolve: {
		alias: {
			'@': rootDir,
			'@/api': path.resolve(rootDir, 'api'),
			'@/services': path.resolve(rootDir, 'services'),
			'@/utils': path.resolve(rootDir, 'utils'),
			'@/hooks': path.resolve(rootDir, 'hooks'),
			'@/components': path.resolve(rootDir, 'components'),
			'@/types': path.resolve(rootDir, 'types'),
			'react-native': path.resolve(rootDir, 'tests/setup/react-native-mock.ts'),
			'@expo/vector-icons$': path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts'),
			'@expo/vector-icons/build/createIconSet': path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts'),
			'react-data-table-component$': path.resolve(rootDir, 'tests/setup/react-native-mock.ts'),
			'@react-native-community/datetimepicker$': path.resolve(rootDir, 'tests/setup/react-native-mock.ts'),
		},
	},
	define: {
		'__DEV__': false,
	},
});
