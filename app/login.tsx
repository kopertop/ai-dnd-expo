/**
 * Login Page
 *
 * Provides Google authentication using expo-auth-template
 * Apple authentication is disabled for now
 */
import { GoogleSigninButton, useAuth } from 'expo-auth-template/frontend';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/services/config/api-base-url';

const LoginScreen: React.FC = () => {
	const { session, user, isLoading: authLoading } = useAuth();

	// Redirect if already authenticated
	useEffect(() => {
		if (!authLoading && session && user) {
			router.replace('/');
		}
	}, [session, user, authLoading]);

	// Try to get from Constants first (works for static exports), then fall back to process.env
	let GOOGLE_CLIENT_ID = '';

	try {
		// Use dynamic import to avoid issues if expo-constants is not available
		const Constants = require('expo-constants') as typeof import('expo-constants');
		const extra = Constants.default?.expoConfig?.extra;
		GOOGLE_CLIENT_ID = extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
	} catch {
		// expo-constants not available, use process.env
		GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
	}

	console.log('** GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID);
	console.log('** API_BASE_URL (from shared config)', API_BASE_URL);

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title" style={styles.title}>
				Welcome to AI D&D
			</ThemedText>
			<ThemedText style={styles.subtitle}>
				Sign in to continue your adventure
			</ThemedText>

			{/* Google Sign In */}
			{GOOGLE_CLIENT_ID ? (
				<GoogleSigninButton
					clientId={GOOGLE_CLIENT_ID}
					apiBaseUrl={API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`}
				/>
			) : (
				<ThemedView style={styles.errorContainer}>
					<ThemedText style={styles.errorText}>
						Google Sign-In is not configured.{'\n'}
						Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.
					</ThemedText>
				</ThemedView>
			)}
			<Text>API_BASE_URL: {API_BASE_URL}</Text>
		</ThemedView>
	);
};

LoginScreen.displayName = 'Login';

export default LoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	title: {
		marginBottom: 10,
		textAlign: 'center',
	},
	subtitle: {
		marginBottom: 40,
		textAlign: 'center',
		opacity: 0.7,
	},
	button: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginBottom: 15,
		minHeight: 50,
	},
	appleButton: {
		backgroundColor: '#000',
	},
	appleButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	errorContainer: {
		width: '100%',
		padding: 16,
		backgroundColor: 'rgba(255, 0, 0, 0.1)',
		borderRadius: 8,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: 'rgba(255, 0, 0, 0.3)',
	},
	errorText: {
		color: '#d32f2f',
		textAlign: 'center',
		fontSize: 14,
	},
});
