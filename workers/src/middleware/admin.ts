/**
 * Admin Middleware for Hono
 */

import { Context, Next } from 'hono';

import type { Env } from '../env';

/**
 * Check if an email is an admin
 */
export function isAdmin(email: string | null, env: Env): boolean {
	if (!email) return false;
	const adminEmails = env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
	return adminEmails.includes(email.toLowerCase());
}

/**
 * Require admin access middleware
 */
export async function requireAdmin(c: Context, next: Next) {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (!isAdmin(user.email, c.env as Env)) {
		return c.json({ error: 'Forbidden - Admin access required' }, 403);
	}

	await next();
}


