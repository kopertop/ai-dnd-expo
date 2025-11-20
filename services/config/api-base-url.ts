/**
 * Shared API base URL helper
 *
 * Ensures every client (REST, WebSocket, auth) resolves the same origin.
 */

const resolveApiBaseUrl = (): string => {
	// PRIORITY 1: Check process.env first (most reliable for local dev)
	// This works even when the app is served from workers.dev but you want to use localhost API
	if (process.env.EXPO_PUBLIC_API_BASE_URL) {
		console.log('** resolveApiBaseUrl: Using process.env.EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
		return process.env.EXPO_PUBLIC_API_BASE_URL;
	}

	// PRIORITY 2: Try to get from Constants (works for static exports)
	let explicitUrl: string | undefined;
	try {
		const Constants = require('expo-constants') as typeof import('expo-constants');
		explicitUrl = Constants.default?.expoConfig?.extra?.apiBaseUrl;
		if (explicitUrl) {
			console.log('** resolveApiBaseUrl: Using Constants.expoConfig.extra.apiBaseUrl:', explicitUrl);
			return explicitUrl;
		}
	} catch {
		// expo-constants not available, fall back to process.env
	}

	// PRIORITY 3: Check if we're in development mode
	const isDev = process.env.NODE_ENV === 'development' || __DEV__;
	if (isDev) {
		console.log('** resolveApiBaseUrl: Development mode detected, using localhost');
		return 'http://localhost:8787/api/';
	}

	// PRIORITY 4: Check window location for localhost
	if (typeof window !== 'undefined') {
		const isLocalhost =
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.hostname === '';

		if (isLocalhost) {
			console.log('** resolveApiBaseUrl: Window is localhost, using localhost API');
			return 'http://localhost:8787/api/';
		}

		// Cloudflare Pages API (production fallback)
		console.log('** resolveApiBaseUrl: Using production API (workers.dev)');
		return 'https://ai-dnd-app.kopertop.workers.dev/api/';
	}

	// Node/Expo dev server (server-side)
	console.log('** resolveApiBaseUrl: Server-side, using localhost');
	return 'http://localhost:8787/api/';
};

// Resolve at module load time
const resolvedUrl = resolveApiBaseUrl();
console.log('** API_BASE_URL resolved to:', resolvedUrl);
console.log('** process.env.EXPO_PUBLIC_API_BASE_URL at module load:', process.env.EXPO_PUBLIC_API_BASE_URL);
console.log('** typeof window:', typeof window);
if (typeof window !== 'undefined') {
	console.log('** window.location.href:', window.location.href);
	console.log('** window.location.hostname:', window.location.hostname);
}

export const API_BASE_URL = resolvedUrl;

/**
 * Helper to build API URLs while handling relative base paths.
 */
export const buildApiUrl = (path: string): string => {
	if (!path.startsWith('/')) {
		throw new Error(`API paths must start with '/'. Received: ${path}`);
	}

	if (!API_BASE_URL) {
		return path;
	}

	const normalizedBase = API_BASE_URL.endsWith('/')
		? API_BASE_URL.slice(0, -1)
		: API_BASE_URL;

	return `${normalizedBase}${path}`;
};

