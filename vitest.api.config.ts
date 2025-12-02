import path from 'node:path';

import { defineConfig } from 'vitest/config';

const rootDir = path.resolve(__dirname, '.');

export default defineConfig({
	test: {
		name: 'api',
		include: ['api/tests/**/*.spec.ts'],
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		environment: 'node',
		setupFiles: ['./vitest.api.utils.ts'],
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
			'@/shared': path.resolve(rootDir, 'shared'),
			'cloudflare:test': path.resolve(rootDir, 'api/tests/cloudflare-test-shim.ts'),
		},
	},
});
