import type { Context } from 'hono';
import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

type AuthContext = { Bindings: CloudflareBindings };

const auth = new Hono<AuthContext>();

/**
 * Exchange OAuth code for tokens
 * This endpoint handles the OAuth code exchange on the backend
 * where the client secret can be securely stored
 */
auth.post('/exchange', async (c: Context<AuthContext>) => {
	try {
		const body = await c.req.json() as {
			code: string;
			redirectUri: string;
			codeVerifier?: string;
		};

		if (!body.code || !body.redirectUri) {
			return c.json({ error: 'Missing required parameters: code and redirectUri' }, 400);
		}

		const clientId = c.env.GOOGLE_CLIENT_ID;
		const clientSecret = c.env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error('Google OAuth credentials not configured');
			return c.json({ error: 'OAuth not configured' }, 500);
		}

		// Exchange code for tokens using Google's token endpoint
		const tokenParams = new URLSearchParams({
			code: body.code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: body.redirectUri,
			grant_type: 'authorization_code',
		});

		// Add code_verifier if provided (PKCE)
		if (body.codeVerifier) {
			tokenParams.set('code_verifier', body.codeVerifier);
		}

		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: tokenParams.toString(),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token exchange failed:', tokenResponse.status, errorText);
			return c.json(
				{ error: 'Token exchange failed', details: errorText },
				tokenResponse.status,
			);
		}

		const tokenData = await tokenResponse.json() as {
			access_token: string;
			refresh_token?: string;
			id_token?: string;
			expires_in?: number;
			token_type?: string;
		};

		// Return tokens to frontend
		return c.json({
			accessToken: tokenData.access_token,
			refreshToken: tokenData.refresh_token,
			idToken: tokenData.id_token,
			expiresIn: tokenData.expires_in,
			tokenType: tokenData.token_type || 'Bearer',
		});
	} catch (error) {
		console.error('Error in OAuth exchange:', error);
		return c.json(
			{ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
			500,
		);
	}
});

export default auth;

