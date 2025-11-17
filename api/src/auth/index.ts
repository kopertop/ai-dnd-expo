import type { D1Database, IncomingRequestCfProperties, KVNamespace } from '@cloudflare/workers-types';
import { betterAuth } from 'better-auth';
import { withCloudflare } from 'better-auth-cloudflare';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';

import { schema } from '../db';
import type { CloudflareBindings } from '../env';

// Single auth configuration that handles both CLI and runtime scenarios
function resolveProviderSecret(
	envValue?: string,
	processValue?: string,
): string | undefined {
	return envValue ?? processValue ?? undefined;
}

function createAuth(env?: CloudflareBindings, cf?: IncomingRequestCfProperties) {
	// Use actual DB for runtime, empty object for CLI
	const db = env ? drizzle(env.DATABASE, { schema, logger: true }) : ({} as any);

	const googleClientId = resolveProviderSecret(
		env?.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_ID,
	);
	const googleClientSecret = resolveProviderSecret(
		env?.GOOGLE_CLIENT_SECRET,
		process.env.GOOGLE_CLIENT_SECRET,
	);

	const isRuntimeContext = Boolean(env);

	if (isRuntimeContext && (!googleClientId || !googleClientSecret)) {
		console.warn(
			'[Better Auth] Google provider credentials missing in runtime env. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via Wrangler secrets or .dev.vars.',
		);
	}

	return betterAuth({
		trustedOrigins: [
			'http://localhost:8081',
			'https://localhost:8081',
			'http://127.0.0.1:8081',
			'https://127.0.0.1:8081',
			'https://ai-dnd.kopertop.workers.dev',
			'https://ai-dnd-web.pages.dev',
			'https://preview.ai-dnd-web.pages.dev',
			'https://dev.ai-dnd-web.pages.dev',
			'https://main.ai-dnd-web.pages.dev',
		],
		providers: googleClientId
			? [
				{
					id: 'google',
					name: 'Google',
					icon: 'https://www.google.com/favicon.ico',
					callbackURL: `${env?.AUTH_URL ?? 'http://localhost:8787'}/api/auth/callback/google`,
				},
			]
			: [],
		...withCloudflare(
			{
				autoDetectIpAddress: true,
				geolocationTracking: true,
				cf: cf || {},
				d1: env
					? {
						db,
						options: {
							usePlural: true,
							debugLogs: true,
						},
					}
					: undefined,
				kv: env?.AUTH_SESSIONS
					? (env.AUTH_SESSIONS as KVNamespace<string>)
					: undefined,
			},
			{
				emailAndPassword: {
					enabled: false,
				},
				socialProviders: {
					google:
						googleClientId && googleClientSecret
							? {
								clientId: googleClientId,
								clientSecret: googleClientSecret,
							}
							: undefined,
				},
				rateLimit: {
					enabled: true,
				},
				baseURL: env?.AUTH_URL,
				basePath: '/api/auth',
				secret: env?.AUTH_SECRET,
			},
		),
		// Only add database adapter for CLI schema generation
		...(env
			? {}
			: {
				database: drizzleAdapter({} as D1Database, {
					provider: 'sqlite',
					usePlural: true,
					debugLogs: true,
				}),
			}),
	});
}

// Export for CLI schema generation
export const auth = createAuth();

// Export for runtime usage
export { createAuth };
