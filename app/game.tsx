import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { ResponsiveGameContainer } from '../components/responsive-game-container';
import { ThemedText } from '../components/themed-text';
import { useCactusDungeonMaster } from '../hooks/use-cactus-dungeon-master';
import { useGameState } from '../hooks/use-game-state';
import { useScreenSize } from '../hooks/use-screen-size';
import { generateWorldForGameState } from '../services/world-generator';
import { GameWorldState, Position } from '../types/world-map';

const GameScreen: React.FC = () => {
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const [activeCharacter, setActiveCharacter] = useState<'dm' | 'player' | string>('dm');
	const [hasInitialized, setHasInitialized] = useState(false);
	const { loading, gameState, save } = useGameState();
	const [saveError, setSaveError] = useState<string | null>(null);
	const { isPhone } = useScreenSize();

	// Initialize Dungeon Master agent
	const playerCharacter = gameState
		? gameState.characters.find(c => c.id === gameState.playerCharacterId)
		: null;
	const dmAgent = useCactusDungeonMaster({
		worldState,
		playerCharacter: playerCharacter || null,
		autoInitialize: true,
		modelUrl:
			'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf',
	});

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
					} catch {
						setSaveError('Failed to save game state');
					}
				}
			}, 500); // Debounce for 500ms
		},
		[save],
	);

	// Cleanup timeout on unmount to prevent memory leaks
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
			console.warn('🗺️ Initializing world state...');
			// Check if world state already exists in game state
			if (gameState.worldState) {
				console.warn('📖 Loading existing world state');
				setWorldState(gameState.worldState);
			} else {
				console.warn('🌍 Generating new world');
				const newWorldState = generateWorldForGameState(
					gameState.gameWorld,
					gameState.startingArea,
				);
				setWorldState(newWorldState);
				// Save the generated world back to game state
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

	// Generate initial DM greeting when game loads
	useEffect(() => {
		if (
			gameState &&
			playerCharacter &&
			!hasInitialized &&
			dmAgent.messages.length === 1 &&
			!dmAgent.isLoading
		) {
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
					if (
						playerClass.toLowerCase().includes('wizard') ||
						playerClass.toLowerCase().includes('mage')
					) {
						greeting = `You push open the heavy wooden door and step into ${location}. The warm glow of candlelight dances across your weathered spellbook as you lower your hood, revealing your ${race.toLowerCase()} features. Your keen eyes scan the dimly lit common room, noting potential allies nursing their ales and shadowy figures who might pose a threat. The scent of roasted meat and old ale fills your nostrils as you consider your next move, ${name}.`;
					} else if (
						playerClass.toLowerCase().includes('rogue') ||
						playerClass.toLowerCase().includes('thief')
					) {
						greeting = `You slip quietly through the entrance of ${location}, your ${race.toLowerCase()} heritage allowing you to move with practiced stealth. The tavern's dim lighting suits you perfectly as you assess the room - noting exit routes, potential marks, and anyone who might recognize you. Your hand instinctively checks your coin purse as you blend into the shadows near the bar, ${name}.`;
					} else if (
						playerClass.toLowerCase().includes('fighter') ||
						playerClass.toLowerCase().includes('warrior')
					) {
						greeting = `You stride confidently into ${location}, your armor catching the firelight from the hearth. Fellow patrons glance up at your ${race.toLowerCase()} frame, some with respect, others with wariness. You approach the bar with the bearing of someone accustomed to both battle and negotiation, ready for whatever this establishment might offer, ${name}.`;
					} else if (
						playerClass.toLowerCase().includes('cleric') ||
						playerClass.toLowerCase().includes('paladin')
					) {
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
	}, [
		gameState,
		playerCharacter,
		dmAgent.messages.length,
		hasInitialized,
		dmAgent.isLoading,
		dmAgent,
	]);

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
		const movementDescription = `Player moves ${facing} to position (${newPosition.x}, ${newPosition.y})`;
		dmAgent.sendMessage(movementDescription).catch(console.error);

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

	// Handle phone layout by redirecting to tabs
	useEffect(() => {
		if (isPhone && gameState && worldState) {
			// For phone layout, we should redirect to the tab interface
			// This will be handled by the app's routing logic
		}
	}, [isPhone, gameState, worldState]);

	// Determine error state for ResponsiveGameContainer
	let gameError: string | null = null;
	if (!gameState) {
		gameError = saveError || 'No saved game found. Please start a new game from the main menu.';
	}
	if (dmAgent.error) {
		gameError = `DM Error: ${dmAgent.error}`;
	}

	// Determine loading state
	const gameLoading = loading || !worldState;

	// For phone devices, show a message that they should use the tab interface
	if (isPhone) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
				<ThemedText type="title" style={{ textAlign: 'center', marginBottom: 16 }}>
					Mobile Interface
				</ThemedText>
				<ThemedText style={{ textAlign: 'center' }}>
					For the best mobile experience, please use the tab interface by navigating to
					the main menu and selecting "Continue Game".
				</ThemedText>
			</View>
		);
	}

	return (
		<View style={{ width: '100%', height: '100%' }}>
			<Stack.Screen options={{ headerShown: false }} />

			<ResponsiveGameContainer
				playerCharacter={playerCharacter || null}
				dmMessages={dmAgent.messages.map((msg, index) => ({
					id: `msg-${index}`,
					content: msg.content,
					timestamp: Date.now() - (dmAgent.messages.length - index) * 1000,
					speaker: msg.role === 'user' ? 'Player' : 'Dungeon Master',
					type: 'dialogue',
				}))}
				onSendMessage={handleChatMessage}
				activeCharacter={activeCharacter}
				onTurnChange={handleTurnChange}
				isLoading={dmAgent.isLoading}
				worldState={worldState || undefined}
				onPlayerMove={handlePlayerMove}
				onTileClick={handleTileClick}
				gameLoading={gameLoading}
				gameError={gameError}
			/>

			{/* Save error feedback - only show if not handled by ResponsiveGameContainer */}
			{saveError && gameState && worldState && (
				<ThemedText
					style={{
						position: 'absolute',
						bottom: 24,
						left: 0,
						right: 0,
						textAlign: 'center',
						color: 'red',
						zIndex: 999,
					}}
				>
					{saveError}
				</ThemedText>
			)}
		</View>
	);
};

export default GameScreen;

// Styles removed - now handled by ResponsiveGameContainer
