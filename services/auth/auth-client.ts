/**
 * Authentication Client
 * 
 * Provides Google/Apple sign-in using Expo AuthSession
 * Supports offline token storage and session management
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete auth session for web
if (Platform.OS === 'web') {
	WebBrowser.maybeCompleteAuthSession();
}

export interface AuthUser {
	id: string;
	email: string;
	name?: string;
	picture?: string;
	provider: 'google' | 'apple';
}

export interface AuthSession {
	user: AuthUser;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: number;
}

export interface AuthClientConfig {
	googleClientId?: string;
	googleClientIdWeb?: string;
	appleClientId?: string;
	redirectUri?: string;
}

const AUTH_STORAGE_KEY = '@auth_session';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';

export class AuthClient {
	private config: AuthClientConfig;
	private currentSession: AuthSession | null = null;

	constructor(config: AuthClientConfig = {}) {
		this.config = {
			googleClientId: config.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
			googleClientIdWeb: config.googleClientIdWeb || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
			appleClientId: config.appleClientId || process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
			redirectUri: config.redirectUri || AuthSession.makeRedirectUri(),
		};
		this.loadSession();
	}

	/**
	 * Load session from storage
	 */
	private async loadSession(): Promise<void> {
		try {
			const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
			if (stored) {
				this.currentSession = JSON.parse(stored);
			}
		} catch (error) {
			console.warn('Failed to load auth session:', error);
		}
	}

	/**
	 * Save session to storage
	 */
	private async saveSession(session: AuthSession): Promise<void> {
		try {
			await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
			if (session.refreshToken) {
				await AsyncStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
			}
			this.currentSession = session;
		} catch (error) {
			console.error('Failed to save auth session:', error);
		}
	}

	/**
	 * Clear session from storage
	 */
	private async clearSession(): Promise<void> {
		try {
			await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
			await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
			this.currentSession = null;
		} catch (error) {
			console.error('Failed to clear auth session:', error);
		}
	}

	/**
	 * Sign in with Google
	 */
	async signInWithGoogle(): Promise<AuthSession> {
		const clientId = Platform.OS === 'web' 
			? this.config.googleClientIdWeb 
			: this.config.googleClientId;

		if (!clientId) {
			throw new Error('Google Client ID not configured');
		}

		const discovery = {
			authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
			tokenEndpoint: 'https://oauth2.googleapis.com/token',
			revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
		};

		const request = new AuthSession.AuthRequest({
			clientId,
			scopes: ['openid', 'profile', 'email'],
			responseType: AuthSession.ResponseType.Token,
			redirectUri: this.config.redirectUri,
		});

		try {
			const result = await request.promptAsync(discovery, {
				useProxy: Platform.OS !== 'web',
			});

			if (result.type === 'success') {
				// Fetch user info
				const userInfo = await this.fetchGoogleUserInfo(result.params.access_token);

				const session: AuthSession = {
					user: {
						id: userInfo.sub || userInfo.id,
						email: userInfo.email,
						name: userInfo.name,
						picture: userInfo.picture,
						provider: 'google',
					},
					accessToken: result.params.access_token,
					expiresAt: result.params.expires_in 
						? Date.now() + (result.params.expires_in * 1000)
						: undefined,
				};

				await this.saveSession(session);
				return session;
			} else {
				throw new Error('Google sign-in cancelled or failed');
			}
		} catch (error) {
			console.error('Google sign-in error:', error);
			throw error;
		}
	}

	/**
	 * Fetch Google user info
	 */
	private async fetchGoogleUserInfo(accessToken: string): Promise<any> {
		const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error('Failed to fetch Google user info');
		}

		return await response.json();
	}

	/**
	 * Sign in with Apple
	 */
	async signInWithApple(): Promise<AuthSession> {
		if (Platform.OS !== 'ios' && Platform.OS !== 'web') {
			throw new Error('Apple Sign-In is only available on iOS and Web');
		}

		if (!this.config.appleClientId) {
			throw new Error('Apple Client ID not configured');
		}

		const request = new AuthSession.AuthRequest({
			clientId: this.config.appleClientId,
			scopes: [AuthSession.AppleAuthenticationScope.EMAIL, AuthSession.AppleAuthenticationScope.FULL_NAME],
			responseType: AuthSession.ResponseType.Token,
			redirectUri: this.config.redirectUri,
		});

		try {
			const discovery = {
				authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
				tokenEndpoint: 'https://appleid.apple.com/auth/token',
			};

			const result = await request.promptAsync(discovery, {
				useProxy: Platform.OS !== 'web',
			});

			if (result.type === 'success') {
				// Apple provides user info in the ID token
				const userInfo = await this.decodeAppleToken(result.params.id_token);

				const session: AuthSession = {
					user: {
						id: userInfo.sub,
						email: userInfo.email,
						name: userInfo.name,
						provider: 'apple',
					},
					accessToken: result.params.access_token,
					expiresAt: result.params.expires_in 
						? Date.now() + (result.params.expires_in * 1000)
						: undefined,
				};

				await this.saveSession(session);
				return session;
			} else {
				throw new Error('Apple sign-in cancelled or failed');
			}
		} catch (error) {
			console.error('Apple sign-in error:', error);
			throw error;
		}
	}

	/**
	 * Decode Apple ID token (simplified - in production, verify signature)
	 */
	private async decodeAppleToken(idToken: string): Promise<any> {
		// In production, you should verify the JWT signature
		// For now, we'll just decode the payload
		const parts = idToken.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid Apple ID token');
		}

		// Use atob for web, or base64 decode for React Native
		let decoded: string;
		if (Platform.OS === 'web' && typeof atob !== 'undefined') {
			decoded = atob(parts[1]);
		} else {
			// React Native: use base64 decode
			const { Buffer } = require('buffer');
			decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
		}

		const payload = JSON.parse(decoded);
		return payload;
	}

	/**
	 * Get current session
	 */
	async getSession(): Promise<AuthSession | null> {
		if (this.currentSession) {
			// Check if session is expired
			if (this.currentSession.expiresAt && Date.now() > this.currentSession.expiresAt) {
				// Try to refresh
				await this.refreshSession();
			}
		}

		return this.currentSession;
	}

	/**
	 * Refresh session using refresh token
	 */
	private async refreshSession(): Promise<void> {
		const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
		if (!refreshToken) {
			await this.clearSession();
			return;
		}

		// In production, call your backend to refresh the token
		// For now, we'll just clear the session
		console.warn('Token refresh not implemented - clearing session');
		await this.clearSession();
	}

	/**
	 * Sign out
	 */
	async signOut(): Promise<void> {
		await this.clearSession();
	}

	/**
	 * Check if user is authenticated
	 */
	async isAuthenticated(): Promise<boolean> {
		const session = await this.getSession();
		return session !== null;
	}
}

// Helper function to create a client instance
export const createAuthClient = (config?: AuthClientConfig): AuthClient => {
	return new AuthClient(config);
};

