import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { onRequest } from '../../functions/api-proxy';

describe('api-proxy', () => {
	beforeEach(() => {
		// @ts-ignore
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('forwards to upstream with path stripped (custom upstream)', async () => {
		const mockRequest: any = {
			url: 'https://site.example/api/foo?bar=baz',
			method: 'GET',
			headers: { 'x-test': '1' },
			body: undefined,
		};
		const mockContext: any = {
			request: mockRequest,
			env: { CF_API_UPSTREAM: 'https://upstream.example' },
		};

		(global.fetch as any).mockImplementation(async (url: string, _init: any) => {
			expect(url).toBe('https://upstream.example/foo?bar=baz');
			expect(_init.method).toBe('GET');
			expect(_init.body).toBeUndefined();
			return {
				status: 200,
				statusText: 'OK',
				headers: { 'content-type': 'application/json' },
				body: '{"ok":true}',
			} as any;
		});

		const res: any = await onRequest(mockContext);
		expect(res).toBeTruthy();
	});

	it('uses default upstream when not configured', async () => {
		const mockRequest: any = {
			url: 'https://site.example/api/bar',
			method: 'GET',
			headers: {},
			body: undefined,
		};
		const mockContext: any = {
			request: mockRequest,
			env: {}, // no CF_API_UPSTREAM
		};

		(global.fetch as any).mockImplementation(async (url: string, _init: any) => {
			expect(url).toBe('https://ai-dnd.kopertop.workers.dev/bar');
			return {
				status: 200,
				statusText: 'OK',
				headers: { 'content-type': 'application/json' },
				body: '{"ok":true}',
			} as any;
		});

		const res: any = await onRequest(mockContext);
		expect(res).toBeTruthy();
	});
});
