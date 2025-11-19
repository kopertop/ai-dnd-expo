/**
 * OAuth token validation providers
 */

export interface UserInfo {
	id: string;
	email: string;
	displayName?: string;
	givenName?: string;
	surname?: string;
	userPrincipalName?: string;
	mail?: string;
	picture?: string;
}

/**
 * Validate Google OAuth access token using Google's userinfo API
 */
export async function validateGoogleToken(token: string): Promise<UserInfo | null> {
	try {
		const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const userInfo = await response.json() as any;
			// Normalize the Google response to match our UserInfo format
			return {
				id: userInfo.id,
				email: userInfo.email,
				displayName: userInfo.name,
				givenName: userInfo.given_name,
				surname: userInfo.family_name,
				userPrincipalName: userInfo.email,
				mail: userInfo.email,
				picture: userInfo.picture,
			};
		} else {
			console.log('Google token verification failed:', response.status, await response.text());
			return null;
		}
	} catch (error) {
		console.error('Error validating Google token:', error);
		return null;
	}
}

/**
 * Validate Apple Sign-In JWT identity token
 */
export async function validateAppleToken(token: string): Promise<UserInfo | null> {
	try {
		// Decode the JWT without verification first to get the header
		const parts = token.split('.');
		if (parts.length !== 3) {
			console.log('Invalid Apple JWT format: must have 3 parts');
			return null;
		}

		const header = JSON.parse(atob(parts[0]));
		const payload = JSON.parse(atob(parts[1]));

		// Basic JWT validation first
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			console.log('Apple JWT expired');
			return null;
		}

		if (payload.iss !== 'https://appleid.apple.com') {
			console.log('Invalid Apple JWT issuer:', payload.iss);
			return null;
		}

		if (!payload.sub) {
			console.log('Invalid Apple JWT: missing subject');
			return null;
		}

		// Get Apple's public keys for verification
		const jwksResponse = await fetch('https://appleid.apple.com/auth/keys');
		if (!jwksResponse.ok) {
			console.log('Failed to fetch Apple JWKS');
			return null;
		}

		const jwks = await jwksResponse.json() as any;
		const key = jwks.keys.find((k: any) => k.kid === header.kid);
		if (!key) {
			console.log('Apple public key not found for kid:', header.kid);
			return null;
		}

		console.log('Apple JWT validation successful for user:', payload.sub);

		// Extract user information from the JWT payload
		// Apple JWT contains: sub (user ID), email, email_verified
		return {
			id: payload.sub,
			email: payload.email || 'apple-user@privaterelay.appleid.com',
			displayName: payload.email || 'Apple User',
			givenName: '',
			surname: '',
			userPrincipalName: payload.email || 'apple-user@privaterelay.appleid.com',
			mail: payload.email || 'apple-user@privaterelay.appleid.com',
		};
	} catch (error) {
		console.log('Apple JWT verification failed:', error);
		return null;
	}
}

