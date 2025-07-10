import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSheetModal } from '../components/character-sheet-modal';
import { useGameState } from '../hooks/use-game-state';
import { useInventoryManager } from '../hooks/use-inventory-manager';

import { GameStatusBar } from '@/components/game-status-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const GameScreen: React.FC = () => {
	const [showSheet, setShowSheet] = useState(false);
	const { loading, error, gameState, playerCharacter, playerPortrait } = useGameState();
	const { inventory, equipped } = useInventoryManager();

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

	return (
		<SafeAreaView style={{ width: '100%', height: '100%' }}>
			<Stack.Screen options={{ headerShown: false }} />
			<GameStatusBar
				gameState={gameState}
				onPortraitPress={() => setShowSheet(true)}
				style={styles.statusBarPinned}
			/>
			<ScrollView contentContainerStyle={[styles.container, { paddingTop: 120 }]}>
				<ThemedText type="title">
					<Text>Welcome back, {playerCharacter?.name || 'adventurer'}!</Text>
				</ThemedText>
				<View style={styles.infoBox}>
					{playerCharacter ? (
						<>
							<ThemedText>
								<Text>Race: {playerCharacter.race} | Class: {playerCharacter.class} | Level {playerCharacter.level}</Text>
							</ThemedText>
							<ThemedText>
								<Text>World: {gameState?.gameWorld} | Area: {gameState?.startingArea}</Text>
							</ThemedText>
						</>
					) : (
						<>
							<ThemedText>
								<Text>Your character sheet is loading...</Text>
							</ThemedText>
							<ThemedText>
								<Text>Tap your portrait above to view details</Text>
							</ThemedText>
						</>
					)}
				</View>
				<View style={styles.sheetBox}>
					<ThemedText type="subtitle">
						<Text>Inventory Status</Text>
					</ThemedText>
					<ThemedText>
						<Text>Items: {inventory.length}</Text>
					</ThemedText>
					<ThemedText>
						<Text>Equipped: {Object.keys(equipped).length} slots</Text>
					</ThemedText>
				</View>
			</ScrollView>
			{/* Character sheet modal */}
			<CharacterSheetModal
				visible={showSheet}
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
	errorText: {
		marginTop: 16,
		marginBottom: 8,
		color: '#dc3545',
		textAlign: 'center',
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
