/**
 * Login Page
 *
 * Provides Google authentication using expo-auth-template
 * Apple authentication is disabled for now
 */
import { GoogleSigninButton, useAuth } from 'expo-auth-template/frontend';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const LoginScreen: React.FC = () => {
	const { session, user, isLoading: authLoading } = useAuth();

	// Redirect if already authenticated
	useEffect(() => {
		if (!authLoading && session && user) {
			router.replace('/');
		}
	}, [session, user, authLoading]);

	const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
	const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787/').replace(/\/$/, '') + '/';

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
					apiBaseUrl={API_BASE_URL}
				/>
			) : (
				<ThemedView style={styles.errorContainer}>
					<ThemedText style={styles.errorText}>
						Google Sign-In is not configured.{'\n'}
						Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.
					</ThemedText>
				</ThemedView>
			)}
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
