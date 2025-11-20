import path from 'node:path';

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

const rootDir = path.resolve(process.cwd());

export default defineWorkersConfig({
	test: {
		pool: '@cloudflare/vitest-pool-workers',
		poolOptions: {
			workers: {
				wrangler: { configPath: path.resolve(rootDir, 'wrangler.toml') },
			},
		},
		include: ['api/tests/**/*.spec.ts'],
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		coverage: {
			enabled: false,
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
			'@/shared': path.resolve(rootDir, 'shared'),
		},
	},
});

