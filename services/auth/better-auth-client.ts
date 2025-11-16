/**
 * Better Auth Client
 *
 * Client-side authentication using better-auth with Cloudflare plugin
 */

import { createAuthClient } from './better-auth-client-wrapper';
import { cloudflareClient } from './better-auth-cloudflare-client-wrapper';

import { API_BASE_URL } from '@/services/config/api-base-url';

export const AUTH_BASE_URL = API_BASE_URL;

/**
 * Better Auth client instance
 */
export const authClient = createAuthClient({
	baseURL: AUTH_BASE_URL,
	basePath: '/api/auth',
	plugins: [cloudflareClient()],
});

export default authClient;

