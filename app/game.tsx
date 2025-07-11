import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSheetModal } from '../components/character-sheet-modal';
import { GameCanvas } from '../components/game-canvas';
import { useGameState } from '../hooks/use-game-state';
import { useInventoryManager } from '../hooks/use-inventory-manager';
import { generateWorldForGameState } from '../services/world-generator';

import { GameStatusBar } from '@/components/game-status-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GameWorldState, Position } from '@/types/world-map';

const GameScreen: React.FC = () => {
	const [showSheet, setShowSheet] = useState(false);
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const [screenData, setScreenData] = useState(Dimensions.get('window'));
	const { loading, error, gameState, playerCharacter, save } = useGameState();
	const { inventory, equipped } = useInventoryManager();

	// Track screen dimensions for responsive layout
	useEffect(() => {
		const onChange = (result: { window: any; screen: any }) => {
			setScreenData(result.window);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => subscription?.remove();
	}, []);

	// Generate or load world state when game state is available
	useEffect(() => {
		if (gameState && !worldState) {
			console.log('🗺️ Initializing world state...');
			
			// Check if world state already exists in game state
			if (gameState.worldState) {
				console.log('📖 Loading existing world state');
				setWorldState(gameState.worldState);
			} else {
				console.log('🌍 Generating new world');
				const newWorldState = generateWorldForGameState(gameState.gameWorld, gameState.startingArea);
				setWorldState(newWorldState);
				
				// Save the generated world back to game state
				const updatedGameState = {
					...gameState,
					worldState: newWorldState,
				};
				save(updatedGameState).catch(console.error);
			}
		}
	}, [gameState, worldState]);

	const handlePlayerMove = async (newPosition: Position) => {
		if (!worldState) return;

		console.log('🚶 Player moving to:', newPosition);
		
		// Calculate facing direction based on movement
		const currentPos = worldState.playerPosition.position;
		let facing = worldState.playerPosition.facing;
		
		if (newPosition.x > currentPos.x) facing = 'east';
		else if (newPosition.x < currentPos.x) facing = 'west';
		else if (newPosition.y > currentPos.y) facing = 'south';
		else if (newPosition.y < currentPos.y) facing = 'north';
		
		const updatedWorldState = {
			...worldState,
			playerPosition: {
				...worldState.playerPosition,
				position: newPosition,
				facing: facing as 'north' | 'south' | 'east' | 'west',
				lastUpdated: Date.now(),
			},
			// Mark the new tile as explored
			exploredTiles: [
				...worldState.exploredTiles,
				`tile-${newPosition.x}-${newPosition.y}`,
			].filter((tile, index, arr) => arr.indexOf(tile) === index), // Remove duplicates
		};

		setWorldState(updatedWorldState);

		// Save updated world state
		if (gameState) {
			const updatedGameState = {
				...gameState,
				worldState: updatedWorldState,
			};
			await save(updatedGameState);
		}
	};

	const handleTileClick = (position: Position) => {
		console.log('🎯 Tile clicked:', position);
		// Could be used for movement, interaction, etc.
	};

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

	// Show loading while world is being generated
	if (!worldState) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Generating world map...</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<SafeAreaView style={{ width: '100%', height: '100%' }}>
			<Stack.Screen options={{ headerShown: false }} />
			
			{/* Game Status Bar */}
			<GameStatusBar
				gameState={gameState}
				onPortraitPress={() => setShowSheet(true)}
				style={styles.statusBarPinned}
			/>

			{/* Main Game Canvas */}
			<View style={styles.gameContainer}>
				<GameCanvas
					worldState={worldState}
					onPlayerMove={handlePlayerMove}
					onTileClick={handleTileClick}
				/>
			</View>

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
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	gameContainer: {
		flex: 1,
		width: '100%',
		marginTop: 120, // Space for status bar
		backgroundColor: '#2c5530',
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
