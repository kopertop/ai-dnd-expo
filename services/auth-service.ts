import { TokenResponse } from 'expo-auth-session';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/services/config/api-base-url';
import { deviceTokenService } from '@/services/device-token-service';
import { secureStoreService } from '@/services/secure-store-service';
import type { User } from '@/types/models';

export type UserSession = {
	id: string;
	name: string;
	email: string;
	accessToken?: string;
	idToken?: string;
	refreshToken?: string;
	deviceToken?: string;
	provider?: 'google' | 'apple';
};

export const GOOGLE_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
export const GOOGLE_REDIRECT_URI = Platform.select({
	ios: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI_IOS || 'ai-dnd://login',
	web: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI_WEB || 'http://localhost:8081/login',
	default: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI || 'ai-dnd://login',
}) || 'ai-dnd://login';
console.log('GOOGLE_REDIRECT_URI', GOOGLE_REDIRECT_URI);

export class UnauthorizedError extends Error {
	constructor(message: string = 'Unauthorized') {
		super(message);
		this.name = 'UnauthorizedError';
	}
}

class AuthService {
	private currentSession: UserSession | null = null;
	private currentUser: User | null = null;
	private sessionListeners: ((session: UserSession | null) => void)[] = [];
	private userListeners: ((user: User | null) => void)[] = [];
	private errorListeners: ((error: string | null) => void)[] = [];
	private authError: string | null = null;
	private isInitialized = false;
	private initPromise: Promise<void> | null = null;

	constructor() {
		this.initPromise = this.initialize();
	}

	private async initialize() {
		if (this.isInitialized) return;

		console.log('AuthService: Starting initialization');
		const storageInfo = secureStoreService.getStorageInfo();
		console.log('AuthService storage info:', storageInfo);

		try {
			await this.loadStoredSession();
			await this.loadStoredUser();
			this.isInitialized = true;
			console.log('AuthService: Initialization complete', {
				hasSession: !!this.currentSession,
				hasUser: !!this.currentUser,
				sessionEmail: this.currentSession?.email,
			});
		} catch (error) {
			console.error('AuthService: Initialization failed:', error);
			this.isInitialized = true; // Mark as initialized even on error to prevent hanging
		}
	}

	async waitForInitialization(): Promise<void> {
		if (this.initPromise) {
			await this.initPromise;
		}
	}

	async getSession(): Promise<UserSession | null> {
		await this.waitForInitialization();
		return this.currentSession;
	}

	async getUser(): Promise<User | null> {
		await this.waitForInitialization();

		// If we have a session, try to fetch user from API
		if (this.currentSession && !this.currentUser) {
			await this.fetchUserFromAPI();
		}

		return this.currentUser;
	}

