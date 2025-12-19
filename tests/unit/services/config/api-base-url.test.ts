import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const resetEnv = () => {
	for (const key of Object.keys(process.env)) {
		if (!(key in originalEnv)) {
			delete process.env[key];
		}
	}
	Object.assign(process.env, originalEnv);
};

const setPlatformOS = async (os: string) => {
	const { Platform } = await import('react-native');
	(Platform as { OS: string }).OS = os;
};

const loadApiBaseModule = async () => {
	return import('@/services/config/api-base-url');
};

describe('API base URL resolution', () => {
	beforeEach(() => {
		vi.resetModules();
		resetEnv();
	});

	afterEach(() => {
		resetEnv();
	});

	it('uses explicit EXPO_PUBLIC_API_BASE_URL when provided', async () => {
		process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:9999/api/';
		await setPlatformOS('web');

		const { API_BASE_URL, buildApiUrl } = await loadApiBaseModule();

		expect(API_BASE_URL).toBe('http://localhost:9999/api/');
		expect(buildApiUrl('/games')).toBe('http://localhost:9999/api/games');
	});

	it('defaults to local worker base URL in development', async () => {
		process.env.NODE_ENV = 'development';
		await setPlatformOS('web');

		const { API_BASE_URL } = await loadApiBaseModule();

		expect(API_BASE_URL).toBe('http://localhost:8787/api/');
	});

	it('uses relative /api path in production web', async () => {
		process.env.NODE_ENV = 'production';
		await setPlatformOS('web');

		const { API_BASE_URL } = await loadApiBaseModule();

		expect(API_BASE_URL).toBe('/api/');
	});
});
