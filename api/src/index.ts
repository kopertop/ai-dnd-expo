import { handleGoogleCallback, useAuth, User } from 'expo-auth-template/backend';
import { Hono } from 'hono';
import { partyserverMiddleware } from 'hono-party';

import { corsMiddleware } from './cors';
import type { CloudflareBindings } from './env';
import { GameRoom } from './partykit/server';
import adminRoutes from './routes/admin';
import characterRoutes from './routes/characters';
import gameRoutes from './routes/games';
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
app.route('/api/characters', characterRoutes);
app.route('/api/quests', questRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/maps', mapRoutes);
// Note: /api/auth/exchange and /api/device-tokens routes removed - handled by expo-auth-template
app.route('/api/me', meRoutes);

/**
 * Get content-type based on file extension
 */
function getContentType(path: string): string {
	const ext = path.split('.').pop()?.toLowerCase();
	const contentTypes: Record<string, string> = {
		html: 'text/html',
		css: 'text/css',
		js: 'application/javascript',
		json: 'application/json',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		ico: 'image/x-icon',
		woff: 'font/woff',
		woff2: 'font/woff2',
		ttf: 'font/ttf',
		otf: 'font/otf',
		mp3: 'audio/mpeg',
		mp4: 'video/mp4',
		webm: 'video/webm',
	};
	return contentTypes[ext || ''] || 'application/octet-stream';
}

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
				// Create a new response with the asset body and proper headers
				const contentType = asset.headers.get('Content-Type') || getContentType(path);

				// Preserve all headers from the asset response
				const headers = new Headers(asset.headers);
				// Ensure Content-Type is set correctly
				headers.set('Content-Type', contentType);

				const response = new Response(asset.body, {
					status: asset.status,
					statusText: asset.statusText,
					headers,
				});
				return response;
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

// Export PartyServer Durable Object for hono-party bindings
export { GameRoom };

// GameSession Durable Object removed - using D1 database directly
