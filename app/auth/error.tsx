import { Stack, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const parseErrorMessage = (errorParam: unknown) => {
	if (typeof errorParam !== 'string') {
		return 'Authentication failed. Please try again.';
	}

	try {
		const decoded = decodeURIComponent(errorParam.replace(/\+/g, ' '));
		if (decoded.trim().length === 0) {
			return 'Authentication failed. Please try again.';
		}
		return decoded;
	} catch {
		return 'Authentication failed. Please try again.';
	}
};

const AuthErrorScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const message = parseErrorMessage(params.error);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Authentication Error',
					headerShown: false,
				}}
			/>
			<ThemedView style={styles.container}>
				<ThemedText type="title" style={styles.title}>
					Sign-in Error
				</ThemedText>
				<ThemedText style={styles.message}>{message}</ThemedText>
				<TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
					<ThemedText style={styles.buttonText}>Back to Login</ThemedText>
				</TouchableOpacity>
			</ThemedView>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		marginBottom: 16,
		textAlign: 'center',
	},
	message: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 24,
	},
	button: {
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 8,
		backgroundColor: '#C0392B',
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
});

export default AuthErrorScreen;
