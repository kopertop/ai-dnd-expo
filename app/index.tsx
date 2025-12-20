import { Stack, router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppFooter } from '@/components/app-footer';
import { GameList } from '@/components/game-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserInfo } from '@/hooks/api/use-auth-queries';
import { useMyGames } from '@/hooks/api/use-game-queries';

const IndexScreen: React.FC = () => {
	const { data: userInfo } = useUserInfo();
	const { data: gamesData, isLoading: gamesLoading } = useMyGames();
	const hostedGames = gamesData?.hostedGames || [];
	const joinedGames = gamesData?.joinedGames || [];

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Home',
					headerShown: false,
				}}
			/>
			<ScrollView contentContainerStyle={styles.content}>
				<ThemedText type="title" style={styles.welcome}>
					Welcome to the D&D Platform
				</ThemedText>
				<ThemedText style={styles.subtitle}>
					Host a multiplayer session for your party, or join an existing adventure with your character.
				</ThemedText>
				<View style={styles.ctaRow}>
					<TouchableOpacity
						style={styles.multiplayerBtn}
						onPress={() => router.push('/host-game')}
					>
						<ThemedText style={styles.multiplayerBtnText}>New Game</ThemedText>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.multiplayerBtn}
						onPress={() => router.push('/join-game')}
					>
						<ThemedText style={styles.multiplayerBtnText}>Join Game</ThemedText>
					</TouchableOpacity>
				</View>
				<View style={styles.section}>
					<ThemedText type="subtitle" style={styles.sectionTitle}>
						My Games
					</ThemedText>
					<GameList
						hostedGames={hostedGames}
						joinedGames={joinedGames}
						isLoading={gamesLoading}
						currentUserId={userInfo?.id}
					/>
				</View>
			</ScrollView>
			<AppFooter />
		</ThemedView>
	);
};
IndexScreen.displayName = 'Home';
export default IndexScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 20,
		paddingVertical: 32,
		gap: 20,
	},
	welcome: {
		textAlign: 'center',
	},
	subtitle: {
		textAlign: 'center',
		color: '#6B5B3D',
		fontSize: 16,
		paddingHorizontal: 24,
	},
	ctaRow: {
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'center',
	},
	multiplayerBtn: {
		flex: 1,
		backgroundColor: '#8B6914',
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: 'center',
	},
	multiplayerBtnText: {
		color: '#F5E6D3',
		fontWeight: 'bold',
		fontSize: 18,
	},
	section: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.04)',
		gap: 10,
	},
	sectionTitle: {
		marginBottom: 8,
		color: '#3B2F1B',
		fontSize: 20,
		fontWeight: '600',
	},
});
