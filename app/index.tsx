import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppFooter } from '@/components/app-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { Character } from '@/types/character';

const IndexScreen: React.FC = () => {
	const [hasSavedGame, setHasSavedGame] = useState(false);
	const [loading, setLoading] = useState(true);
	const [characters, setCharacters] = useState<Character[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(false);
	const { user } = useAuthStore();

	useEffect(() => {
		const checkSavedGame = async () => {
			try {
				const saved = await AsyncStorage.getItem('gameState');
				setHasSavedGame(!!saved);
			} catch {
				setHasSavedGame(false);
			}
			setLoading(false);
		};
		checkSavedGame();
	}, []);

	useEffect(() => {
		const fetchCharacters = async () => {
			if (!user) {
				setCharacters([]);
				return;
			}

			setCharactersLoading(true);
			try {
				const data = await multiplayerClient.getMyCharacters();
				setCharacters(data);
			} catch {
				setCharacters([]);
			} finally {
				setCharactersLoading(false);
			}
		};

		fetchCharacters().catch(() => undefined);
	}, [user]);

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
					Welcome to the AI D&D Platform
				</ThemedText>
				<ThemedText style={styles.subtitle}>
					Host a multiplayer session for your party, or join an existing adventure with your character.
				</ThemedText>
				<View style={styles.ctaRow}>
					<TouchableOpacity
						style={styles.multiplayerBtn}
						onPress={() => router.push('/host-game')}
					>
						<ThemedText style={styles.multiplayerBtnText}>Host Game</ThemedText>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.multiplayerBtn}
						onPress={() => router.push('/join-game')}
					>
						<ThemedText style={styles.multiplayerBtnText}>Join Game</ThemedText>
					</TouchableOpacity>
				</View>
				{!loading && hasSavedGame && (
					<TouchableOpacity
						style={styles.continueBtn}
						onPress={() => router.push('/game')}
					>
						<ThemedText style={styles.continueBtnText}>Continue Solo Adventure</ThemedText>
					</TouchableOpacity>
				)}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<ThemedText type="subtitle">My Characters</ThemedText>
						<TouchableOpacity
							style={styles.manageBtn}
							onPress={() => router.push('/characters' as never)}
						>
							<ThemedText style={styles.manageLabel}>Manage</ThemedText>
						</TouchableOpacity>
					</View>
					{charactersLoading && (
						<ThemedText style={styles.sectionHint}>Loading your roster...</ThemedText>
					)}
					{!charactersLoading && characters.length === 0 && (
						<ThemedText style={styles.sectionHint}>
							Create heroes to reuse when you join DM-hosted games.
						</ThemedText>
					)}
					{characters.slice(0, 3).map(character => (
						<View key={character.id} style={styles.characterCard}>
							<ThemedText style={styles.characterName}>{character.name}</ThemedText>
							<ThemedText style={styles.characterMeta}>
								{character.race} {character.class} • Level {character.level}
							</ThemedText>
						</View>
					))}
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
	continueBtn: {
		backgroundColor: '#C9B037',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
		alignSelf: 'center',
	},
	continueBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	section: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.04)',
		gap: 10,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	manageBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: 'rgba(0,0,0,0.05)',
	},
	manageLabel: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	sectionHint: {
		color: '#6B5B3D',
	},
	characterCard: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'rgba(255,255,255,0.6)',
	},
	characterName: {
		fontWeight: '600',
	},
	characterMeta: {
		color: '#6B5B3D',
	},
});
