import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CharacterSheetModal } from '../components/character-sheet-modal';
import { GameCanvas } from '../components/game-canvas';
import { useGameState } from '../hooks/use-game-state';
import { generateWorldForGameState } from '../services/world-generator';

import { DMChatInterface } from '@/components/dm-chat-interface';
import { GameStatusBar } from '@/components/game-status-bar';
import { LiveTranscriptDisplay } from '@/components/live-transcript-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceChatButton } from '@/components/voice-chat-button';
import { useDungeonMaster } from '@/hooks/use-dungeon-master';
import { useScreenSize } from '@/hooks/use-screen-size';
import { GameWorldState, Position } from '@/types/world-map';


const GameScreen: React.FC = () => {
	const [showSheet, setShowSheet] = useState(false);
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const [liveTranscript, setLiveTranscript] = useState('');
	const [isListening, setIsListening] = useState(false);
	const { isMobile } = useScreenSize();
	const { loading, gameState, save } = useGameState();
	const [saveError, setSaveError] = useState<string | null>(null);

	// Initialize Dungeon Master agent
	const playerCharacter = gameState ? gameState.characters.find(c => c.id === gameState.playerCharacterId) : null;
	const dmAgent = useDungeonMaster({
		worldState,
		playerCharacter: playerCharacter || null,
		autoSave: true,
	});

	// Debounced save to prevent excessive saves on frequent player moves
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const debouncedSave = useCallback(async (gameStateToSave: typeof gameState) => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}
		saveTimeoutRef.current = setTimeout(async () => {
			if (gameStateToSave) {
				try {
					await save(gameStateToSave);
				} catch (error) {
					setSaveError('Failed to save game state');
				}
			}
		}, 500); // Debounce for 500ms
	}, [save]);

	// Cleanup timeout on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	// Track screen dimensions for responsive layout
	useEffect(() => {
		// Responsive layout logic placeholder (currently unused)
		// If needed, add logic to handle screen size changes here
	}, []);

	// Generate or load world state when game state is available
	useEffect(() => {
		if (gameState && !worldState) {
			console.warn('🗺️ Initializing world state...');
			// Check if world state already exists in game state
			if (gameState.worldState) {
				console.warn('📖 Loading existing world state');
				setWorldState(gameState.worldState);
			} else {
				console.warn('🌍 Generating new world');
				const newWorldState = generateWorldForGameState(gameState.gameWorld, gameState.startingArea);
				setWorldState(newWorldState);
				// Save the generated world back to game state
				const updatedGameState = {
					...gameState,
					worldState: newWorldState,
				};
				save(updatedGameState)
					.catch((err) => {
						setSaveError('Failed to save world state. Changes may not persist.');
						console.error(err);
					});
			}
		}
	}, [gameState, worldState, save]);

	const handlePlayerMove = async (newPosition: Position) => {
		if (!worldState) return;

		console.warn('🚶 Player moving to:', newPosition);

		// Calculate facing direction based on movement
		const currentPos = worldState.playerPosition.position;
		let facing: 'north' | 'south' | 'east' | 'west' = worldState.playerPosition.facing;
		if (newPosition.x > currentPos.x && newPosition.y === currentPos.y) facing = 'east';
		else if (newPosition.x < currentPos.x && newPosition.y === currentPos.y) facing = 'west';
		else if (newPosition.y > currentPos.y && newPosition.x === currentPos.x) facing = 'south';
		else if (newPosition.y < currentPos.y && newPosition.x === currentPos.x) facing = 'north';
		// If movement is diagonal or teleport, keep previous facing

		// Mark the new tile as explored, using a Set for deduplication
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

		// Notify DM agent of player movement
		if (dmAgent.agent) {
			const movementDescription = `Player moves ${facing} to position (${newPosition.x}, ${newPosition.y})`;
			dmAgent.sendMessage(movementDescription).catch(console.error);
		}

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
		// Could be used for movement, interaction, etc.
	};

	const handleTranscriptChange = (transcript: string, listening: boolean) => {
		setLiveTranscript(transcript);
		setIsListening(listening);
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
				<ThemedText style={{ marginTop: 8 }}>
					<Text>Please start a new game from the main menu.</Text>
				</ThemedText>
				{saveError && (
					<ThemedText style={{ marginTop: 12, color: 'red' }}>
						{saveError}
					</ThemedText>
				)}
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
					<Text>If this takes too long, try restarting the app or starting a new game.</Text>
				</ThemedText>
				{saveError && (
					<ThemedText style={{ marginTop: 12, color: 'red' }}>
						{saveError}
					</ThemedText>
				)}
			</ThemedView>
		);
	}

	return (
		<View style={{ width: '100%', height: '100%' }}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Game Status Bar */}
			<GameStatusBar
				gameState={gameState}
				onPortraitPress={() => setShowSheet(true)}
				style={isMobile ? styles.statusBarPinnedMobile : styles.statusBarPinned}
				activeCharacter="dm" // Test with DM active - you can change this
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

			{/* Live Transcript Display */}
			<LiveTranscriptDisplay
				transcript={liveTranscript}
				isListening={isListening}
				isVisible={isListening || liveTranscript.length > 0}
			/>

			{/* Voice Chat Button */}
			<VoiceChatButton
				onVoiceInput={dmAgent.sendVoiceMessage}
				isDisabled={dmAgent.isLoading}
				position={isMobile ? 'bottom-right' : 'top-right'}
				onTranscriptChange={handleTranscriptChange}
			/>

			{/* Dungeon Master Chat Interface */}
			<View style={isMobile ? styles.dmChatContainerMobile : styles.dmChatContainer}>
				<DMChatInterface
					messages={dmAgent.messages}
					onSendMessage={dmAgent.sendMessage}
					isLoading={dmAgent.isLoading}
					placeholder="Describe your action..."
					isMobile={isMobile}
					currentLocation="The Rusty Dragon Tavern" // TODO: Determine dynamically from worldState
				/>
			</View>

			{/* Save error feedback */}
			{saveError && (
				<ThemedText style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'red', zIndex: 999 }}>
					{saveError}
				</ThemedText>
			)}

			{/* DM error feedback */}
			{dmAgent.error && (
				<ThemedText style={{ position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center', color: 'orange', zIndex: 999 }}>
					<Text>DM: {dmAgent.error}</Text>
				</ThemedText>
			)}
		</View>
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
		// Removed marginTop so the map starts directly below the header bar
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
	statusBarPinnedMobile: {
		width: '100%',
		position: 'absolute',
		height: 65,
		paddingTop: 10,
		paddingBottom: 20,
		bottom: 0,
		left: 0,
		right: 0,
		zIndex: 100,
	},
	dmChatContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		zIndex: 200,
		maxHeight: '50%',
	},
	dmChatContainerMobile: {
		position: 'absolute',
		top: 70, // Below the status bar
		left: 0,
		right: 0,
		zIndex: 200,
		maxHeight: '50%',
	},
});
