/**
 * Main Hono Application
 *
 * Integrates auth routes with game API routes
 */

import { Hono } from 'hono';

import { initAuth } from './auth';
import type { Env } from './env';
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import admin from './routes/admin';
import games from './routes/games';
import quests from './routes/quests';

const app = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string; name?: string | null } | null; session: { id: string; userId: string } | null } }>();

// Apply CORS middleware to all routes
app.use('*', corsMiddleware);

// Health check (no auth required)
app.get('/health', (c) => {
	return c.json({ status: 'ok' });
});

app.get('/api/auth/providers', (c) => {
	const googleEnabled = Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET);
	const appleEnabled = Boolean(c.env.APPLE_CLIENT_ID && c.env.APPLE_CLIENT_SECRET);

	return c.json({
		magicLink: true,
		google: googleEnabled,
		apple: appleEnabled,
	});
});

// Auth routes - handled by better-auth
app.all('/api/auth/*', async (c) => {
	try {
		// Get Cloudflare context from request
		const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined;
		const auth = await initAuth(c.env, cf);
		return auth.handler(c.req.raw);
	} catch (error) {
		console.error('Auth handler error:', error);
		return c.json({ error: 'Authentication error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
	}
});

// Apply auth middleware to API routes (except auth and quests routes)
app.use('/api/games/*', authMiddleware);
app.use('/api/admin/*', authMiddleware);

// API routes
app.route('/api/games', games);
app.route('/api/quests', quests); // Public - no auth required
app.route('/api/admin', admin);

// 404 handler
app.notFound((c) => {
	return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error('Request error:', err);
	return c.json(
		{
			error: 'Internal server error',
			message: err.message || 'Unknown error',
		},
		500,
	);
});

export default app;

