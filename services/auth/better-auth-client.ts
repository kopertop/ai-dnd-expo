/**
 * Better Auth Client
 * 
 * Client-side authentication using better-auth with Cloudflare plugin
 */

// Import from TypeScript wrapper files that handle Metro bundler compatibility
import { createAuthClient } from './better-auth-client-wrapper';
import { cloudflareClient } from './better-auth-cloudflare-client-wrapper';

// Get auth base URL from environment
const getAuthBaseUrl = (): string => {
	const explicitUrl = process.env.EXPO_PUBLIC_AUTH_URL;
	if (explicitUrl) {
		return explicitUrl;
	}
	
	// Check if we're in a browser environment
	if (typeof window !== 'undefined') {
		// Check if we're on localhost (local development)
		const isLocalhost = window.location.hostname === 'localhost' || 
		                   window.location.hostname === '127.0.0.1' ||
		                   window.location.hostname === '';
		
		if (isLocalhost) {
			// Local development - use full localhost URL
			return 'http://localhost:8787';
		}
		
		// Production - use relative URLs
		return '';
	}
	
	// Node/Expo dev server - use localhost
	return 'http://localhost:8787';
};

const AUTH_BASE_URL = getAuthBaseUrl();

/**
 * Better Auth client instance
 */
export const authClient = createAuthClient({
	baseURL: AUTH_BASE_URL,
	basePath: '/api/auth',
	plugins: [cloudflareClient()],
});

export default authClient;

