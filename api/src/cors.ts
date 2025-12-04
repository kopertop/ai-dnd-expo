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
	console.log('origin', origin);

	// For production, you might want to check against a whitelist
	// For now, allow the origin if provided, otherwise fall back to '*'
	return origin || '*';
}

export function corsHeaders(origin: string | null, preserveContentType = false): Record<string, string> {
	const allowedOrigin = getAllowedOrigin(origin);

	const headers: Record<string, string> = {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Provider, x-client-version',
	};

	// Only set Content-Type to JSON if we're not preserving the existing content-type
	// (e.g., for static assets)
	if (!preserveContentType) {
		headers['Content-Type'] = 'application/json';
	}

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
	
	// Check if this is a static asset route (non-API route)
	const isStaticAsset = !c.req.path.startsWith('/api/');
	
	const headers = corsHeaders(origin, isStaticAsset);

	if (c.req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers });
	}

	await next();

	// Add CORS headers to response, but preserve existing Content-Type for static assets
	Object.entries(headers).forEach(([key, value]) => {
		// Don't override Content-Type if it's already set (for static assets)
		if (key === 'Content-Type' && c.res.headers.get('Content-Type')) {
			return;
		}
		c.header(key, value);
	});
}


