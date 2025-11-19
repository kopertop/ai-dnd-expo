/**
 * Auth Store
 *
 * Compatibility layer that wraps the new AuthService
 * This allows existing code to continue working while we migrate
 */

import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { authService } from '@/services/auth-service';

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
		google: boolean;
		apple: boolean;
	};

	// Actions
	initialize: () => Promise<void>;
	fetchProviders: () => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signInWithApple: () => Promise<void>;
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
				google: true, // Google is always available
				apple: Platform.OS === 'ios',
			},

			initialize: async () => {
				// Prevent multiple simultaneous initializations
				if (isInitializing || get().isLoading) {
					return;
				}

				isInitializing = true;
				set({ isLoading: true, error: null });
				try {
					// Wait for auth service to initialize
					await authService.waitForInitialization();
					
					const [session, user] = await Promise.all([
						authService.getSession(),
						authService.getUser(),
					]);

					if (session && user) {
						set({
							user: {
								id: user.id,
								email: user.email,
								name: user.name,
								image: user.picture || undefined,
							},
							isAuthenticated: true,
							isLoading: false,
						});
					} else {
						// Try device token auth if no session
						const deviceSession = await authService.signInWithDeviceToken();
						if (deviceSession) {
							const deviceUser = await authService.getUser();
							if (deviceUser) {
								set({
									user: {
										id: deviceUser.id,
										email: deviceUser.email,
										name: deviceUser.name,
										image: deviceUser.picture || undefined,
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
						} else {
							set({
								user: null,
								isAuthenticated: false,
								isLoading: false,
							});
						}
					}
				} catch (error) {
					console.error('Failed to initialize auth:', error);
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
				// Providers are always available based on platform
				set({
					providers: {
						google: true,
						apple: Platform.OS === 'ios',
					},
				});
			},

			signInWithGoogle: async () => {
				set({ isLoading: true, error: null });
				// Google sign-in is handled in the login screen via expo-auth-session
				// This is just a placeholder for compatibility
				set({ isLoading: false });
			},

			signInWithApple: async () => {
				set({ isLoading: true, error: null });
				// Apple sign-in is handled in the login screen via expo-apple-authentication
				// This is just a placeholder for compatibility
				set({ isLoading: false });
			},

			signOut: async () => {
				set({ isLoading: true, error: null });
				try {
					await authService.signOut();

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
					const [session, user] = await Promise.all([
						authService.getSession(),
						authService.getUser(),
					]);

					if (session && user) {
						set({
							user: {
								id: user.id,
								email: user.email,
								name: user.name,
								image: user.picture || undefined,
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

// Subscribe to auth service changes to keep store in sync
authService.onSessionChange(async (session) => {
	const user = await authService.getUser();
	useAuthStore.setState({
		user: user ? {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.picture || undefined,
		} : null,
		isAuthenticated: !!session && !!user,
	});
});

authService.onUserChange(async (user) => {
	const session = await authService.getSession();
	useAuthStore.setState({
		user: user ? {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.picture || undefined,
		} : null,
		isAuthenticated: !!session && !!user,
	});
});

authService.onAuthError((error) => {
	useAuthStore.setState({ error });
});
