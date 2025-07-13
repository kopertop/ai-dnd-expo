import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CharacterSheetModal } from '../components/character-sheet-modal';
import { GameCanvas } from '../components/game-canvas';
import { useGameState } from '../hooks/use-game-state';
import { generateWorldForGameState } from '../services/world-generator';

import { GameStatusBar } from '@/components/game-status-bar';
import { LiveTranscriptDisplay } from '@/components/live-transcript-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TurnBasedChat } from '@/components/turn-based-chat';
import { useDungeonMaster } from '@/hooks/use-dungeon-master';
import { useScreenSize } from '@/hooks/use-screen-size';
import { GameWorldState, Position } from '@/types/world-map';


const GameScreen: React.FC = () => {
	const [showSheet, setShowSheet] = useState(false);
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const [liveTranscript, setLiveTranscript] = useState('');
	const [isListening, setIsListening] = useState(false);
	const [activeCharacter, setActiveCharacter] = useState<'dm' | 'player' | string>('dm');
	const [hasInitialized, setHasInitialized] = useState(false);
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

	// Generate initial DM greeting when game loads
	useEffect(() => {
		if (gameState && playerCharacter && dmAgent.agent && !hasInitialized && dmAgent.messages.length === 1 && !dmAgent.isLoading) {
			console.log('🎭 Generating custom DM greeting...');
			setHasInitialized(true);

			const generateInitialGreeting = () => {
				const name = playerCharacter.name;
				const race = playerCharacter.race;
				const playerClass = playerCharacter.class;
				const location = gameState.startingArea || 'a mysterious location';

				// Create contextual greeting based on character and location
				const locationLower = location.toLowerCase();
				let greeting = '';

				if (locationLower.includes('tavern') || locationLower.includes('inn')) {
					if (playerClass.toLowerCase().includes('wizard') || playerClass.toLowerCase().includes('mage')) {
						greeting = `You push open the heavy wooden door and step into ${location}. The warm glow of candlelight dances across your weathered spellbook as you lower your hood, revealing your ${race.toLowerCase()} features. Your keen eyes scan the dimly lit common room, noting potential allies nursing their ales and shadowy figures who might pose a threat. The scent of roasted meat and old ale fills your nostrils as you consider your next move, ${name}.`;
					} else if (playerClass.toLowerCase().includes('rogue') || playerClass.toLowerCase().includes('thief')) {
						greeting = `You slip quietly through the entrance of ${location}, your ${race.toLowerCase()} heritage allowing you to move with practiced stealth. The tavern's dim lighting suits you perfectly as you assess the room - noting exit routes, potential marks, and anyone who might recognize you. Your hand instinctively checks your coin purse as you blend into the shadows near the bar, ${name}.`;
					} else if (playerClass.toLowerCase().includes('fighter') || playerClass.toLowerCase().includes('warrior')) {
						greeting = `You stride confidently into ${location}, your armor catching the firelight from the hearth. Fellow patrons glance up at your ${race.toLowerCase()} frame, some with respect, others with wariness. You approach the bar with the bearing of someone accustomed to both battle and negotiation, ready for whatever this establishment might offer, ${name}.`;
					} else if (playerClass.toLowerCase().includes('cleric') || playerClass.toLowerCase().includes('paladin')) {
						greeting = `You enter ${location} with quiet dignity, your holy symbol visible beneath your traveling cloak. The ${race.toLowerCase()} features of your face show both compassion and determination as you observe the tavern's patrons - some clearly in need of guidance, others perhaps requiring a more... direct approach to righteousness. You offer a silent prayer as you consider how best to serve your divine purpose here, ${name}.`;
					} else {
						greeting = `You enter ${location}, your ${race.toLowerCase()} heritage evident as you take in your surroundings. As a ${playerClass.toLowerCase()}, you feel both at home and alert in this establishment. The flickering candlelight reveals faces both friendly and suspicious as you decide how to proceed, ${name}.`;
					}
				} else if (locationLower.includes('forest') || locationLower.includes('woods')) {
					greeting = `You emerge into a clearing within ${location}, your ${race.toLowerCase()} senses attuned to the natural world around you. As a ${playerClass.toLowerCase()}, you feel the ancient magic of this place calling to you, ${name}. Dappled sunlight filters through the canopy above, and you hear the rustle of creatures both seen and unseen in the underbrush.`;
				} else if (locationLower.includes('dungeon') || locationLower.includes('cave')) {
					greeting = `You stand at the entrance to ${location}, torch in hand, casting dancing shadows on the stone walls ahead. Your ${race.toLowerCase()} heritage serves you well in this dark place, ${name}. As a ${playerClass.toLowerCase()}, you've prepared for the dangers that surely lie within these depths.`;
				} else {
					greeting = `You find yourself in ${location}, ${name}. Your ${race.toLowerCase()} heritage and training as a ${playerClass.toLowerCase()} have prepared you for this moment. You take a moment to assess your surroundings and consider your options.`;
				}

				return greeting + '\n\nWhat would you like to do?';
			};

			const initialMessage = generateInitialGreeting();
			console.log('📝 Custom greeting generated:', initialMessage.substring(0, 100) + '...');

			// Replace the welcome message with our custom greeting
			dmAgent.replaceWelcomeMessage(initialMessage);
			console.log('✅ Custom greeting replaced, switching to player turn');
			setActiveCharacter('player'); // Switch to player's turn after DM greeting
		}
	}, [gameState, playerCharacter, dmAgent.agent, dmAgent.messages.length, hasInitialized, dmAgent.isLoading]);

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

	const handleTurnChange = (newActiveCharacter: 'dm' | 'player' | string) => {
		setActiveCharacter(newActiveCharacter);
	};

	const handleChatMessage = async (message: string, speakerId: string) => {
		// Send message through DM agent
		await dmAgent.sendMessage(`${speakerId}: ${message}`);

		// Switch to DM's turn after player acts
		if (speakerId === 'player') {
			setActiveCharacter('dm');

			// After DM responds, switch back to player
			// This will be handled by the DM response completion
			setTimeout(() => {
				setActiveCharacter('player');
			}, 2000); // Give DM 2 seconds to respond
		}
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
				activeCharacter={activeCharacter}
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

			{/* Turn-Based Chat */}
			<TurnBasedChat
				playerCharacter={playerCharacter}
				dmMessages={dmAgent.messages}
				onSendMessage={handleChatMessage}
				activeCharacter={activeCharacter}
				onTurnChange={handleTurnChange}
				isLoading={dmAgent.isLoading}
			/>

			{/* Voice Chat Button */}
			{/*
			<VoiceChatButton
				onVoiceInput={dmAgent.sendVoiceMessage}
				isDisabled={dmAgent.isLoading}
				position={isMobile ? 'bottom-right' : 'top-right'}
				onTranscriptChange={handleTranscriptChange}
			/>
			*/}


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
});
