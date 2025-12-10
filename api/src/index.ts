import { handleGoogleCallback, useAuth, User } from 'expo-auth-template/backend';
import { Hono } from 'hono';
import { partyserverMiddleware } from 'hono-party';

import { corsMiddleware } from './cors';
import type { CloudflareBindings } from './env';
import { GameRoom } from './partykit/server';
import adminRoutes from './routes/admin';
import characterRoutes from './routes/characters';
import gameRoutes from './routes/games';
import imageRoutes from './routes/images';
import mapRoutes from './routes/maps';
import meRoutes from './routes/me';
import questRoutes from './routes/quests';
import { resolveSqlBinding } from './utils/repository';

type Variables = {
	user: User | null;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

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
				limit,
				remaining: 0,
				reset: new Date(reset * 1000).toISOString()
			}, 429);
		}

		// Add rate limit headers
		c.header('X-RateLimit-Limit', limit.toString());
		c.header('X-RateLimit-Remaining', remaining.toString());
		c.header('X-RateLimit-Reset', new Date(reset * 1000).toISOString());
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

	// Set user in context
	c.set('user', user);

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
// Note: /api/auth/exchange and /api/device-tokens routes removed - handled by expo-auth-template
app.route('/api/me', meRoutes);

export default app;

// Export PartyServer Durable Object for hono-party bindings
export { GameRoom };

// GameSession Durable Object removed - using D1 database directly
