/**
 * Auth Middleware for Hono
 *
 * Extracts and validates auth tokens, attaches user info to context
 */

import type { IncomingRequestCfProperties } from '@cloudflare/workers-types';
import { Context, Next } from 'hono';

import { initAuth } from '../auth';
import type { Env } from '../env';

/**
 * Auth context type
 */
export interface AuthContext {
	user: {
		id: string;
		email: string;
		name?: string | null;
	} | null;
	session: {
		id: string;
		userId: string;
	} | null;
}

/**
 * Auth middleware - extracts user from session
 */
export async function authMiddleware(c: Context, next: Next) {
	// Get Cloudflare context from request
	const rawRequest = c.req.raw as Request & { cf?: IncomingRequestCfProperties };
	const cf = rawRequest.cf;
	const auth = await initAuth(c.env as Env, cf);

	try {
		// Create a request with the original headers for better-auth
		const session = (await auth.api.getSession({
			headers: rawRequest.headers,
		})) as any;

		if (session?.data?.user) {
			c.set('user', {
				id: session.data.user.id,
				email: session.data.user.email,
				name: session.data.user.name,
			});
			if (session.data.session) {
				c.set('session', {
					id: session.data.session.id,
					userId: session.data.user.id,
				});
			}
		} else {
			c.set('user', null);
			c.set('session', null);
		}
	} catch (error) {
		console.error('Auth middleware error:', error);
		c.set('user', null);
		c.set('session', null);
	}

	await next();
}

/**
 * Require authentication middleware
 */
export async function requireAuth(c: Context, next: Next) {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	await next();
}

