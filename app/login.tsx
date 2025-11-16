/**
 * Login Page
 *
 * Provides Google and Apple (iOS) authentication via Better Auth
 */

import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/use-auth-store';

const LoginScreen: React.FC = () => {
	const {
		isLoading,
		error,
		providers,
		fetchProviders,
		signInWithGoogle,
		signInWithApple,
		isAuthenticated,
	} = useAuthStore();

	// Don't call initialize here - AuthGuard already handles it
	// useEffect(() => {
	// 	initialize();
	// }, []);

	useEffect(() => {
		void fetchProviders();
	}, [fetchProviders]);

	useEffect(() => {
		// Redirect if already authenticated (but wait for loading to complete)
		if (!isLoading && isAuthenticated) {
			router.replace('/');
		}
	}, [isAuthenticated, isLoading]);

	useEffect(() => {
		// Show error alerts
		if (error) {
			Alert.alert('Authentication Error', error);
		}
	}, [error]);

	const handleGoogleSignIn = async () => {
		try {
			await signInWithGoogle();
		} catch (err) {
			// Error already handled in store
		}
	};

	const handleAppleSignIn = async () => {
		try {
			await signInWithApple();
		} catch (err) {
			// Error already handled in store
		}
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Login',
					headerShown: false,
				}}
			/>
			<ThemedView style={styles.container}>
				<ThemedText type="title" style={styles.title}>
					Welcome to AI D&D
				</ThemedText>
				<ThemedText style={styles.subtitle}>
					Sign in to continue your adventure
				</ThemedText>

				{/* Google Sign In */}
				{providers.google && (
					<TouchableOpacity
						style={[styles.button, styles.googleButton]}
						onPress={handleGoogleSignIn}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<>
								<Feather name="mail" size={20} color="#fff" style={styles.buttonIcon} />
								<ThemedText style={styles.googleButtonText}>Sign in with Google</ThemedText>
							</>
						)}
					</TouchableOpacity>
				)}

				{/* Apple Sign In (required on iOS) */}
				{Platform.OS === 'ios' && providers.apple && (
					<TouchableOpacity
						style={[styles.button, styles.appleButton]}
						onPress={handleAppleSignIn}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<>
								<Feather name="smartphone" size={20} color="#fff" style={styles.buttonIcon} />
								<ThemedText style={styles.appleButtonText}>Sign in with Apple</ThemedText>
							</>
						)}
					</TouchableOpacity>
				)}

			</ThemedView>
		</>
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
	googleButton: {
		backgroundColor: '#4285F4',
	},
	googleButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	appleButton: {
		backgroundColor: '#000',
	},
	appleButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	buttonIcon: {
		marginRight: 10,
	},
});


