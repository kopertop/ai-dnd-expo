/**
 * Auth Callback Page
 *
 * Handles OAuth callbacks from Better Auth
 */

import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/use-auth-store';

const AuthCallbackScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const { refreshSession, initialize } = useAuthStore();

	useEffect(() => {
		const handleCallback = async () => {
			try {
				// Refresh session to get the new auth state
				await refreshSession();
				// Also initialize to ensure state is up to date
				await initialize();

				// Redirect to home after a brief delay
				setTimeout(() => {
					router.replace('/');
				}, 500);
			} catch (error) {
				console.error('Auth callback error:', error);
				// Redirect to login on error
				setTimeout(() => {
					router.replace('/login');
				}, 1000);
			}
		};

		handleCallback();
	}, [params]);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Completing Sign In',
					headerShown: false,
				}}
			/>
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText style={styles.text}>Completing sign in...</ThemedText>
			</ThemedView>
		</>
	);
};

AuthCallbackScreen.displayName = 'AuthCallback';

export default AuthCallbackScreen;

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


