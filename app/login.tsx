/**
 * Login Page
 *
 * Provides authentication options: Google, Apple, and Email magic link
 */

import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Platform,
	StyleSheet,
	TextInput,
	TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/use-auth-store';

const LoginScreen: React.FC = () => {
	const [email, setEmail] = useState('');
	const {
		isLoading,
		error,
		signInWithGoogle,
		signInWithApple,
		signInWithEmail,
		initialize,
		isAuthenticated,
	} = useAuthStore();

	// Don't call initialize here - AuthGuard already handles it
	// useEffect(() => {
	// 	initialize();
	// }, []);

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

	const handleEmailSignIn = async () => {
		if (!email.trim()) {
			Alert.alert('Email Required', 'Please enter your email address');
			return;
		}

		try {
			await signInWithEmail(email.trim());
			Alert.alert(
				'Magic Link Sent',
				'Check your email for a sign-in link. Click the link to complete authentication.',
			);
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

				{/* Apple Sign In (iOS and Web only) */}
				{(Platform.OS === 'ios' || Platform.OS === 'web') && (
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

				{/* Divider */}
				<ThemedView style={styles.dividerContainer}>
					<ThemedView style={styles.dividerLine} />
					<ThemedText style={styles.dividerText}>OR</ThemedText>
					<ThemedView style={styles.dividerLine} />
				</ThemedView>

				{/* Email Magic Link */}
				<TextInput
					style={styles.emailInput}
					placeholder="Enter your email"
					placeholderTextColor="#9ca3af"
					value={email}
					onChangeText={setEmail}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					editable={!isLoading}
				/>

				<TouchableOpacity
					style={[styles.button, styles.emailButton]}
					onPress={handleEmailSignIn}
					disabled={isLoading || !email.trim()}
				>
					{isLoading ? (
						<ActivityIndicator color="#3B2F1B" />
					) : (
						<>
							<Feather name="send" size={20} color="#3B2F1B" style={styles.buttonIcon} />
							<ThemedText style={styles.emailButtonText}>Send Magic Link</ThemedText>
						</>
					)}
				</TouchableOpacity>
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
	emailButton: {
		backgroundColor: '#C9B037',
	},
	emailButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	buttonIcon: {
		marginRight: 10,
	},
	dividerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		marginVertical: 20,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: '#e2e8f0',
	},
	dividerText: {
		marginHorizontal: 15,
		opacity: 0.5,
		fontSize: 14,
	},
	emailInput: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginBottom: 15,
		fontSize: 16,
		backgroundColor: '#f8fafc',
		color: '#11181C',
	},
});


