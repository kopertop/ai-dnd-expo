/**
 * CORS Middleware helpers for Hono-based Workers
 */

import { Context, Next } from 'hono';

/**
 * Get allowed origin from request
 * When credentials are included, we must use a specific origin, not '*'
 */
function getAllowedOrigin(origin: string | null): string {
	// Allow localhost origins for development
	if (
		origin &&
		(origin.startsWith('http://localhost:') ||
			origin.startsWith('http://127.0.0.1:') ||
			origin.startsWith('https://localhost:') ||
			origin.startsWith('https://127.0.0.1:'))
	) {
		return origin;
	}

	// Check allowed production domains (explicit allowlist only)
	if (origin) {
		const allowedDomains = new Set<string>([
			'https://dnd.coredumped.org',
			'https://ai-dnd-web.pages.dev',
		]);

		// Exact matches only (no broad suffix matching)
		if (allowedDomains.has(origin)) {
			return origin;
		}
	}

	console.log('Blocked origin:', origin);

	// Fallback to null (block) or '*' if you want to allow public access without credentials
	// Since we use cookies/auth, we should be strict
	return '*';
}

export function corsHeaders(origin: string | null): Record<string, string> {
	const allowedOrigin = getAllowedOrigin(origin);

	const headers: Record<string, string> = {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Provider, x-client-version',
	};

	// Always set Content-Type to JSON for API responses unless overridden later
	headers['Content-Type'] = 'application/json';

	// Browsers reject credentialed requests when origin is '*'
	if (allowedOrigin !== '*') {
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	return headers;
}

/**
 * CORS middleware for Hono
 */
export async function corsMiddleware(c: Context, next: Next) {
	const origin = c.req.header('Origin') || c.req.header('referer') || null;

	if (origin?.startsWith('http://localhost')) {
		c.env.__DEV__ = true;
	}

	const headers = corsHeaders(origin);

	if (c.req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers });
	}

	await next();

	// Add CORS headers to response
	Object.entries(headers).forEach(([key, value]) => {
		// Don't override Content-Type if it's already set
		if (key === 'Content-Type' && c.res.headers.get('Content-Type')) {
			return;
		}
		c.header(key, value);
	});
}
