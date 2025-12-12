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
		server: {
			deps: {
				inline: [/@expo\/vector-icons/],
			},
		},
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
		alias: [
			{ find: /^.+\.(png|jpg|jpeg|gif|webp)$/, replacement: path.resolve(rootDir, 'tests/setup/image-mock.ts') },
			{ find: '@', replacement: rootDir },
			{ find: '@/api', replacement: path.resolve(rootDir, 'api') },
			{ find: '@/services', replacement: path.resolve(rootDir, 'services') },
			{ find: '@/utils', replacement: path.resolve(rootDir, 'utils') },
			{ find: '@/hooks', replacement: path.resolve(rootDir, 'hooks') },
			{ find: '@/components', replacement: path.resolve(rootDir, 'components') },
			{ find: '@/types', replacement: path.resolve(rootDir, 'types') },
			{ find: 'react-native', replacement: path.resolve(rootDir, 'tests/setup/react-native-mock.ts') },
			{ find: '@expo/vector-icons/build/createIconSet', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/build/MaterialCommunityIcons', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/MaterialIcons', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/Feather', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/FontAwesome', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/FontAwesome5', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/Ionicons', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons/MaterialCommunityIcons', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: '@expo/vector-icons$', replacement: path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts') },
			{ find: 'react-data-table-component$', replacement: path.resolve(rootDir, 'tests/setup/react-native-mock.ts') },
			{ find: '@react-native-community/datetimepicker$', replacement: path.resolve(rootDir, 'tests/setup/react-native-mock.ts') },
		],
	},
	define: {
		'__DEV__': false,
	},
});
