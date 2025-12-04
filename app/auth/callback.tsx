/**
 * Auth Callback Page
 *
 * Handles OAuth callbacks from Better Auth
 */

import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from 'expo-auth-template/frontend';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const AuthCallbackScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const { session, user } = useAuth();

	useEffect(() => {
		// Package handles OAuth callbacks automatically
		// Just redirect based on auth state
		const timer = setTimeout(() => {
			if (session && user) {
				router.replace('/');
			} else {
				router.replace('/login');
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [session, user, params]);

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


