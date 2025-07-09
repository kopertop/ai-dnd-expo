import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { GameStatusBar } from '@/components/game-status-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CLASSES } from '@/constants/classes';
import { RACES } from '@/constants/races';

interface GameState {
	characterName: string;
	playerRace: string;
	playerClass: string;
	gameWorld: string;
	startingArea: string;
	characterSheet: {
		name: string;
		description: string;
		stats: Record<string, number>;
		skills?: string[];
	};
}

const GameScreen: React.FC = () => {
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [loading, setLoading] = useState(true);
	const [showSheet, setShowSheet] = useState(false);

	useEffect(() => {
		const loadGame = async () => {
			try {
				const saved = await AsyncStorage.getItem('gameState');
				if (saved) {
					setGameState(JSON.parse(saved));
				}
			} finally {
				setLoading(false);
			}
		};
		loadGame();
	}, []);

	if (loading) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Loading your adventure...</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	if (!gameState) {
		return (
			<ThemedView style={styles.container}>
				<ThemedText type="title">
					<Text>No saved game found.</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	const { characterName, playerRace, playerClass, gameWorld, startingArea, characterSheet } = gameState;
	const raceObj = RACES.find(r => r.name === playerRace);
	const classObj = CLASSES.find(c => c.name === playerClass);

	return (
		<SafeAreaView style={{ width: '100%', height: '100%' }}>
			<Stack.Screen options={{ headerShown: false }} />
			<GameStatusBar
				name={characterName}
				className={playerClass}
				raceName={playerRace}
				raceImage={raceObj?.image || require('@/assets/images/custom.png')}
				level={1}
				health={10}
				maxHealth={10}
				actionPoints={3}
				maxActionPoints={3}
				onPortraitPress={() => setShowSheet(true)}
				style={styles.statusBarPinned}
			/>
			<ScrollView contentContainerStyle={[styles.container, { paddingTop: 120 }]}>
				<ThemedText type="title">
					<Text>Welcome back, {characterName}!</Text>
				</ThemedText>
				<View style={styles.infoBox}>
					<ThemedText>
						<Text>Race: {playerRace}</Text>
					</ThemedText>
					<ThemedText>
						<Text>Class: {playerClass}</Text>
					</ThemedText>
					<ThemedText>
						<Text>World: {gameWorld}</Text>
					</ThemedText>
					<ThemedText>
						<Text>Starting Area: {startingArea}</Text>
					</ThemedText>
				</View>
				<View style={styles.sheetBox}>
					<ThemedText type="subtitle">
						<Text>Character Sheet</Text>
					</ThemedText>
					<ThemedText>
						<Text>Name: {characterSheet.name}</Text>
					</ThemedText>
					<ThemedText>
						<Text>Description: {characterSheet.description}</Text>
					</ThemedText>
					<ThemedText>
						<Text>Stats:</Text>
					</ThemedText>
					<View style={styles.statsRow}>
						{characterSheet.stats && Object.entries(characterSheet.stats).map(([key, value]) => (
							<View key={key} style={styles.statItem}>
								<ThemedText><Text>{key}: {value}</Text></ThemedText>
							</View>
						))}
					</View>
					{characterSheet.skills && characterSheet.skills.length > 0 && (
						<ThemedText>
							<Text>Skills: {characterSheet.skills.join(', ')}</Text>
						</ThemedText>
					)}
				</View>
			</ScrollView>
			<CharacterSheetModal
				visible={showSheet}
				characterSheet={characterSheet}
				onClose={() => setShowSheet(false)}
			/>
		</SafeAreaView>
	);
};

export default GameScreen;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: 'transparent',
	},
	infoBox: {
		marginTop: 24,
		marginBottom: 16,
		padding: 16,
		borderRadius: 10,
		backgroundColor: '#F5F2E6',
		width: '100%',
		maxWidth: 500,
	},
	sheetBox: {
		marginTop: 12,
		padding: 16,
		borderRadius: 10,
		backgroundColor: '#FFF8E1',
		width: '100%',
		maxWidth: 500,
	},
	statsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
	},
	statItem: {
		marginRight: 16,
		marginBottom: 8,
	},
	statusBarPinned: {
		width: '100%',
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 100,
	},
});
