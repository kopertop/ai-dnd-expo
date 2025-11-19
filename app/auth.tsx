/**
 * Auth Callback Route (Legacy/Redirect Handler)
 * 
 * This route is kept for backwards compatibility but should redirect to /login
 * where the useAuthRequest hook will handle the OAuth callback properly
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const AuthCallbackScreen: React.FC = () => {
	const params = useLocalSearchParams();

	useEffect(() => {
		// Redirect to login with all params - the useAuthRequest hook will handle it
		if (Object.keys(params).length > 0) {
			const queryString = new URLSearchParams(params as Record<string, string>).toString();
			router.replace(`/login?${queryString}`);
		} else {
			// No params, just redirect to login
			router.replace('/login');
		}
	}, [params]);

	return (
		<ThemedView style={styles.container}>
			<ActivityIndicator size="large" color="#C9B037" />
			<ThemedText style={styles.text}>Redirecting...</ThemedText>
		</ThemedView>
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

