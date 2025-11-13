/**
 * Auth Store
 * 
 * Manages authentication state and user session
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAuthClient, AuthClient, AuthSession, AuthUser } from '@/services/auth/auth-client';

interface AuthState {
	user: AuthUser | null;
	session: AuthSession | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	authClient: AuthClient | null;
	
	// Actions
	initialize: () => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signInWithApple: () => Promise<void>;
	signOut: () => Promise<void>;
	refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			session: null,
			isAuthenticated: false,
			isLoading: false,
			authClient: null,

			initialize: async () => {
				set({ isLoading: true });
				try {
					const client = createAuthClient();
					const session = await client.getSession();
					
					set({
						authClient: client,
						session,
						user: session?.user || null,
						isAuthenticated: !!session,
						isLoading: false,
					});
				} catch (error) {
					console.error('Failed to initialize auth:', error);
					set({ isLoading: false });
				}
			},

			signInWithGoogle: async () => {
				set({ isLoading: true });
				try {
					const client = get().authClient || createAuthClient();
					const session = await client.signInWithGoogle();
					
					set({
						authClient: client,
						session,
						user: session.user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					console.error('Google sign-in failed:', error);
					set({ isLoading: false });
					throw error;
				}
			},

			signInWithApple: async () => {
				set({ isLoading: true });
				try {
					const client = get().authClient || createAuthClient();
					const session = await client.signInWithApple();
					
					set({
						authClient: client,
						session,
						user: session.user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					console.error('Apple sign-in failed:', error);
					set({ isLoading: false });
					throw error;
				}
			},

			signOut: async () => {
				set({ isLoading: true });
				try {
					const client = get().authClient;
					if (client) {
						await client.signOut();
					}
					
					set({
						session: null,
						user: null,
						isAuthenticated: false,
						isLoading: false,
					});
				} catch (error) {
					console.error('Sign-out failed:', error);
					set({ isLoading: false });
				}
			},

			refreshSession: async () => {
				try {
					const client = get().authClient || createAuthClient();
					const session = await client.getSession();
					
					set({
						authClient: client,
						session,
						user: session?.user || null,
						isAuthenticated: !!session,
					});
				} catch (error) {
					console.error('Session refresh failed:', error);
				}
			},
		}),
		{
			name: 'auth-storage',
			partialize: (state) => ({
				user: state.user,
				session: state.session,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);

