import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppFooter } from '@/components/app-footer';
import { CharacterList } from '@/components/character-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserInfo } from '@/hooks/api/use-auth-queries';
import { useAllCharacters, useMyCharacters } from '@/hooks/api/use-character-queries';

const IndexScreen: React.FC = () => {
	const [hasSavedGame, setHasSavedGame] = useState(false);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('my');
	const { data: userInfo } = useUserInfo();

	const { data: myCharactersData, isLoading: myCharactersLoading } = useMyCharacters();
	const myCharacters = Array.isArray(myCharactersData) ? myCharactersData : (myCharactersData?.characters || []);
	const sortedMyCharacters = useMemo(
		() => [...myCharacters].sort((a, b) => a.name.localeCompare(b.name)),
		[myCharacters],
	);

	const { data: allCharactersData, isLoading: allCharactersLoading } = useAllCharacters();
	const allCharacters = Array.isArray(allCharactersData) ? allCharactersData : (allCharactersData?.characters || []);
	const sortedAllCharacters = useMemo(
		() => [...allCharacters].sort((a, b) => a.name.localeCompare(b.name)),
		[allCharacters],
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
						{userInfo?.is_admin ? (
							<View style={styles.tabs}>
								<TouchableOpacity
									style={[styles.tab, activeTab === 'my' && styles.activeTab]}
									onPress={() => setActiveTab('my')}
								>
									<ThemedText style={[styles.tabLabel, activeTab === 'my' && styles.activeTabLabel]}>My Characters</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.tab, activeTab === 'all' && styles.activeTab]}
									onPress={() => setActiveTab('all')}
								>
									<ThemedText style={[styles.tabLabel, activeTab === 'all' && styles.activeTabLabel]}>All Characters</ThemedText>
								</TouchableOpacity>
							</View>
						) : (
							<ThemedText type="subtitle">My Characters</ThemedText>
						)}
						<TouchableOpacity
							style={styles.addBtn}
							onPress={() => router.push({ pathname: '/new-character', params: { mode: 'character' } } as never)}
						>
							<ThemedText style={styles.addLabel}>+ New Character</ThemedText>
						</TouchableOpacity>
					</View>

					{activeTab === 'my' && (
						<CharacterList characters={sortedMyCharacters} isLoading={myCharactersLoading} />
					)}
					{activeTab === 'all' && (
						<CharacterList characters={sortedAllCharacters} isLoading={allCharactersLoading} />
					)}
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
	tabs: {
		flexDirection: 'row',
		backgroundColor: '#E6D5B8',
		borderRadius: 8,
		padding: 4,
	},
	tab: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
	},
	activeTab: {
		backgroundColor: '#fff',
	},
	tabLabel: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	activeTabLabel: {
		color: '#8B6914',
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
});