	/**
	 * Fetch user from API using current session
	 */
	private async fetchUserFromAPI(): Promise<User | null> {
		if (!this.currentSession) {
			return null;
		}

		try {
			// Determine which auth header to use
			let authHeader = '';
			if (this.currentSession.deviceToken) {
				authHeader = `Device ${this.currentSession.deviceToken}`;
			} else if (this.currentSession.accessToken && this.currentSession.provider) {
				authHeader = `Bearer ${this.currentSession.accessToken} ${this.currentSession.provider}`;
			} else if (this.currentSession.idToken && this.currentSession.provider) {
				authHeader = `Bearer ${this.currentSession.idToken} ${this.currentSession.provider}`;
			}

			if (!authHeader) {
				console.warn('No valid auth token available for fetching user');
				return null;
			}

			const response = await fetch(`${API_BASE_URL}/api/me`, {
				method: 'GET',
				headers: {
					'Authorization': authHeader,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const user = await response.json();
				await this.setUser(user);
				return user;
			} else {
				console.warn('Failed to fetch user from API:', response.status);
				return null;
			}
		} catch (error) {
			console.error('Error fetching user from API:', error);
			return null;
		}
	}

	getAuthError(): string | null {
		return this.authError;
	}

	setAuthError(error: string | null) {
		this.authError = error;
		this.notifyErrorListeners();
	}

	// Event listeners
	onSessionChange(callback: (session: UserSession | null) => void): () => void {
		this.sessionListeners.push(callback);
		callback(this.currentSession); // Call immediately with current session
		return () => {
			this.sessionListeners = this.sessionListeners.filter(cb => cb !== callback);
		};
	}

	onUserChange(callback: (user: User | null) => void): () => void {
		this.userListeners.push(callback);
		callback(this.currentUser); // Call immediately with current user
		return () => {
			this.userListeners = this.userListeners.filter(cb => cb !== callback);
		};
	}

	onAuthError(callback: (error: string | null) => void): () => void {
		this.errorListeners.push(callback);
		callback(this.authError); // Call immediately with current error
		return () => {
			this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
		};
	}

	private notifySessionListeners() {
		for (const listener of this.sessionListeners) {
			listener(this.currentSession);
		}
	}

	private notifyUserListeners() {
		for (const listener of this.userListeners) {
			listener(this.currentUser);
		}
	}

	private notifyErrorListeners() {
		for (const listener of this.errorListeners) {
			listener(this.authError);
		}
	}

	// Session management
	async signIn(tokens?: TokenResponse): Promise<UserSession | null> {
		console.log('AuthService.signIn', tokens);

		if (tokens) {
			try {
				await secureStoreService.setItemAsync('authTokens', JSON.stringify(tokens));
				console.log('AuthService: Tokens stored securely');
			} catch (error) {
				console.warn('Could not store auth tokens securely:', error);
			}

			return this.signInWithTokenResponse(tokens);
		}

		return null;
	}

	async signInWithTokenResponse(response: TokenResponse): Promise<UserSession> {
		console.log('Processing token response:', response);

		let userInfo;
		if (response.accessToken) {
			try {
				const userInfoResponse = await fetch(GOOGLE_INFO_URL, {
					headers: {
						Authorization: `Bearer ${response.accessToken}`,
					},
				});

				if (userInfoResponse.ok) {
					userInfo = await userInfoResponse.json();
					console.log('User info from Google:', userInfo);
				} else {
					console.error('Failed to fetch user info from Google');
				}
			} catch (error) {
				console.error('Error fetching user info:', error);
			}
		}

		const session: UserSession = {
			id: userInfo?.id || response.idToken || 'unknown',
			name: userInfo?.name || 'Unknown User',
			email: userInfo?.email || 'no-email@example.com',
			accessToken: response.accessToken || undefined,
			idToken: response.idToken || undefined,
			refreshToken: response.refreshToken || undefined,
			provider: 'google',
		};

		await this.setSession(session);

		// Generate and register device token for persistent authentication
		console.log('Generating device token for persistent authentication...');
		const deviceToken = await this.generateAndRegisterDeviceToken();
		if (deviceToken) {
			console.log('Device token generated successfully');
		} else {
			console.warn('Failed to generate device token, session will not persist');
		}

		// Fetch user from API after device token registration (which creates/updates user in DB)
		console.log('Fetching user from API...');
		const user = await this.fetchUserFromAPI();
		if (user) {
			console.log('User fetched successfully:', user.email);
		} else {
			console.warn('Failed to fetch user from API after sign-in');
		}

		return session;
	}

	async signInWithApple(identityToken: string, appleUser?: { fullName?: { givenName?: string; familyName?: string } | null; email?: string } | null): Promise<UserSession> {
		console.log('Processing Apple Sign In');

		try {
			// Decode the identity token to get user info
			const payload = this.decodeJWT(identityToken);

			if (!payload || !payload.sub) {
				throw new Error('Invalid Apple identity token: missing payload or subject');
			}

			// Validate token expiration
			const now = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < now) {
				throw new Error('Apple identity token has expired');
			}

			// Validate issuer
			if (payload.iss !== 'https://appleid.apple.com') {
				throw new Error('Invalid Apple identity token: wrong issuer');
			}

			const session: UserSession = {
				id: payload.sub,
				name: appleUser?.fullName ? `${appleUser.fullName.givenName || ''} ${appleUser.fullName.familyName || ''}`.trim() : 'Apple User',
				email: appleUser?.email || payload.email || 'apple-user@privaterelay.appleid.com',
				idToken: identityToken,
				provider: 'apple',
			};

			console.log('Apple Sign In session created:', { id: session.id, email: session.email });

			await this.setSession(session);

			// Generate and register device token for persistent authentication
			console.log('Generating device token for persistent authentication...');
			const deviceToken = await this.generateAndRegisterDeviceToken();
			if (deviceToken) {
				console.log('Device token generated successfully');
			} else {
				console.warn('Failed to generate device token, session will not persist');
			}

			// Fetch user from API after device token registration (which creates/updates user in DB)
			console.log('Fetching user from API...');
			const fetchedUser = await this.fetchUserFromAPI();
			if (fetchedUser) {
				console.log('User fetched successfully:', fetchedUser.email);
			} else {
				console.warn('Failed to fetch user from API after sign-in');
			}

			return session;
		} catch (error) {
			console.error('Error processing Apple Sign In:', error);
			throw new Error(`Apple Sign In failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private decodeJWT(token: string): any {
		try {
			if (!token || typeof token !== 'string') {
				throw new Error('Invalid token: not a string');
			}

			const parts = token.split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid JWT format: must have 3 parts');
			}

			const base64Url = parts[1];
			if (!base64Url) {
				throw new Error('Invalid JWT format: missing payload');
			}

			const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
			const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			}).join(''));

			const payload = JSON.parse(jsonPayload);
			console.log('JWT payload decoded successfully:', { sub: payload.sub, iss: payload.iss, exp: payload.exp });
			return payload;
		} catch (error) {
			console.error('Error decoding JWT:', error);
			throw new Error(`JWT decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async signInWithDeviceToken(): Promise<UserSession | null> {
		const deviceToken = await deviceTokenService.getDeviceToken();
		if (!deviceToken) {
			console.log('No device token available');
			return null;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Device ${deviceToken}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const user = await response.json();
				console.log('Device token authentication successful');

				const session: UserSession = {
					id: user.id,
					name: user.name,
					email: user.email,
					deviceToken,
					provider: undefined, // Device tokens don't have a provider
				};

				await this.setSession(session);
				await this.setUser(user);
				return session;
			} else {
				console.warn('Device token authentication failed:', response.status);
				await deviceTokenService.clearDeviceToken();
				return null;
			}
		} catch (error) {
			console.error('Error authenticating with device token:', error);
			return null;
		}
	}

	async signOut(): Promise<void> {
		console.log('Signing out user');

		// Clear stored session, user, and auth tokens
		await secureStoreService.deleteItemAsync('userSession');
		await secureStoreService.deleteItemAsync('currentUser');
		await secureStoreService.deleteItemAsync('authTokens');

		// Clear device token
		await deviceTokenService.clearDeviceToken();

		// Clear memory
		this.currentSession = null;
		this.currentUser = null;
		this.authError = null;

		// Notify listeners
		this.notifySessionListeners();
		this.notifyUserListeners();
		this.notifyErrorListeners();
	}

	/**
	 * Generate and register a device token for persistent authentication
	 */
	async generateAndRegisterDeviceToken(): Promise<string | null> {
		if (!this.currentSession?.accessToken && !this.currentSession?.idToken) {
			console.error('No valid OAuth token available for device token registration');
			return null;
		}

		try {
			// Generate device token
			const deviceToken = await deviceTokenService.generateAndStoreDeviceToken();
			const deviceInfo = deviceTokenService.getDeviceInfo();

			// Register device token with backend using OAuth token
			const response = await fetch(`${API_BASE_URL}/api/device-tokens`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.currentSession.accessToken || this.currentSession.idToken} ${this.currentSession.provider || 'google'}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					deviceToken,
					deviceName: deviceInfo.deviceName,
					devicePlatform: deviceInfo.devicePlatform,
					userAgent: deviceInfo.userAgent,
				}),
			});

			if (response.ok) {
				console.log('Device token registered successfully');

				// Update current session with device token
				const updatedSession: UserSession = {
					...this.currentSession,
					deviceToken,
				};
				await this.setSession(updatedSession);

				return deviceToken;
			} else {
				const errorText = await response.text();
				console.error('Device token registration failed:', response.status, errorText);
				// Clean up the local token if registration failed
				await deviceTokenService.clearDeviceToken();
				return null;
			}
		} catch (error) {
			console.error('Error generating and registering device token:', error);
			await deviceTokenService.clearDeviceToken();
			return null;
		}
	}

	// User management
	async setUser(user: User | null) {
		this.currentUser = user;

		// Store user in secure storage
		if (user) {
			await secureStoreService.setItemAsync('currentUser', JSON.stringify(user));
		} else {
			await secureStoreService.deleteItemAsync('currentUser');
		}

		this.notifyUserListeners();
	}

	// Private methods
	private async setSession(session: UserSession) {
		this.currentSession = session;

		// Store session in secure storage
		await secureStoreService.setItemAsync('userSession', JSON.stringify(session));

		// Clear any auth errors
		this.authError = null;

		// Notify listeners
		this.notifySessionListeners();
		this.notifyErrorListeners();

		console.log('Session updated:', {
			id: session.id,
			email: session.email,
			provider: session.provider,
			hasAccessToken: !!session.accessToken,
			hasIdToken: !!session.idToken,
		});
	}

	private async loadStoredSession() {
		try {
			const storedSession = await secureStoreService.getItemAsync('userSession');
			if (storedSession) {
				this.currentSession = JSON.parse(storedSession);
				console.log('Loaded stored session:', {
					id: this.currentSession?.id,
					email: this.currentSession?.email,
					provider: this.currentSession?.provider,
					hasAccessToken: !!this.currentSession?.accessToken,
					hasRefreshToken: !!this.currentSession?.refreshToken,
					hasDeviceToken: !!this.currentSession?.deviceToken,
				});

				// Check for device token and load if available
				const storedDeviceToken = await deviceTokenService.getDeviceToken();
				if (storedDeviceToken && this.currentSession && !this.currentSession.deviceToken) {
					console.log('Found stored device token, adding to session');
					this.currentSession.deviceToken = storedDeviceToken;
					// Update stored session with device token
					await secureStoreService.setItemAsync('userSession', JSON.stringify(this.currentSession));
				}

				// For device token authentication, skip OAuth token validation
				if (this.currentSession?.deviceToken) {
					console.log('Device token available, will use for authentication');
					return;
				}

				// For Apple auth, we don't need to validate tokens
				if (this.currentSession?.provider === 'apple') {
					console.log('Apple session loaded, skipping token validation');
					return;
				}

				// Validate token if available (but don't fail session loading if validation fails)
				if (this.currentSession?.accessToken) {
					try {
						await this.validateToken();
					} catch (error) {
						console.warn('Token validation failed during session load, but keeping session:', error);
						// Don't clear the session here - let it try to work and only clear if API calls fail
					}
				}
			} else {
				console.log('No stored session found');
			}
		} catch (error) {
			console.error('Error loading stored session:', error);
			// Clear potentially corrupted session data
			await secureStoreService.deleteItemAsync('userSession');
		}
	}

	private async loadStoredUser() {
		try {
			const storedUser = await secureStoreService.getItemAsync('currentUser');
			if (storedUser) {
				this.currentUser = JSON.parse(storedUser);
				console.log('Loaded stored user:', {
					id: this.currentUser?.id,
					email: this.currentUser?.email,
					name: this.currentUser?.name,
				});
			}
		} catch (error) {
			console.error('Error loading stored user:', error);
		}
	}

	private async validateToken(): Promise<boolean> {
		if (!this.currentSession?.accessToken) {
			console.log('No access token to validate');
			return false;
		}

		try {
			console.log('Validating access token...');
			const response = await fetch(GOOGLE_INFO_URL, {
				headers: {
					Authorization: `Bearer ${this.currentSession.accessToken}`,
				},
			});

			if (!response.ok) {
				console.log('Token validation failed with status:', response.status);
				return false;
			} else {
				console.log('Token validation successful');
				return true;
			}
		} catch (error) {
			console.error('Error during token validation:', error);
			return false;
		}
	}
}

// Export singleton instance
export const authService = new AuthService();

