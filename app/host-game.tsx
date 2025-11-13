import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmailInput } from '@/components/email-input';
import { InviteCodeDisplay } from '@/components/invite-code-display';
import { LocationChooser } from '@/components/location-chooser';
import { PlayerList } from '@/components/player-list';
import { QuestSelector } from '@/components/quest-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorldChooser } from '@/components/world-chooser';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { useScreenSize } from '@/hooks/use-screen-size';
import { LocationOption } from '@/types/location-option';
import { Quest } from '@/types/quest';
import { WorldOption } from '@/types/world-option';
import { GameSessionResponse } from '@/types/api/multiplayer-api';
import { useGameState } from '@/hooks/use-game-state';

type HostStep = 'email' | 'quest' | 'world' | 'location' | 'character' | 'waiting' | 'ready';

const HostGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<HostStep>('email');
	const [hostEmail, setHostEmail] = useState<string>('');
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [session, setSession] = useState<GameSessionResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [hostId, setHostId] = useState<string | null>(null);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();
	const { gameState } = useGameState();

	// Generate host ID on mount
	useEffect(() => {
		// Simple ID generator that works across all platforms
		const generateHostId = () => {
			const timestamp = Date.now().toString(36);
			const random = Math.random().toString(36).substring(2, 15);
			const id = `host-${timestamp}-${random}`.substring(0, 32);
			setHostId(id);
		};
		generateHostId();
	}, []);

	// Poll for players when in waiting state
	useEffect(() => {
		if (currentStep === 'waiting' && session?.inviteCode) {
			const interval = setInterval(async () => {
				try {
					const updatedSession = await multiplayerClient.getGameSession(
						session.inviteCode,
					);
					setSession(updatedSession);
				} catch (error) {
					console.error('Failed to poll session:', error);
				}
			}, 2000); // Poll every 2 seconds

			return () => clearInterval(interval);
		}
	}, [currentStep, session?.inviteCode]);

	const handleEmailSubmit = () => {
		if (!hostEmail || !hostEmail.includes('@')) {
			Alert.alert('Error', 'Please enter a valid email address');
			return;
		}
		setCurrentStep('quest');
	};

	const handleQuestSelect = (quest: Quest) => {
		setSelectedQuest(quest);
		setCurrentStep('world');
	};

	const handleWorldSelect = (world: WorldOption) => {
		setSelectedWorld(world);
		setCurrentStep('location');
	};

	const handleLocationSelect = async (location: LocationOption) => {
		setSelectedLocation(location);
		setCurrentStep('character');
	};

	const handleCreateGame = async () => {
		if (!selectedQuest || !selectedWorld || !selectedLocation || !hostId) {
			Alert.alert('Error', 'Please complete all steps');
			return;
		}

		// Use existing character from game state if available, otherwise create a simple host character
		let hostCharacter;
		if (gameState?.characters && gameState.characters.length > 0) {
			hostCharacter = gameState.characters[0];
		} else {
			// Create a simple host character (host will create proper character later)
			hostCharacter = {
				id: `host-char-${Date.now()}`,
				level: 1,
				race: 'Human',
				name: 'Game Master',
				class: 'DM',
				description: 'The Dungeon Master',
				stats: {
					strength: 10,
					dexterity: 10,
					constitution: 10,
					intelligence: 10,
					wisdom: 10,
					charisma: 10,
				},
				skills: [],
				inventory: [],
				equipped: {},
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};
		}

		setLoading(true);
		try {
			const newSession = await multiplayerClient.createGame({
				questId: selectedQuest.id,
				quest: selectedQuest, // Send quest object directly
				world: selectedWorld.name,
				startingArea: selectedLocation.name,
				hostId,
				hostEmail,
				hostCharacter,
			});

			setSession(newSession);
			setCurrentStep('waiting');
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to create game',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartGame = async () => {
		if (!session || !hostId) return;

		setLoading(true);
		try {
			// Create initial game state
			const initialGameState = {
				sessionId: session.sessionId,
				inviteCode: session.inviteCode,
				hostId,
				quest: selectedQuest!,
				players: session.players,
				characters: session.players.map(p => ({
					id: p.characterId,
					level: 1,
					race: 'Unknown',
					name: p.name,
					class: 'Unknown',
					stats: {
						strength: 10,
						dexterity: 10,
						constitution: 10,
						intelligence: 10,
						wisdom: 10,
						charisma: 10,
					},
					skills: [],
					inventory: [],
					equipped: {},
					health: 10,
					maxHealth: 10,
					actionPoints: 3,
					maxActionPoints: 3,
				})),
				playerCharacterId: session.players[0]?.characterId || '',
				gameWorld: selectedWorld!.name,
				startingArea: selectedLocation!.name,
				status: 'active' as const,
				createdAt: Date.now(),
				lastUpdated: Date.now(),
				messages: [],
			};

			await multiplayerClient.startGame(session.inviteCode, hostId, initialGameState);
			router.replace(`/multiplayer-game?inviteCode=${session.inviteCode}&hostId=${hostId}`);
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to start game',
			);
		} finally {
			setLoading(false);
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 'email':
				return (
					<View style={styles.chooserContainer}>
						<ThemedText type="title" style={styles.stepTitle}>
							Enter Your Email
						</ThemedText>
						<EmailInput
							value={hostEmail}
							onChangeText={setHostEmail}
							autoFocus={true}
						/>
						<TouchableOpacity
							style={[styles.button, (!hostEmail || !hostEmail.includes('@')) && styles.buttonDisabled]}
							onPress={handleEmailSubmit}
							disabled={!hostEmail || !hostEmail.includes('@')}
						>
							<ThemedText style={styles.buttonText}>Continue</ThemedText>
						</TouchableOpacity>
					</View>
				);
			case 'quest':
				return (
					<QuestSelector
						onSelect={handleQuestSelect}
						selectedQuest={selectedQuest}
					/>
				);
			case 'world':
				return (
					<View style={styles.chooserContainer}>
						<ThemedText type="title" style={styles.stepTitle}>
							Select World
						</ThemedText>
						<WorldChooser onSelect={handleWorldSelect} />
					</View>
				);
			case 'location':
				return (
					<View style={styles.chooserContainer}>
						<ThemedText type="title" style={styles.stepTitle}>
							Select Starting Location
						</ThemedText>
						<LocationChooser onSelect={handleLocationSelect} />
					</View>
				);
			case 'character':
				return (
					<View style={styles.readyContainer}>
						<ThemedText type="title" style={styles.stepTitle}>
							Ready to Host
						</ThemedText>
						<ThemedText style={styles.summaryText}>
							Quest: {selectedQuest?.name}
						</ThemedText>
						<ThemedText style={styles.summaryText}>
							World: {selectedWorld?.name}
						</ThemedText>
						<ThemedText style={styles.summaryText}>
							Location: {selectedLocation?.name}
						</ThemedText>
						<TouchableOpacity
							style={[styles.button, loading && styles.buttonDisabled]}
							onPress={handleCreateGame}
							disabled={loading}
						>
							<ThemedText style={styles.buttonText}>
								{loading ? 'Creating...' : 'Create Game'}
							</ThemedText>
						</TouchableOpacity>
					</View>
				);
			case 'waiting':
				return (
					<View style={styles.waitingContainer}>
						{session && (
							<>
								<InviteCodeDisplay inviteCode={session.inviteCode} />
								<View style={styles.spacer} />
								<PlayerList
									players={session.players}
									characters={session.gameState?.characters}
								/>
								<TouchableOpacity
									style={[
										styles.button,
										styles.startButton,
										(loading || session.players.length === 0) &&
											styles.buttonDisabled,
									]}
									onPress={handleStartGame}
									disabled={loading || session.players.length === 0}
								>
									<ThemedText style={styles.buttonText}>
										{loading ? 'Starting...' : 'Start Game'}
									</ThemedText>
								</TouchableOpacity>
							</>
						)}
					</View>
				);
			default:
				return null;
		}
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Host Game',
					headerShown: true,
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: insets.top + 20 },
				]}
			>
				{renderStepContent()}
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	chooserContainer: {
		flex: 1,
		padding: 20,
	},
	stepTitle: {
		marginBottom: 20,
		textAlign: 'center',
	},
	readyContainer: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	summaryText: {
		fontSize: 18,
		marginBottom: 12,
		color: '#3B2F1B',
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		marginTop: 20,
		minWidth: 200,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	startButton: {
		backgroundColor: '#8B6914',
		marginTop: 30,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
	waitingContainer: {
		flex: 1,
		padding: 20,
	},
	spacer: {
		height: 30,
	},
});

export default HostGameScreen;

