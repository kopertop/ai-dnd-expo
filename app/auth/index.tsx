/**
 * Auth Index Page
 *
 * Handles OAuth callbacks that redirect to /auth (without /callback)
 * Processes the OAuth code and exchanges it for a device token
 */

import { authService } from 'expo-auth-template/frontend';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const AuthIndexScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const [processing, setProcessing] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const processedCode = useRef<string | null>(null);

	useEffect(() => {
		async function handleAuthCallback() {
			const code = params.code as string | undefined;
			const errorParam = params.error as string | undefined;

			// Check for error first
			if (errorParam) {
				const errorMessage = decodeURIComponent(errorParam);
				setError(errorMessage);
				setProcessing(false);
				setTimeout(() => {
					router.replace(`/auth/error?error=${encodeURIComponent(errorMessage)}` as any);
				}, 2000);
				return;
			}

			// Check if we have a code
			if (!code) {
				// No code, might just be navigating to /auth
				setTimeout(() => {
					router.replace('/login');
				}, 1000);
				return;
			}

			// Prevent processing the same code twice
			if (code === processedCode.current) {
				return;
			}
			processedCode.current = code;

			try {
				setProcessing(true);
				setError(null);

				// Get the redirect URI (should match what was used in the auth request)
				const redirectUri = typeof window !== 'undefined'
					? `${window.location.origin}/auth`
					: '/auth';

				// Call the auth service to exchange the code for a device token
				await authService.signInWithGoogleCallback({
					code,
					redirect_uri: redirectUri,
					// Note: code_verifier would need to be stored/retrieved if using PKCE
					// For now, the backend will handle it if provided
				});

				// Success - redirect to home
				router.replace('/');
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
				console.error('Auth callback error:', err);
				setError(errorMessage);
				setProcessing(false);
				// Redirect to error page after a delay
				setTimeout(() => {
					router.replace(`/auth/error?error=${encodeURIComponent(errorMessage)}` as any);
				}, 2000);
			}
		}

		handleAuthCallback();
	}, [params.code, params.error]);

	return (
		<ThemedView style={styles.container}>
			<ActivityIndicator size="large" color="#C9B037" />
			<ThemedText style={styles.text}>
				{error ? `Error: ${error}` : 'Processing authentication...'}
			</ThemedText>
		</ThemedView>
	);
};

AuthIndexScreen.displayName = 'AuthIndex';

export default AuthIndexScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	text: {
		marginTop: 20,
		fontSize: 16,
	},
});
