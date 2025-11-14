/**
 * Better Auth Configuration for Cloudflare Workers
 *
 * Integrates better-auth with Cloudflare D1, KV, and Workers environment
 */

import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { betterAuth } from 'better-auth';
import { withCloudflare } from 'better-auth-cloudflare';
import { magicLink } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';

import { schema } from '../db/auth.schema';

interface Env {
	GAME_SESSION: DurableObjectNamespace;
	DB: D1Database;
	QUESTS: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
	AUTH_SECRET: string;
	AUTH_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	APPLE_CLIENT_ID?: string;
	APPLE_CLIENT_SECRET?: string;
}

/**
 * Initialize auth instance with Cloudflare adapters
 */
export async function initAuth(env: Env, cf?: IncomingRequestCfProperties) {
	return betterAuth({
		...withCloudflare(
			{
				d1: {
					db: drizzle(env.DB, { schema }),
					options: {
						schema,
					},
				},
				kv: env.AUTH_SESSIONS,
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
				plugins: [
					magicLink({
						sendMagicLink: async ({ email, token, url }) => {
							// TODO: Implement email sending using Cloudflare Email Workers or external service
							// For now, log the magic link details for development
							console.log('Magic link requested:', {
								email,
								token,
								url,
							});
							// In production, you would send an email here using:
							// - Cloudflare Email Workers (if available)
							// - External email service API (SendGrid, Mailgun, etc.)
							// - Or another email sending mechanism
						},
					}),
				],
				baseURL: env.AUTH_URL || 'http://localhost:8787',
				basePath: '/api/auth',
				secret: env.AUTH_SECRET,
				trustedOrigins: [
					'http://localhost:8081',
					'http://127.0.0.1:8081',
					'http://localhost:3000',
					'http://127.0.0.1:3000',
				],
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

