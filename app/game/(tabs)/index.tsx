import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TurnBasedChat } from '@/components/turn-based-chat';
import { useEnhancedDungeonMaster } from '@/hooks/use-enhanced-dungeon-master';
import { useGameState } from '@/hooks/use-game-state';
import { generateWorldForGameState } from '@/services/world-generator';
import { GameWorldState } from '@/types/world-map';

const ChatTab: React.FC = () => {
	const [worldState, setWorldState] = useState<GameWorldState | null>(null);
	const [activeCharacter, setActiveCharacter] = useState<'dm' | 'player' | string>('dm');
	const [hasInitialized, setHasInitialized] = useState(false);
	const { loading, gameState, save } = useGameState();
	const [saveError, setSaveError] = useState<string | null>(null);

	// Initialize Dungeon Master agent (enhanced, cactus-free)
	const playerCharacter = gameState
		? gameState.characters.find(c => c.id === gameState.playerCharacterId)
		: null;
	const dmAgent = useEnhancedDungeonMaster({
		worldState,
		playerCharacter: playerCharacter || null,
		enableVoice: false,
	});

	// Debounced save to prevent excessive saves
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

	// Generate initial DM greeting when game loads
	useEffect(() => {
		if (gameState && playerCharacter && !hasInitialized && dmAgent.messages.length <= 1 && !dmAgent.isLoading) {
			setHasInitialized(true);

			const generateInitialGreeting = () => {
				const name = playerCharacter.name;
				const race = playerCharacter.race;
				const playerClass = playerCharacter.class;
				const location = gameState.startingArea || 'a mysterious location';

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
			dmAgent.replaceWelcomeMessage(initialMessage);
			setActiveCharacter('player');
		}
	}, [
		gameState,
		playerCharacter,
		dmAgent.messages.length,
		hasInitialized,
		dmAgent.isLoading,
		dmAgent,
	]);

	const handleTurnChange = (newActiveCharacter: 'dm' | 'player' | string) => {
		setActiveCharacter(newActiveCharacter);
	};

	const handleChatMessage = async (message: string, speakerId: string) => {
		await dmAgent.sendMessage(`${speakerId}: ${message}`);

		if (speakerId === 'player') {
			setActiveCharacter('dm');
			setTimeout(() => {
				setActiveCharacter('player');
			}, 2000);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container} edges={['left', 'right']}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Loading your adventure...</Text>
				</ThemedText>
			</SafeAreaView>
		);
	}

	if (!gameState) {
		return (
			<SafeAreaView style={styles.container} edges={['left', 'right']}>
				<ThemedText type="title">
					<Text>No saved game found.</Text>
				</ThemedText>
				<ThemedText style={{ marginTop: 8 }}>
					<Text>Please start a new game from the main menu.</Text>
				</ThemedText>
				{saveError && (
					<ThemedText style={{ marginTop: 12, color: 'red' }}>{saveError}</ThemedText>
				)}
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.chatContainer} edges={['left', 'right']}>
			<TurnBasedChat
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
			/>

			{saveError && <ThemedText style={styles.errorText}>{saveError}</ThemedText>}

			{dmAgent.error && (
				<ThemedText style={styles.dmErrorText}>
					<Text>DM: {dmAgent.error}</Text>
				</ThemedText>
			)}
		</SafeAreaView>
	);
};

export default ChatTab;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	chatContainer: {
		flex: 1,
		backgroundColor: '#F9F6EF',
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
	dmErrorText: {
		position: 'absolute',
		bottom: 48,
		left: 0,
		right: 0,
		textAlign: 'center',
		color: 'orange',
		zIndex: 999,
	},
});
