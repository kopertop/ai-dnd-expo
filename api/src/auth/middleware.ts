import type { Context, Next } from 'hono';

import { createOrUpdateUser, getUser } from '../auth';
import { validateAppleToken, validateGoogleToken } from './providers';
import type { CloudflareBindings } from './env';

export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string;
	picture?: string;
}

/**
 * Authenticate OAuth token (Google or Apple)
 */
async function authenticateOAuthToken(env: CloudflareBindings, token: string, provider: string = 'google'): Promise<AuthenticatedUser | null> {
	let userInfo;
	
	if (provider === 'apple') {
		userInfo = await validateAppleToken(token);
	} else {
		// Default to Google
		userInfo = await validateGoogleToken(token);
	}
	
	if (!userInfo) {
		return null;
	}
	
	// Get or create user in database
	const user = await createOrUpdateUser(env, {
		id: userInfo.id,
		email: userInfo.email,
		name: userInfo.displayName || userInfo.mail || userInfo.email,
		picture: userInfo.picture,
	});
	
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		picture: user.picture,
	};
}

/**
 * Authenticate device token
 */
async function authenticateDeviceToken(env: CloudflareBindings, deviceToken: string): Promise<AuthenticatedUser | null> {
	try {
		// Validate device token format
		const hexRegex = /^[0-9a-f]{64}$/i;
		if (!hexRegex.test(deviceToken)) {
			console.warn('Invalid device token format');
			return null;
		}

		// Look up device token and get associated user
		const result = await env.DATABASE.prepare(`
			SELECT
				dt.device_token,
				dt.user_id,
				dt.last_used_at,
				dt.expires_at,
				u.id,
				u.email,
				u.name,
				u.picture,
				u.created_at,
				u.updated_at
			FROM device_tokens dt
			JOIN users u ON dt.user_id = u.id
			WHERE dt.device_token = ?
		`).bind(deviceToken).first();

		if (!result) {
			console.warn('Device token not found');
			return null;
		}

		// Check if token is expired
		if (result.expires_at && new Date(result.expires_at) < new Date()) {
			console.warn('Device token expired');
			return null;
		}

		// Update last used timestamp
		await env.DATABASE.prepare(`
			UPDATE device_tokens
			SET last_used_at = ?, updated_at = ?
			WHERE device_token = ?
		`).bind(Date.now(), Date.now(), deviceToken).run();

		// Return user data
		return {
			id: result.id,
			email: result.email,
			name: result.name,
			picture: result.picture || undefined,
		};
	} catch (error) {
		console.error('Error authenticating device token:', error);
		return null;
	}
}

/**
 * Auth middleware for Hono
 * Parses Authorization header and attaches user to context
 */
export async function authMiddleware(c: Context<{ Bindings: CloudflareBindings; Variables: { user: AuthenticatedUser | null } }>, next: Next) {
	const auth = c.req.header('Authorization');
	
	if (!auth) {
		c.set('user', null);
		await next();
		return;
	}

	let user: AuthenticatedUser | null = null;

	if (auth.startsWith('Bearer ')) {
		// OAuth token authentication
		// Format: "Bearer <token> <provider>" or "Bearer <token>" (defaults to google)
		const parts = auth.substring(7).split(' ');
		const token = parts[0];
		const provider = parts[1] || 'google';
		
		user = await authenticateOAuthToken(c.env, token, provider);
	} else if (auth.startsWith('Device ')) {
		// Device token authentication
		const deviceToken = auth.substring(7);
		user = await authenticateDeviceToken(c.env, deviceToken);
	}

	c.set('user', user);
	await next();
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(c: Context<{ Bindings: CloudflareBindings; Variables: { user: AuthenticatedUser | null } }>, next: Next) {
	const user = c.get('user');
	
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	
	await next();
}

