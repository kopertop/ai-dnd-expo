import { Hono } from 'hono';

import { authMiddleware } from './auth/middleware';
import { corsMiddleware } from './cors';
import type { CloudflareBindings } from './env';
import adminRoutes from './routes/admin';
import deviceTokensRoutes from './routes/device-tokens';
import gameRoutes from './routes/games';
import meRoutes from './routes/me';
import questRoutes from './routes/quests';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// Apply CORS globally
app.use('*', corsMiddleware);

// Apply auth middleware globally (sets user in context)
app.use('*', authMiddleware);

// Health check (no auth required)
app.get('/health', c => {
	return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Status endpoint (no auth required)
app.get('/status', c => {
	return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount API routes
app.route('/api/games', gameRoutes);
app.route('/api/quests', questRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/device-tokens', deviceTokensRoutes);
app.route('/api/me', meRoutes);

// Serve static assets for non-API routes (Worker with Assets)
app.get('*', async (c) => {
	// Check if this is an API route
	if (c.req.path.startsWith('/api/')) {
		return c.json({ error: 'Not found' }, 404);
	}

	// Try to serve from assets binding
	const assets = c.env.ASSETS;
	if (assets) {
		try {
			// Get the file from the assets binding
			const url = new URL(c.req.url);
			let path = url.pathname;
			
			// Default to index.html for root or directory requests
			if (path === '/' || !path.includes('.')) {
				path = '/index.html';
			}
			
			// Remove leading slash for asset lookup
			const assetPath = path.startsWith('/') ? path.slice(1) : path;
			
			const asset = await assets.fetch(new Request(new URL(assetPath, c.req.url)));
			
			if (asset.status === 200) {
				return asset;
			}
		} catch (error) {
			console.error('Error serving asset:', error);
		}
	}

	// Fallback: return a simple HTML page
	return c.html(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>AI D&D</title>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
		</head>
		<body>
			<h1>AI D&D API</h1>
			<p>API is running. Use the mobile app or web client to access the game.</p>
			<p><a href="/health">Health Check</a></p>
		</body>
		</html>
	`);
});

export default app;

export { GameSession } from './durable/game-session';
