/**
 * Shared API base URL helper
 *
 * Ensures every client (REST, WebSocket, auth) resolves the same origin.
 */
import { Platform } from 'react-native';

const resolveApiBaseUrl = (): string => {
	// On web production, always use a relative path.
	if (Platform.OS === 'web' && process.env.NODE_ENV === 'production') {
		return '/api/';
	}

	// PRIORITY 1: Check process.env first (most reliable for local dev)
	// This works even when the app is served from workers.dev but you want to use localhost API
	if (process.env.EXPO_PUBLIC_API_BASE_URL) {
		return process.env.EXPO_PUBLIC_API_BASE_URL;
	}

	// PRIORITY 2: Try to get from Constants (works for static exports)
	let explicitUrl: string | undefined;
	try {
		const Constants = require('expo-constants') as typeof import('expo-constants');
		const expoConfig = (Constants as { expoConfig?: { extra?: { apiBaseUrl?: string } } }).expoConfig;
		explicitUrl = expoConfig?.extra?.apiBaseUrl;
		if (explicitUrl) {
			return explicitUrl;
		}
	} catch {
		// expo-constants not available, fall back to process.env
	}

	// PRIORITY 3: Check if we're in development mode
	const isDev = process.env.NODE_ENV === 'development' || __DEV__;
	if (isDev) {
		return 'http://localhost:8787/api/';
	}

	// PRIORITY 4: Deployed version: use a relative path. The web server will proxy it.
	return '/api/';
};


// Resolve at module load time
const resolvedUrl = resolveApiBaseUrl();

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
