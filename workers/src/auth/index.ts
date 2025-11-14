/**
 * Better Auth Configuration for Cloudflare Workers
 * 
 * Integrates better-auth with Cloudflare D1, KV, and Workers environment
 */

import { betterAuth } from 'better-auth';
import { withCloudflare } from 'better-auth-cloudflare';

/**
 * Initialize auth instance with Cloudflare adapters
 */
export async function initAuth(env: Env, cf?: IncomingRequestCfProperties) {
	return betterAuth({
		...withCloudflare(
			{
				d1: {
					db: env.DB,
				},
				kv: env.AUTH_SESSIONS ? {
					namespace: env.AUTH_SESSIONS,
				} : undefined,
				cf: cf, // Cloudflare context for geolocation/IP detection
			},
			{
				emailAndPassword: {
					enabled: true,
					requireEmailVerification: false, // Magic links don't require verification
				},
				socialProviders: {
					google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					} : undefined,
					apple: env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET ? {
						clientId: env.APPLE_CLIENT_ID,
						clientSecret: env.APPLE_CLIENT_SECRET,
					} : undefined,
				},
				magicLink: {
					enabled: true,
					// Frontend will handle the callback at /auth/callback
					// The actual redirect URL should be set per-request based on the frontend URL
				},
				baseURL: env.AUTH_URL || 'http://localhost:8787',
				basePath: '/api/auth',
				secret: env.AUTH_SECRET,
			},
		),
	});
}

/**
 * Create auth instance (for export)
 * This will be initialized per-request with env context
 */
export async function createAuth(env: Env) {
	return initAuth(env);
}

