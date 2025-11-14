/**
 * CORS Middleware for Hono
 */

import { Context, Next } from 'hono';

/**
 * Get allowed origin from request
 * When credentials are included, we must use a specific origin, not '*'
 */
function getAllowedOrigin(origin: string | null): string {
	// Allow localhost origins for development
	if (origin && (
		origin.startsWith('http://localhost:') ||
		origin.startsWith('http://127.0.0.1:') ||
		origin.startsWith('https://localhost:') ||
		origin.startsWith('https://127.0.0.1:')
	)) {
		return origin;
	}

	// For production, you might want to check against a whitelist
	// For now, allow the origin if provided, otherwise use '*'
	return origin || '*';
}

export function corsHeaders(origin: string | null): Record<string, string> {
	const allowedOrigin = getAllowedOrigin(origin);

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
		'Access-Control-Allow-Credentials': 'true',
		'Content-Type': 'application/json',
	};
}

/**
 * CORS middleware for Hono
 */
export async function corsMiddleware(c: Context, next: Next) {
	const origin = c.req.header('Origin') || null;
	const headers = corsHeaders(origin);

	if (c.req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers });
	}

	await next();

	// Add CORS headers to response
	Object.entries(headers).forEach(([key, value]) => {
		c.header(key, value);
	});
}


