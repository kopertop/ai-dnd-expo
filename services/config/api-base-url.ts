/**
 * Shared API base URL helper
 *
 * Ensures every client (REST, WebSocket, auth) resolves the same origin.
 */

const resolveApiBaseUrl = (): string => {
	const explicitUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
	if (explicitUrl) {
		return explicitUrl;
	}

	if (typeof window !== 'undefined') {
		const isLocalhost =
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.hostname === '';

		if (isLocalhost) {
			return 'http://localhost:8787';
		}

		// Cloudflare Pages API
		return 'https://ai-dnd.kopertop.workers.dev';
	}

	// Node/Expo dev server
	return 'http://localhost:8787';
};

export const API_BASE_URL = resolveApiBaseUrl();

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

