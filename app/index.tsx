import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppFooter } from '@/components/app-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMyCharacters } from '@/hooks/api/use-character-queries';

const IndexScreen: React.FC = () => {
	const [hasSavedGame, setHasSavedGame] = useState(false);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();
	const { data: charactersData, isLoading: charactersLoading } = useMyCharacters();
	const characters = Array.isArray(charactersData) ? charactersData : (charactersData?.characters || []);
	const sortedCharacters = useMemo(
		() => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
		[characters],
	);

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
							style={styles.addBtn}
							onPress={() => router.push({ pathname: '/new-character', params: { mode: 'character' } } as never)}
						>
							<ThemedText style={styles.addLabel}>+ New Character</ThemedText>
						</TouchableOpacity>
					</View>
					{charactersLoading && (
						<ThemedText style={styles.sectionHint}>Loading your roster...</ThemedText>
					)}
					{!charactersLoading && characters.length === 0 && (
						<View style={styles.emptyCard}>
							<ThemedText style={styles.sectionHint}>
								Create heroes to reuse when you join DM-hosted games.
							</ThemedText>
							<TouchableOpacity
								style={styles.primaryBtn}
								onPress={() => router.push({ pathname: '/new-character', params: { mode: 'character' } } as never)}
							>
								<ThemedText style={styles.primaryBtnLabel}>Create Character</ThemedText>
							</TouchableOpacity>
						</View>
					)}
					{sortedCharacters.map(character => (
						<TouchableOpacity
							key={character.id}
							style={styles.characterCard}
							onPress={() => router.push({ pathname: '/characters/[id]', params: { id: character.id } } as never)}
						>
							<View>
								<ThemedText style={styles.characterName}>{character.name}</ThemedText>
								<ThemedText style={styles.characterMeta}>
									{character.race} {character.class} • Level {character.level}
								</ThemedText>
								{character.trait ? (
									<ThemedText style={styles.characterTrait}>{character.trait}</ThemedText>
								) : null}
							</View>
							<ThemedText style={styles.viewLabel}>View Sheet</ThemedText>
						</TouchableOpacity>
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
	addBtn: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#E6D5B8',
	},
	addLabel: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	sectionHint: {
		color: '#6B5B3D',
	},
	emptyCard: {
		gap: 12,
		padding: 14,
		borderRadius: 10,
		backgroundColor: 'rgba(255,255,255,0.7)',
	},
	characterCard: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'rgba(255,255,255,0.85)',
		borderWidth: 1,
		borderColor: '#E6D5B8',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	characterName: {
		fontWeight: '600',
	},
	characterMeta: {
		color: '#6B5B3D',
	},
	characterTrait: {
		color: '#8A765C',
		fontSize: 12,
		marginTop: 2,
	},
	viewLabel: {
		color: '#8B6914',
		fontWeight: '700',
	},
	primaryBtn: {
		alignSelf: 'flex-start',
		backgroundColor: '#8B6914',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 8,
	},
	primaryBtnLabel: {
		color: '#F5E6D3',
		fontWeight: '700',
	},
});
