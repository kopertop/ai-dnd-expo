import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { InviteCodeInput } from '@/components/invite-code-input';
import { ThemedView } from '@/components/themed-view';

const JoinGameScreen: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const insets = useSafeAreaInsets();

	const handleInviteCodeSubmit = async (code: string) => {
		setLoading(true);
		// Simply redirect to /game/${code} - that route will handle everything
		router.replace(`/game/${code}`);
		setLoading(false);
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Join Game',
					headerShown: true,
					headerTitleAlign: 'center',
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: insets.top + 20, paddingBottom: 160 },
				]}
			>
				<InviteCodeInput onSubmit={handleInviteCodeSubmit} loading={loading} />
			</ScrollView>
			<AppFooter />
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
		gap: 24,
	},
});

export default JoinGameScreen;
