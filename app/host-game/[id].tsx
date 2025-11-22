import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { InviteCodeDisplay } from '@/components/invite-code-display';
import { LocationChooser } from '@/components/location-chooser';
import { MapManagementPanel } from '@/components/map-management-panel';
import { PlayerList } from '@/components/player-list';
import { QuestSelector } from '@/components/quest-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorldChooser } from '@/components/world-chooser';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import {
    GameSessionResponse,
    PlacedNpc,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { LocationOption } from '@/types/location-option';
import { NpcDefinition } from '@/types/multiplayer-map';
import { Quest } from '@/types/quest';
import { WorldOption } from '@/types/world-option';

type HostStep = 'quest' | 'world' | 'location' | 'ready' | 'waiting';

const createAdHocWorldOption = (name: string): WorldOption => ({
	id: `saved-world-${name}`,
	name,
	description: `Adventure in ${name}`,
	image: {} as any,
});

const createAdHocLocationOption = (name: string): LocationOption => ({
	id: `saved-location-${name}`,
	name,
	description: `Begin at ${name}`,
	image: {} as any,
});

const HostGameLobbyScreen: React.FC = () => {
	const params = useLocalSearchParams<{ id: string }>();
	const inviteCode = params.id;
	const [currentStep, setCurrentStep] = useState<HostStep>('quest');
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [session, setSession] = useState<GameSessionResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [lobbyCharacters, setLobbyCharacters] = useState<Character[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(false);
	const [npcInstances, setNpcInstances] = useState<PlacedNpc[]>([]);
	const [npcInstancesLoading, setNpcInstancesLoading] = useState(false);
	const [npcPalette, setNpcPalette] = useState<NpcDefinition[]>([]);
	const [currentMapId, setCurrentMapId] = useState<string | null>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const hostId = user?.id ?? null;
	const hostEmail = user?.email ?? null;

	const playerRosterKey = useMemo(() => {
		if (!session?.players?.length) {
			return '';
		}
		return [...session.players.map(player => player.characterId)].sort().join('|');
	}, [session?.players]);

	const rosterMap = useMemo(
		() => new Map(lobbyCharacters.map(character => [character.id, character])),
		[lobbyCharacters],
	);

	const loadSession = useCallback(async () => {
		if (!inviteCode) return;

		// Handle 'new' route - start from quest selection
		if (inviteCode === 'new') {
			setCurrentStep('quest');
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const existingSession = await multiplayerClient.getGameSession(inviteCode);
			setSession(existingSession);
			// Get current map ID from session response
			if (existingSession.currentMapId) {
				setCurrentMapId(existingSession.currentMapId);
			}
			if (existingSession.status === 'waiting') {
				setSelectedQuest(existingSession.quest);
				setCurrentStep('waiting');
			} else if (existingSession.status === 'active') {
				// If game is active, allow host to manage it from the lobby
				// They can see the current state and make changes
				setSelectedQuest(existingSession.quest);
				setCurrentStep('waiting');
				// Optionally, you could show a banner that the game is active
			}
		} catch (error) {
			console.error('Failed to load session:', error);
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load game');
			router.replace('/host-game');
		} finally {
			setLoading(false);
		}
	}, [inviteCode, hostId]);

	const loadNpcInstances = useCallback(async () => {
		if (!inviteCode || inviteCode === 'new') {
			setNpcInstances([]);
			return;
		}

		setNpcInstancesLoading(true);
		try {
			const instances = await multiplayerClient.getNpcInstances(inviteCode);
			setNpcInstances(instances.instances);
		} catch (error) {
			console.error('Failed to load NPC instances:', error);
		} finally {
			setNpcInstancesLoading(false);
		}
	}, [inviteCode]);

	useEffect(() => {
		if (inviteCode) {
			loadSession();
		}
	}, [inviteCode, loadSession]);

	useEffect(() => {
		if (!inviteCode || inviteCode === 'new') {
			setLobbyCharacters([]);
			return;
		}

		let cancelled = false;
		setCharactersLoading(true);
		multiplayerClient
			.getGameCharacters(inviteCode)
			.then(response => {
				if (!cancelled) {
					setLobbyCharacters(response.characters);
				}
			})
			.catch(error => {
				if (!cancelled) {
					console.error('Failed to load lobby characters:', error);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setCharactersLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [inviteCode, playerRosterKey]);

	useEffect(() => {
		if (!inviteCode || inviteCode === 'new') {
			setNpcPalette([]);
			setNpcInstances([]);
			return;
		}

		multiplayerClient
			.getNpcDefinitions(inviteCode)
			.then(response => setNpcPalette(response.npcs))
			.catch(error => {
				console.error('Failed to load NPC palette:', error);
			});
		loadNpcInstances().catch(() => undefined);
	}, [inviteCode, loadNpcInstances]);

	useEffect(() => {
		if (currentStep === 'waiting' && inviteCode && inviteCode !== 'new') {
			const interval = setInterval(async () => {
				try {
					const updatedSession = await multiplayerClient.getGameSession(inviteCode);
					setSession(updatedSession);
				} catch (error) {
					console.error('Failed to poll session:', error);
				}
			}, 2000);

			return () => clearInterval(interval);
		}
	}, [currentStep, inviteCode]);

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
		setCurrentStep('ready');
	};

	const handleCreateGame = async () => {
		if (!selectedQuest || !selectedWorld || !selectedLocation || !hostId) {
			Alert.alert('Error', 'Please complete all steps');
			return;
		}

		setLoading(true);
		try {
			const newSession = await multiplayerClient.createGame({
				questId: selectedQuest.id,
				quest: selectedQuest,
				world: selectedWorld.name,
				startingArea: selectedLocation.name,
				hostId,
				hostEmail: hostEmail ?? undefined,
			});

			setSession(newSession);
			setCurrentStep('waiting');
			router.replace(`/host-game/${newSession.inviteCode}`);
		} catch (error) {
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create game');
		} finally {
			setLoading(false);
		}
	};

	const handleStartGame = async () => {
		if (!session || !hostId) {
			Alert.alert('Error', 'Session or host ID missing');
			return;
		}

		if (!currentMapId) {
			Alert.alert('Map Required', 'Please select a map before starting the game.');
			return;
		}

		setLoading(true);
		try {
			const characters = session.characters && session.characters.length > 0
				? session.characters
				: session.players.map(player => {
					const rosterCharacter = rosterMap.get(player.characterId);
					if (rosterCharacter) {
						return rosterCharacter;
					}
					const sessionCharacter = session.characters?.find(c => c.id === player.characterId);
					if (sessionCharacter) {
						return sessionCharacter;
					}
					return {
						id: player.characterId,
						level: player.level ?? 1,
						race: player.race ?? 'Unknown',
						name: player.name || 'Unknown',
						class: player.class ?? 'Unknown',
						stats: {
							STR: 10,
							DEX: 10,
							CON: 10,
							INT: 10,
							WIS: 10,
							CHA: 10,
						},
						skills: [],
						inventory: [],
						equipped: {},
						health: 10,
						maxHealth: 10,
						actionPoints: 3,
						maxActionPoints: 3,
					};
				});

			// Get world and location from session if not set (for existing games)
			// selectedWorld and selectedLocation are only set during initial game creation
			// For existing games, use session data
			const gameWorld = selectedWorld?.name ?? session.world ?? session.gameState?.gameWorld ?? 'Unknown';
			const startingArea = selectedLocation?.name ?? session.startingArea ?? session.gameState?.startingArea ?? 'Unknown';
			const quest = selectedQuest || session.quest;

			if (!quest) {
				Alert.alert('Error', 'Quest information is missing');
				setLoading(false);
				return;
			}

			const initialGameState = {
				sessionId: session.sessionId,
				inviteCode: session.inviteCode,
				hostId,
				quest,
				players: session.players,
				characters,
				playerCharacterId: session.players[0]?.characterId || '',
				gameWorld,
				startingArea,
				status: 'active' as const,
				createdAt: Date.now(),
				lastUpdated: Date.now(),
				messages: [],
				mapState: null,
				activityLog: [],
			};

			await multiplayerClient.startGame(session.inviteCode, hostId, initialGameState);
			router.replace(`/multiplayer-game?inviteCode=${session.inviteCode}&hostId=${hostId}`);
		} catch (error) {
			console.error('Failed to start game:', error);
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start game');
		} finally {
			setLoading(false);
		}
	};

	const handleNpcHealthAdjust = useCallback(
		async (tokenId: string, currentHealth: number, delta: number) => {
			if (!inviteCode) {
				return;
			}

			try {
				await multiplayerClient.updateNpcInstance(inviteCode, tokenId, {
					currentHealth: currentHealth + delta,
				});
				await loadNpcInstances();
			} catch (error) {
				Alert.alert('Update Failed', error instanceof Error ? error.message : 'Unable to update NPC');
			}
		},
		[inviteCode, loadNpcInstances],
	);

	const handleNpcFriendlyToggle = useCallback(
		async (tokenId: string, nextValue: boolean) => {
			if (!inviteCode) {
				return;
			}

			try {
				await multiplayerClient.updateNpcInstance(inviteCode, tokenId, {
					isFriendly: nextValue,
				});
				await loadNpcInstances();
			} catch (error) {
				Alert.alert('Update Failed', error instanceof Error ? error.message : 'Unable to update NPC');
			}
		},
		[inviteCode, loadNpcInstances],
	);

	const renderNpcInstances = useCallback(() => {
		return (
			<View style={styles.instancePanel}>
				<View style={styles.instanceHeader}>
					<ThemedText type="subtitle">Battlefield NPCs</ThemedText>
					<TouchableOpacity
						style={styles.mapRefreshButton}
						onPress={() => loadNpcInstances().catch(() => undefined)}
					>
						<ThemedText style={styles.mapRefreshButtonText}>Reload</ThemedText>
					</TouchableOpacity>
				</View>
				{npcInstancesLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#8B6914" />
						<ThemedText style={styles.loadingText}>Syncing NPCs...</ThemedText>
					</View>
				) : npcInstances.length === 0 ? (
					<ThemedText style={styles.emptyStateSubtext}>No NPCs placed yet.</ThemedText>
				) : (
					npcInstances.map(instance => (
						<View key={instance.id} style={styles.instanceCard}>
							<View style={styles.instanceRow}>
								<ThemedText style={styles.instanceName}>{instance.name}</ThemedText>
								<TouchableOpacity
									style={[
										styles.statusBadge,
										instance.isFriendly ? styles.statusFriendly : styles.statusHostile,
									]}
									onPress={() => handleNpcFriendlyToggle(instance.tokenId, !instance.isFriendly)}
								>
									<ThemedText style={styles.statusText}>
										{instance.isFriendly ? 'Friendly' : 'Hostile'}
									</ThemedText>
								</TouchableOpacity>
							</View>
							<View style={styles.instanceRow}>
								<ThemedText style={styles.instanceHealth}>
									HP {instance.currentHealth}/{instance.maxHealth}
								</ThemedText>
								<View style={styles.instanceActions}>
									<TouchableOpacity
										style={styles.adjustButton}
										onPress={() =>
											handleNpcHealthAdjust(instance.tokenId, instance.currentHealth, -5)
										}
									>
										<ThemedText style={styles.adjustButtonText}>-5</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.adjustButton}
										onPress={() =>
											handleNpcHealthAdjust(instance.tokenId, instance.currentHealth, 5)
										}
									>
										<ThemedText style={styles.adjustButtonText}>+5</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					))
				)}
			</View>
		);
	}, [npcInstances, npcInstancesLoading, loadNpcInstances, handleNpcFriendlyToggle, handleNpcHealthAdjust]);

	const renderStepContent = () => {
		switch (currentStep) {
			case 'quest':
				return <QuestSelector onSelect={handleQuestSelect} selectedQuest={selectedQuest} />;
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
			case 'ready':
				return (
					<View style={styles.readyContainer}>
						<ThemedText type="title" style={styles.stepTitle}>
							Ready to Host
						</ThemedText>
						<ThemedText style={styles.summaryText}>Quest: {selectedQuest?.name}</ThemedText>
						<ThemedText style={styles.summaryText}>World: {selectedWorld?.name}</ThemedText>
						<ThemedText style={styles.summaryText}>Location: {selectedLocation?.name}</ThemedText>
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
								<View style={styles.hostWorkspace}>
									<View style={styles.sidebar}>
										{charactersLoading && (
											<ThemedText style={styles.loadingText}>
												Refreshing character roster...
											</ThemedText>
										)}
										<PlayerList
											players={session.players}
											characters={
												lobbyCharacters.length > 0
													? lobbyCharacters
													: session.characters?.length
														? session.characters
														: session.gameState?.characters
											}
										/>
										{renderNpcInstances()}
									</View>
									<View style={styles.mapColumn}>
										<MapManagementPanel
											inviteCode={inviteCode}
											currentMapId={currentMapId}
											onMapSelected={async (mapId) => {
												try {
													await multiplayerClient.switchMap(inviteCode, mapId);
													setCurrentMapId(mapId);
													await loadSession();
												} catch (error) {
													console.error('Failed to switch map:', error);
												}
											}}
											onMapCloned={async (mapId) => {
												try {
													await multiplayerClient.switchMap(inviteCode, mapId);
													setCurrentMapId(mapId);
													await loadSession();
												} catch (error) {
													console.error('Failed to switch to cloned map:', error);
												}
											}}
											onEditMap={(mapId) => {
												if (inviteCode) {
													router.push(`/host-game/${inviteCode}/${mapId}`);
												}
											}}
										/>
										<TouchableOpacity
											style={[styles.button, styles.startButton, { marginTop: 16 }]}
											onPress={() => {
												if (inviteCode) {
													router.push(`/host-game/${inviteCode}/new-map`);
												}
											}}
										>
											<ThemedText style={styles.buttonText}>Create New Map</ThemedText>
										</TouchableOpacity>
									</View>
								</View>
								<TouchableOpacity
									style={[
										styles.button,
										styles.startButton,
										(loading || session.players.length === 0 || !currentMapId) && styles.buttonDisabled,
									]}
									onPress={() => {
										console.log('Start Encounter clicked', { loading, players: session.players.length, currentMapId });
										handleStartGame();
									}}
									disabled={loading || session.players.length === 0 || !currentMapId}
								>
									<ThemedText style={styles.startButtonText}>
										{loading ? 'Starting...' : !currentMapId ? 'Select a Map First' : 'Start Encounter'}
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

	if (!user) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Host Game', headerShown: true }} />
				<View style={styles.loaderFallback}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading your profile...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	if (loading && !session) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Host Game', headerShown: true }} />
				<View style={styles.loaderFallback}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading game...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen options={{ title: 'Host Game Lobby', headerShown: true }} />
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: insets.top + 20, paddingBottom: 160 },
				]}
			>
				{renderStepContent()}
			</ScrollView>
			<AppFooter />
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
		gap: 24,
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
	buttonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	waitingContainer: {
		flex: 1,
		padding: 20,
	},
	hostWorkspace: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 20,
	},
	sidebar: {
		width: 300,
		gap: 16,
	},
	mapColumn: {
		flex: 1,
		gap: 16,
	},
	paletteHint: {
		color: '#6B5B3D',
		fontSize: 12,
		marginBottom: 12,
	},
	startButton: {
		backgroundColor: '#4A6741',
	},
	startButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 16,
	},
	instancePanel: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF9EF',
		gap: 12,
	},
	instanceHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	instanceCard: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFFFFF',
		gap: 8,
	},
	instanceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	instanceName: {
		fontWeight: '700',
		color: '#3B2F1B',
	},
	instanceHealth: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	instanceActions: {
		flexDirection: 'row',
		gap: 8,
	},
	adjustButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#C9B037',
	},
	adjustButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	statusFriendly: {
		backgroundColor: '#4A6741',
	},
	statusHostile: {
		backgroundColor: '#B91C1C',
	},
	statusText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#FFF9EF',
	},
	mapRefreshButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#8B6914',
	},
	mapRefreshButtonText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 12,
	},
	loadingText: {
		color: '#6B5B3D',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
});

export default HostGameLobbyScreen;

