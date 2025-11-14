/**
 * CORS Middleware for Hono
 */

import { Context, Next } from 'hono';

export function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
		'Content-Type': 'application/json',
	};
}

/**
 * CORS middleware for Hono
 */
export async function corsMiddleware(c: Context, next: Next) {
	if (c.req.method === 'OPTIONS') {
		return c.json(null, 204, corsHeaders());
	}
	
	await next();
	
	// Add CORS headers to response
	Object.entries(corsHeaders()).forEach(([key, value]) => {
		c.header(key, value);
	});
}


