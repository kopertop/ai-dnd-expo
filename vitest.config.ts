import path from 'node:path';

import { defineConfig } from 'vitest/config';

const rootDir = path.resolve(__dirname, '.');
const reactNativeMock = path.resolve(rootDir, 'tests/setup/react-native-mock.ts');
const vectorIconMock = path.resolve(rootDir, 'tests/setup/expo-vector-icons-mock.ts');
const cloudflareShim = path.resolve(rootDir, 'api/tests/cloudflare-test-shim.ts');
const vectorIconMockSpecifier = vectorIconMock.replace(/\\/g, '\\\\');
const vectorIconShimCode = `
export * from '${vectorIconMockSpecifier}';
import mock from '${vectorIconMockSpecifier}';
export default mock;
`;

const vectorIconPlugin = () => ({
	name: 'vector-icons-mock',
	resolveId(id: string, importer?: string) {
		if (id.startsWith('@expo/vector-icons') || importer?.includes('@expo/vector-icons')) {
			return vectorIconMock;
		}
		return null;
	},
	load(id: string) {
		if (id.includes('@expo/vector-icons')) {
			return vectorIconShimCode;
		}
		return null;
	},
});

export default defineConfig({
	test: {
		name: 'frontend',
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup/vitest.setup.ts'],
		deps: {
			inline: [
				'react-native',
				'react-native-svg',
				'react-native-gesture-handler',
				'react-native-reanimated',
				'@testing-library/react-native',
				'@expo/vector-icons',
				'expo-router',
				'expo-auth-template',
				'@react-native-async-storage/async-storage',
				'cloudflare:test',
			],
		},
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
	server: {
		deps: {
			inline: [
				'react-native',
				'react-native-svg',
				'react-native-gesture-handler',
				'react-native-reanimated',
				'@testing-library/react-native',
				'@expo/vector-icons',
				'expo-router',
				'expo-auth-template',
				'@react-native-async-storage/async-storage',
				'cloudflare:test',
			],
		},
	},
	optimizeDeps: {
		exclude: ['react-native'],
	},
	ssr: {
		noExternal: [
			'react-native',
			'react-native-svg',
			'react-native-gesture-handler',
			'react-native-reanimated',
			'@testing-library/react-native',
			'@expo/vector-icons',
			'expo-router',
			'expo-auth-template',
			'@react-native-async-storage/async-storage',
			'cloudflare:test',
		],
	},
	resolve: {
		alias: [
			{ find: '@', replacement: rootDir },
			{ find: '@/api', replacement: path.resolve(rootDir, 'api') },
			{ find: '@/services', replacement: path.resolve(rootDir, 'services') },
			{ find: '@/utils', replacement: path.resolve(rootDir, 'utils') },
			{ find: '@/hooks', replacement: path.resolve(rootDir, 'hooks') },
			{ find: '@/components', replacement: path.resolve(rootDir, 'components') },
			{ find: '@/types', replacement: path.resolve(rootDir, 'types') },
			{ find: 'react-native', replacement: reactNativeMock },
			{ find: /^react-native(?:\/.*)?$/, replacement: reactNativeMock },
			{ find: 'react-native/index.js', replacement: reactNativeMock },
			{ find: 'react-native/index', replacement: reactNativeMock },
			{ find: '@expo/vector-icons$', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/build/createIconSet', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/build/createIconSet.js', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/MaterialIcons', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/Feather', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/FontAwesome', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/FontAwesome5', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/Ionicons', replacement: vectorIconMock },
			{ find: '@expo/vector-icons/MaterialCommunityIcons', replacement: vectorIconMock },
			{ find: 'cloudflare:test', replacement: cloudflareShim },
			{ find: 'react-data-table-component$', replacement: path.resolve(rootDir, 'tests/setup/react-native-mock.ts') },
			{ find: '@react-native-community/datetimepicker$', replacement: path.resolve(rootDir, 'tests/setup/react-native-mock.ts') },
		],
	},
	define: {
		'__DEV__': false,
	},
	plugins: [vectorIconPlugin()],
});
