import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '.');

export default defineWorkersConfig({
	test: {
		name: 'api',
		include: ['api/tests/**/*.spec.ts'],
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.api.toml' },
			},
		},
		fileParallelism: false,
		maxConcurrency: 1,
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
		},
	},
});