import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameCanvas } from '@/components/game-canvas';
import { GameStatusBar } from '@/components/game-status-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGameState } from '@/hooks/use-game-state';
import { generateWorldForGameState } from '@/services/world-generator';
import { GameWorldState, Position } from '@/types/world-map';

const MapTab: React.FC = () => {
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const { loading, gameState, save } = useGameState();
	const [saveError, setSaveError] = useState<string | null>(null);

	// Debounced save to prevent excessive saves on frequent player moves
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const debouncedSave = useCallback(
		async (gameStateToSave: typeof gameState) => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			saveTimeoutRef.current = setTimeout(async () => {
				if (gameStateToSave) {
					try {
						await save(gameStateToSave);
					} catch (error) {
						console.error('Save error:', error);
						setSaveError('Failed to save game state');
					}
				}
			}, 500);
		},
		[save],
	);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	// Generate or load world state when game state is available
	useEffect(() => {
		if (gameState && !worldState) {
			if (gameState.worldState) {
				setWorldState(gameState.worldState);
			} else {
				const newWorldState = generateWorldForGameState(
					gameState.gameWorld,
					gameState.startingArea,
				);
				setWorldState(newWorldState);
				const updatedGameState = {
					...gameState,
					worldState: newWorldState,
				};
				save(updatedGameState).catch(err => {
					setSaveError('Failed to save world state. Changes may not persist.');
					console.error(err);
				});
			}
		}
	}, [gameState, worldState, save]);

	const handlePlayerMove = async (newPosition: Position) => {
		if (!worldState) return;

		// Calculate facing direction based on movement
		const currentPos = worldState.playerPosition.position;
		let facing: 'north' | 'south' | 'east' | 'west' = worldState.playerPosition.facing;
		if (newPosition.x > currentPos.x && newPosition.y === currentPos.y) facing = 'east';
		else if (newPosition.x < currentPos.x && newPosition.y === currentPos.y) facing = 'west';
		else if (newPosition.y > currentPos.y && newPosition.x === currentPos.x) facing = 'south';
		else if (newPosition.y < currentPos.y && newPosition.x === currentPos.x) facing = 'north';

		// Mark the new tile as explored
		const newTile = `tile-${newPosition.x}-${newPosition.y}`;
		const exploredSet = new Set(worldState.exploredTiles);
		exploredSet.add(newTile);
		const updatedWorldState = {
			...worldState,
			playerPosition: {
				...worldState.playerPosition,
				position: newPosition,
				facing: facing as 'north' | 'south' | 'east' | 'west',
				lastUpdated: Date.now(),
			},
			exploredTiles: Array.from(exploredSet),
		};

		setWorldState(updatedWorldState);

		// Save updated world state with debouncing
		if (gameState) {
			const updatedGameState = {
				...gameState,
				worldState: updatedWorldState,
			};
			await debouncedSave(updatedGameState);
		}
	};

	const handleTileClick = (position: Position) => {
		console.warn('🎯 Tile clicked:', position);
	};

	if (loading) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Loading map...</Text>
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
				<ThemedText style={{ marginTop: 8 }}>
					<Text>Please start a new game from the main menu.</Text>
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
				<ThemedText style={{ marginTop: 8 }}>
					<Text>
						If this takes too long, try restarting the app or starting a new game.
					</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<View style={styles.mapContainer}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Game Status Bar */}
			<GameStatusBar
				gameState={gameState}
				onPortraitPress={() => {
					// In tab mode, navigate to character tab instead of modal
					// This could use router.push('/(tabs)/character') if needed
				}}
				style={styles.statusBar}
				activeCharacter="player"
			/>

			{/* Main Game Canvas */}
			<View style={styles.gameContainer}>
				<GameCanvas
					worldState={worldState}
					onPlayerMove={handlePlayerMove}
					onTileClick={handleTileClick}
				/>
			</View>

			{saveError && (
				<ThemedText style={styles.errorText}>
					{saveError}
				</ThemedText>
			)}
		</View>
	);
};

export default MapTab;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	mapContainer: {
		flex: 1,
		backgroundColor: '#2c5530',
	},
	statusBar: {
		width: '100%',
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 100,
	},
	gameContainer: {
		flex: 1,
		width: '100%',
		marginTop: 80, // Account for status bar height
		backgroundColor: '#2c5530',
	},
	errorText: {
		position: 'absolute',
		bottom: 24,
		left: 0,
		right: 0,
		textAlign: 'center',
		color: 'red',
		zIndex: 999,
	},
});
