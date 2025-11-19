import { useEffect, useState } from 'react';

import { authService, type UserSession } from '@/services/auth-service';
import type { User } from '@/types/models';

export function useAuth() {
	const [session, setSession] = useState<UserSession | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Load initial session and user
		const loadAuth = async () => {
			try {
				setIsLoading(true);
				const [currentSession, currentUser] = await Promise.all([
					authService.getSession(),
					authService.getUser(),
				]);
				setSession(currentSession);
				setUser(currentUser);
			} catch (err) {
				console.error('Error loading auth:', err);
				setError(err instanceof Error ? err.message : 'Failed to load authentication');
			} finally {
				setIsLoading(false);
			}
		};

		void loadAuth();

		// Subscribe to session and user changes
		const unsubscribeSession = authService.onSessionChange(setSession);
		const unsubscribeUser = authService.onUserChange(setUser);
		const unsubscribeError = authService.onAuthError(setError);

		return () => {
			unsubscribeSession();
			unsubscribeUser();
			unsubscribeError();
		};
	}, []);

	return {
		session,
		user,
		isLoading,
		error,
		isAuthenticated: !!session && !!user,
		signOut: () => authService.signOut(),
	};
}

