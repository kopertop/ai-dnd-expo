/**
 * Auth Store
 *
 * Manages authentication state and user session using better-auth
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import authClient, { AUTH_BASE_URL } from '@/services/auth/better-auth-client';

const getCallbackURL = () =>
	typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback';

const getErrorCallbackURL = () =>
	typeof window !== 'undefined' ? `${window.location.origin}/auth/error` : '/auth/error';

const extractBetterAuthError = (result: unknown): string | null => {
	if (!result || typeof result !== 'object') {
		return null;
	}

	if (!('error' in result)) {
		return null;
	}

	const errorPayload = (result as { error: unknown }).error;

	if (!errorPayload) {
		return null;
	}

	if (typeof errorPayload === 'string') {
		return errorPayload;
	}

	if (typeof errorPayload === 'object') {
		const message = (errorPayload as { message?: unknown }).message;
		if (typeof message === 'string' && message.trim().length > 0) {
			return message;
		}

		const statusText = (errorPayload as { statusText?: unknown }).statusText;
		if (typeof statusText === 'string' && statusText.trim().length > 0) {
			return statusText;
		}
	}

	return null;
};

interface AuthState {
	user: {
		id: string;
		email: string;
		name?: string | null;
		image?: string | null;
	} | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	providers: {
		magicLink: boolean;
		google: boolean;
		apple: boolean;
	};

	// Actions
	initialize: () => Promise<void>;
	fetchProviders: () => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signInWithApple: () => Promise<void>;
	signInWithEmail: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshSession: () => Promise<void>;
}

// Global flag to prevent multiple simultaneous initializations
let isInitializing = false;

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,
			providers: {
				magicLink: true,
				google: false,
				apple: false,
			},

			initialize: async () => {
				// Prevent multiple simultaneous initializations
				if (isInitializing || get().isLoading) {
					return;
				}

				isInitializing = true;
				set({ isLoading: true, error: null });
				try {
					const session = await authClient.getSession();

					if (session?.data?.user) {
						set({
							user: {
								id: session.data.user.id,
								email: session.data.user.email,
								name: session.data.user.name,
								image: session.data.user.image,
							},
							isAuthenticated: true,
							isLoading: false,
						});
					} else {
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
						});
					}
				} catch (error) {
					console.error('Failed to initialize auth:', error);
					// On error, assume not authenticated (backend might not be running)
					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error: error instanceof Error ? error.message : 'Failed to initialize auth',
					});
				} finally {
					isInitializing = false;
				}
			},

			fetchProviders: async () => {
				const baseUrl = AUTH_BASE_URL || '';
				const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
				const targetUrl = `${normalizedBase}/api/auth/providers`;

				try {
					const response = await fetch(targetUrl, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
						credentials: 'include',
					});

					if (!response.ok) {
						throw new Error(`Failed to load auth providers: ${response.status}`);
					}

					const data = await response.json();

					set({
						providers: {
							magicLink: data?.magicLink ?? true,
							google: Boolean(data?.google),
							apple: Boolean(data?.apple),
						},
					});
				} catch (error) {
					console.error('Failed to fetch auth providers:', error);
					set((state) => ({
						providers: {
							...state.providers,
							magicLink: true,
						},
					}));
				}
			},

			signInWithGoogle: async () => {
				set({ isLoading: true, error: null });
				try {
					const result = await authClient.signIn.social({
						provider: 'google',
						callbackURL: getCallbackURL(),
						errorCallbackURL: getErrorCallbackURL(),
					});

					const errorMessage = extractBetterAuthError(result);
					if (errorMessage) {
						throw new Error(errorMessage);
					}
				} catch (error) {
					console.error('Google sign-in failed:', error);
					set({
						error: error instanceof Error ? error.message : 'Google sign-in failed',
					});
					throw error;
				} finally {
					set({ isLoading: false });
				}
			},

			signInWithApple: async () => {
				set({ isLoading: true, error: null });
				try {
					const result = await authClient.signIn.social({
						provider: 'apple',
						callbackURL: getCallbackURL(),
						errorCallbackURL: getErrorCallbackURL(),
					});

					const errorMessage = extractBetterAuthError(result);
					if (errorMessage) {
						throw new Error(errorMessage);
					}
				} catch (error) {
					console.error('Apple sign-in failed:', error);
					set({
						error: error instanceof Error ? error.message : 'Apple sign-in failed',
					});
					throw error;
				} finally {
					set({ isLoading: false });
				}
			},

			signInWithEmail: async (email: string) => {
				set({ isLoading: true, error: null });
				try {
					const result = await authClient.signIn.magicLink({
						email: email.trim(),
						callbackURL: getCallbackURL(),
						errorCallbackURL: getErrorCallbackURL(),
					});
					console.log('Magic link sign-in response:', result);
					// Magic link sent - user will click link in email
					set({ isLoading: false });
				} catch (error) {
					console.error('Email sign-in failed:', error);
					set({
						isLoading: false,
						error: error instanceof Error ? error.message : 'Failed to send magic link',
					});
					throw error;
				}
			},

			signOut: async () => {
				set({ isLoading: true, error: null });
				try {
					await authClient.signOut();

					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
					});
				} catch (error) {
					console.error('Sign-out failed:', error);
					set({
						isLoading: false,
						error: error instanceof Error ? error.message : 'Sign-out failed',
					});
				}
			},

			refreshSession: async () => {
				try {
					const session = await authClient.getSession();

					if (session?.data?.user) {
						set({
							user: {
								id: session.data.user.id,
								email: session.data.user.email,
								name: session.data.user.name,
								image: session.data.user.image,
							},
							isAuthenticated: true,
						});
					} else {
						set({
							user: null,
							isAuthenticated: false,
						});
					}
				} catch (error) {
					console.error('Session refresh failed:', error);
					set({
						user: null,
						isAuthenticated: false,
					});
				}
			},
		}),
		{
			name: 'auth-storage',
			partialize: (state) => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);

