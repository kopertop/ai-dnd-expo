import { handleGoogleCallback, useAuth } from 'expo-auth-template/backend';
import { Hono } from 'hono';
import { partyserverMiddleware } from 'hono-party';

import { corsMiddleware } from './cors';
import type { HonoContext } from './env';
import { GameRoom } from './partykit/server';
import adminRoutes from './routes/admin';
import characterRoutes from './routes/characters';
import gameRoutes from './routes/games';
import imageRoutes from './routes/images';
import mapRoutes from './routes/maps';
import meRoutes from './routes/me';
import questRoutes from './routes/quests';
import worldRoutes from './routes/worlds';
import { resolveSqlBinding } from './utils/repository';

import type { User } from '@/types/models';

const app = new Hono<HonoContext>();

// Apply CORS globally
app.use('*', corsMiddleware);

// Rate limiting middleware
app.use('*', async (c, next) => {
	const rateLimiter = c.env.API_RATE_LIMITER;
	if (!rateLimiter) {
		// Fail closed if the binding is missing so we don't silently ship without protection
		console.error('API_RATE_LIMITER binding missing. Ensure wrangler.api.toml [[ratelimits]] is provisioned.');
		return c.json({ error: 'Server misconfiguration: rate limiter unavailable' }, 500);
	}

	// Use user ID if authenticated, IP as fallback
	// Note: user is not set yet in this middleware order (auth runs later),
	// so we rely on IP for global rate limiting.
	// For stricter user-based limits, we'd need to move this after auth or decode token here.
	const key = c.req.header('CF-Connecting-IP') || 'anonymous';

	try {
		const { success, limit, remaining, reset } = await rateLimiter.limit({ key });

		if (!success) {
			return c.json({
				error: 'Rate limit exceeded',
				limit: limit ?? 0,
				remaining: 0,
				reset: reset ? new Date(reset * 1000).toISOString() : new Date().toISOString(),
			}, 429);
		}

		// Add rate limit headers
		if (limit !== undefined) c.header('X-RateLimit-Limit', limit.toString());
		if (remaining !== undefined) c.header('X-RateLimit-Remaining', remaining.toString());
		if (reset !== undefined) c.header('X-RateLimit-Reset', new Date(reset * 1000).toISOString());
	} catch (e) {
		console.error('Rate limiter error:', e);
		// Fail open if rate limiter fails
	}
	await next();
});

// Attach PartyServer (Partykit-in-Worker) under /party/*
app.use('/party/*', partyserverMiddleware({
	options: {
		prefix: 'party',
	},
}));

// Apply auth middleware globally (sets user in context)
// expo-auth-template handles authentication via useAuth function
app.use('*', async (c, next) => {
	// Create env with DB alias for expo-auth-template
	const envWithDB = {
		...c.env,
		DB: resolveSqlBinding(c.env), // Package expects DB binding
	};

	// Authenticate using expo-auth-template
	const user = await useAuth(c.req.raw, envWithDB);
	const hydratedUser: (User & { created_at?: number; updated_at?: number }) | null = user
		? {
			...user,
			created_at: user.created_at ?? Date.now(),
			updated_at: user.updated_at ?? Date.now(),
			isAdmin: user.isAdmin ?? user.is_admin ?? false,
			is_admin: user.is_admin ?? user.isAdmin ?? false,
		}
		: null;

	// Set user in context
	c.set('user', hydratedUser);

	await next();
});

// Health check (no auth required) - available at both root and /api paths
app.get('/health', c => {
	return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', c => {
	return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Status endpoint (no auth required)
app.get('/status', c => {
	return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/status', c => {
	return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Google OAuth callback handler (no auth required - this is the authentication endpoint)
app.post('/api/auth/google/callback', async (c) => {
	try {
		const envWithDB = {
			...c.env,
			DB: c.env.DATABASE, // Package expects DB binding
		};

		const body = await c.req.json();
		console.log('body', body);

		// Validate configuration
		if (!c.env.GOOGLE_CLIENT_ID) {
			console.error('Missing GOOGLE_CLIENT_ID environment variable');
			return c.json({ error: 'Server configuration error: Missing GOOGLE_CLIENT_ID' }, 500);
		}

		if (!c.env.GOOGLE_CLIENT_SECRET) {
			console.error('Missing GOOGLE_CLIENT_SECRET environment variable');
			return c.json({ error: 'Server configuration error: Missing GOOGLE_CLIENT_SECRET' }, 500);
		}

		const result = await handleGoogleCallback(envWithDB, body, {
			createUserIfNotExists: true,
			googleClientId: c.env.GOOGLE_CLIENT_ID,
			googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
		});

		// Preserve existing picture if user has already set one
		if (result.user?.id) {
			const existingUser = await c.env.DATABASE.prepare(`
				SELECT picture FROM users WHERE id = ?
			`).bind(result.user.id).first();

			// If user already has a non-empty picture, preserve it instead of overwriting with OAuth picture
			if (existingUser && existingUser.picture && existingUser.picture.trim() !== '') {
				// Update the result to use the existing picture
				result.user.picture = existingUser.picture;
			}
		}

		return c.json(result);
	} catch (error) {
		console.error('Google callback error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ error: errorMessage }, 400);
	}
});

// Mount API routes
app.route('/api/games', gameRoutes);
app.route('/api/images', imageRoutes);
app.route('/api/characters', characterRoutes);
app.route('/api/quests', questRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/maps', mapRoutes);
app.route('/api/worlds', worldRoutes);
// Note: /api/auth/exchange and /api/device-tokens routes removed - handled by expo-auth-template
app.route('/api/me', meRoutes);

export default app;

// Export PartyServer Durable Object for hono-party bindings
export { GameRoom };

// GameSession Durable Object removed - using D1 database directly
