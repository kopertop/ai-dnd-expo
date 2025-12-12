import { afterEach, beforeEach, vi } from 'vitest';

if (!globalThis.fetch) {
	const { fetch, Headers, Request, Response, FormData } = require('undici');
	Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });
}

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});
