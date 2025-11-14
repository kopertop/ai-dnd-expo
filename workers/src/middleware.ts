import { Quest } from './types';

/**
 * Check if an email is an admin
 */
export function isAdmin(email: string | null, env: Env): boolean {
	if (!email) return false;
	const adminEmails = env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
	return adminEmails.includes(email.toLowerCase());
}

/**
 * Extract email from request headers (for admin auth)
 * In production, this would come from authentication tokens
 */
export function getEmailFromRequest(request: Request): string | null {
	// For now, we'll use a header. In production, use proper auth tokens
	return request.headers.get('X-User-Email');
}

/**
 * Admin middleware - returns 403 if not admin
 */
export async function requireAdmin(
	request: Request,
	env: Env,
): Promise<Response | null> {
	const email = getEmailFromRequest(request);
	if (!isAdmin(email, env)) {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin access required' }),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
	return null;
}

/**
 * CORS headers for API responses
 */
export function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
		'Content-Type': 'application/json',
	};
}

/**
 * Handle CORS preflight requests
 */
export function handleCORS(request: Request): Response | null {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(),
		});
	}
	return null;
}

interface Env {
	GAME_SESSION: DurableObjectNamespace;
	QUESTS: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
}

