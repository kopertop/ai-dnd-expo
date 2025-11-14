/**
 * Auth Store
 * 
 * Manages authentication state and user session using better-auth
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authClient from '@/services/auth/better-auth-client';

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
	
	// Actions
	initialize: () => Promise<void>;
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

			signInWithGoogle: async () => {
				set({ isLoading: true, error: null });
				try {
					await authClient.signIn.social({
						provider: 'google',
						callbackURL: typeof window !== 'undefined' ? window.location.origin : '/',
					});
					// Note: The actual redirect happens, so we'll refresh session after redirect
				} catch (error) {
					console.error('Google sign-in failed:', error);
					set({ 
						isLoading: false,
						error: error instanceof Error ? error.message : 'Google sign-in failed',
					});
					throw error;
				}
			},

			signInWithApple: async () => {
				set({ isLoading: true, error: null });
				try {
					await authClient.signIn.social({
						provider: 'apple',
						callbackURL: typeof window !== 'undefined' ? window.location.origin : '/',
					});
					// Note: The actual redirect happens, so we'll refresh session after redirect
				} catch (error) {
					console.error('Apple sign-in failed:', error);
					set({ 
						isLoading: false,
						error: error instanceof Error ? error.message : 'Apple sign-in failed',
					});
					throw error;
				}
			},

			signInWithEmail: async (email: string) => {
				set({ isLoading: true, error: null });
				try {
					await authClient.signIn.email({
						email,
						callbackURL: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback',
					});
					// Magic link sent - user will click link in email
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

