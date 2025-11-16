import { Stack, router } from 'expo-router';
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
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { InviteCodeDisplay } from '@/components/invite-code-display';
import { LocationChooser } from '@/components/location-chooser';
import { PlayerList } from '@/components/player-list';
import { QuestSelector } from '@/components/quest-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorldChooser } from '@/components/world-chooser';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { GameSessionResponse, HostedGameSummary } from '@/types/api/multiplayer-api';
import { LocationOption } from '@/types/location-option';
import { MapState, NpcDefinition } from '@/types/multiplayer-map';
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

const HostGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<HostStep>('quest');
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [session, setSession] = useState<GameSessionResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [mapState, setMapState] = useState<MapState | null>(null);
	const [mapLoading, setMapLoading] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [npcPalette, setNpcPalette] = useState<NpcDefinition[]>([]);
	const [selectedNpc, setSelectedNpc] = useState<NpcDefinition | null>(null);
	const [hostedGames, setHostedGames] = useState<HostedGameSummary[]>([]);
	const [gamesLoading, setGamesLoading] = useState(true);
	const [gamesError, setGamesError] = useState<string | null>(null);
	const [resumingGame, setResumingGame] = useState(false);
	const insets = useSafeAreaInsets();
	const { user } = useAuthStore();
	const hostId = user?.id ?? null;
	const hostEmail = user?.email ?? null;
	const resumableGames = useMemo(
		() => [...hostedGames].sort((a, b) => b.updatedAt - a.updatedAt),
		[hostedGames],
	);

	const loadHostedGames = useCallback(async () => {
		if (!user?.id && !user?.email) {
			setHostedGames([]);
			setGamesLoading(false);
			return;
		}

		setGamesError(null);
		setGamesLoading(true);
		try {
			const overview = await multiplayerClient.getMyGames();
			const resumable = (overview.hostedGames || []).filter(game =>
				game.status === 'waiting' || game.status === 'active',
			);
			setHostedGames(resumable);
		} catch (error) {
			console.error('Failed to load hosted games:', error);
			setGamesError(error instanceof Error ? error.message : 'Failed to load hosted games');
		} finally {
			setGamesLoading(false);
		}
	}, [user?.id, user?.email]);

	const refreshMapState = useCallback(async () => {
		if (!session?.inviteCode) {
			setMapState(null);
			return;
		}

		setMapError(null);
		setMapLoading(true);
		try {
			const state = await multiplayerClient.getMapState(session.inviteCode);
			setMapState(state);
		} catch (error) {
			console.error('Failed to load map state:', error);
			setMapError(error instanceof Error ? error.message : 'Failed to load map');
		} finally {
			setMapLoading(false);
		}
	}, [session?.inviteCode]);

	useEffect(() => {
		if (user) {
			loadHostedGames();
		}
	}, [user, loadHostedGames]);

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

	useEffect(() => {
		if (!session?.inviteCode) {
			setNpcPalette([]);
			setMapState(null);
			return;
		}

		refreshMapState().catch(() => undefined);
		multiplayerClient
			.getNpcDefinitions(session.inviteCode)
			.then(response => setNpcPalette(response.npcs))
			.catch(error => {
				console.error('Failed to load NPC palette:', error);
				setMapError(prev => prev ?? 'Failed to load NPCs');
			});
	}, [session?.inviteCode, refreshMapState]);

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

	const handleTilePress = useCallback(
		async (x: number, y: number) => {
			if (!session?.inviteCode || !selectedNpc) {
				return;
			}

			try {
				await multiplayerClient.placeNpc(session.inviteCode, {
					npcId: selectedNpc.slug,
					x,
					y,
					label: selectedNpc.name,
				});
				await refreshMapState();
			} catch (error) {
				Alert.alert(
					'Placement Failed',
					error instanceof Error ? error.message : 'Unable to place NPC',
				);
			}
		},
		[session?.inviteCode, selectedNpc, refreshMapState],
	);

	const handleCreateGame = async () => {
		if (!selectedQuest || !selectedWorld || !selectedLocation || !hostId) {
			Alert.alert('Error', 'Please complete all steps');
			return;
		}

		setLoading(true);
		try {
			const newSession = await multiplayerClient.createGame({
				questId: selectedQuest.id,
				quest: selectedQuest, // Send quest object directly
				world: selectedWorld.name,
				startingArea: selectedLocation.name,
				hostId,
				hostEmail: hostEmail ?? undefined,
			});

			setSession(newSession);
			setCurrentStep('waiting');
			loadHostedGames().catch(() => undefined);
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
		if (!session) {
			return;
		}

		if (!hostId) {
			Alert.alert('Error', 'Missing host identity. Please re-authenticate and try again.');
			return;
		}

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
				})),
				playerCharacterId: session.players[0]?.characterId || '',
				gameWorld: selectedWorld!.name,
				startingArea: selectedLocation!.name,
				status: 'active' as const,
				createdAt: Date.now(),
				lastUpdated: Date.now(),
				messages: [],
				mapState: mapState,
				activityLog: [],
			};

			await multiplayerClient.startGame(session.inviteCode, hostId, initialGameState);
			router.replace(`/multiplayer-game?inviteCode=${session.inviteCode}&hostId=${hostId}`);
			loadHostedGames().catch(() => undefined);
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to start game',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleResumeHostedGame = useCallback(
		async (game: HostedGameSummary) => {
			if (!hostId) {
				Alert.alert('Error', 'Missing host identity. Please re-authenticate and try again.');
				return;
			}

			setResumingGame(true);
			try {
				const existingSession = await multiplayerClient.getGameSession(game.inviteCode);
				if (existingSession.status === 'waiting') {
					setSelectedQuest(existingSession.quest);
					setSelectedWorld(createAdHocWorldOption(game.world));
					setSelectedLocation(createAdHocLocationOption(game.startingArea));
					setSession(existingSession);
					setCurrentStep('waiting');
				} else if (existingSession.status === 'active') {
					router.replace(`/multiplayer-game?inviteCode=${game.inviteCode}&hostId=${hostId}`);
				} else {
					Alert.alert(
						'Unavailable',
						`This game is ${existingSession.status}. Start a new session instead.`,
					);
				}
			} catch (error) {
				Alert.alert(
					'Error',
					error instanceof Error ? error.message : 'Failed to resume game',
				);
			} finally {
				setResumingGame(false);
			}
		},
		[hostId],
	);

	const renderHostedGames = useCallback(() => {
		if (gamesLoading) {
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading hosted games...</ThemedText>
				</View>
			);
		}

		if (gamesError) {
			return (
				<View style={styles.errorBox}>
					<ThemedText style={styles.errorText}>{gamesError}</ThemedText>
					<TouchableOpacity
						style={[styles.button, styles.refreshButton]}
						onPress={() => loadHostedGames().catch(() => undefined)}
					>
						<ThemedText style={styles.buttonText}>Retry</ThemedText>
					</TouchableOpacity>
				</View>
			);
		}

		if (resumableGames.length === 0) {
			return (
				<View style={styles.emptyStateBox}>
					<ThemedText style={styles.emptyStateText}>No hosted games yet.</ThemedText>
					<ThemedText style={styles.emptyStateSubtext}>
						Start a new adventure to generate an invite code.
					</ThemedText>
				</View>
			);
		}

		return resumableGames.map(game => (
			<View key={game.id} style={styles.gameCard}>
				<View style={styles.gameCardHeader}>
					<ThemedText style={styles.gameTitle}>{game.quest.name}</ThemedText>
					<View
						style={[
							styles.statusBadge,
							game.status === 'active'
								? styles.statusActive
								: game.status === 'waiting'
									? styles.statusWaiting
									: styles.statusIdle,
						]}
					>
						<ThemedText style={styles.statusText}>{game.status.toUpperCase()}</ThemedText>
					</View>
				</View>
				<ThemedText style={styles.gameMeta}>Invite Code: {game.inviteCode}</ThemedText>
				<ThemedText style={styles.gameMeta}>
					World: {game.world} • Start: {game.startingArea}
				</ThemedText>
				<ThemedText style={styles.gameMeta}>
					Updated {new Date(game.updatedAt).toLocaleString()}
				</ThemedText>
				<TouchableOpacity
					style={[
						styles.button,
						styles.resumeButton,
						(resumingGame || loading) && styles.buttonDisabled,
					]}
					onPress={() => handleResumeHostedGame(game)}
					disabled={resumingGame || loading}
				>
					<ThemedText style={styles.buttonText}>
						{resumingGame
							? 'Opening...'
							: game.status === 'active'
								? 'Rejoin Game'
								: 'Open Lobby'}
					</ThemedText>
				</TouchableOpacity>
			</View>
		));
	}, [
		gamesLoading,
		gamesError,
		loadHostedGames,
		resumableGames,
		resumingGame,
		loading,
		handleResumeHostedGame,
	]);

	const renderStepContent = () => {
		switch (currentStep) {
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
			case 'ready':
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
								<View style={styles.dmWorkspace}>
									<View style={styles.workspaceHeader}>
										<ThemedText type="subtitle">Interactive Map</ThemedText>
										<TouchableOpacity
											style={styles.mapRefreshButton}
											onPress={() => refreshMapState().catch(() => undefined)}
										>
											<ThemedText style={styles.mapRefreshButtonText}>
												Refresh
											</ThemedText>
										</TouchableOpacity>
									</View>
									{mapError && (
										<ThemedText style={styles.errorText}>{mapError}</ThemedText>
									)}
									{mapLoading ? (
										<View style={styles.loadingContainer}>
											<ActivityIndicator size="small" color="#8B6914" />
											<ThemedText style={styles.loadingText}>
												Loading map...
											</ThemedText>
										</View>
									) : (
										<InteractiveMap
											map={mapState}
											isEditable
											onTilePress={handleTilePress}
										/>
									)}
									<View style={styles.paletteHeader}>
										<ThemedText type="subtitle">NPC Palette</ThemedText>
										<ThemedText style={styles.paletteHint}>
											Select an NPC, then tap the map to place.
										</ThemedText>
									</View>
									<ScrollView
										horizontal
										style={styles.paletteScroll}
										contentContainerStyle={styles.paletteContent}
										showsHorizontalScrollIndicator={false}
									>
										{npcPalette.length === 0 && (
											<ThemedText style={styles.emptyStateText}>
												No NPC definitions available.
											</ThemedText>
										)}
										{npcPalette.map(npc => {
											const isSelected = selectedNpc?.id === npc.id;
											return (
												<TouchableOpacity
													key={npc.id}
													style={[
														styles.npcCard,
														isSelected && styles.npcCardSelected,
													]}
													onPress={() =>
														setSelectedNpc(isSelected ? null : npc)
													}
												>
													<ThemedText style={styles.npcName}>{npc.name}</ThemedText>
													<ThemedText style={styles.npcMeta}>
														{npc.role} • {npc.alignment}
													</ThemedText>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>
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

	if (!user) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Host Game',
						headerShown: true,
					}}
				/>
				<View style={styles.loaderFallback}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading your profile...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

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
					{ paddingTop: insets.top + 20, paddingBottom: 160 },
				]}
			>
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<ThemedText type="title" style={styles.sectionTitle}>
							Continue Hosting
						</ThemedText>
						<TouchableOpacity
							style={[styles.secondaryButton, gamesLoading && styles.buttonDisabled]}
							onPress={() => loadHostedGames().catch(() => undefined)}
							disabled={gamesLoading}
						>
							<ThemedText style={styles.secondaryButtonText}>
								{gamesLoading ? 'Refreshing...' : 'Refresh'}
							</ThemedText>
						</TouchableOpacity>
					</View>
					<View style={styles.gameList}>{renderHostedGames()}</View>
				</View>

				<View style={styles.section}>
					<ThemedText type="title" style={styles.sectionTitle}>
						Start a New Game
					</ThemedText>
					{renderStepContent()}
				</View>
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
	section: {
		paddingHorizontal: 20,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	sectionTitle: {
		textAlign: 'left',
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
	secondaryButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#8B6914',
	},
	secondaryButtonText: {
		color: '#8B6914',
		fontWeight: '600',
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
	dmWorkspace: {
		marginTop: 24,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		backgroundColor: '#FFF9EF',
		gap: 12,
	},
	workspaceHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	mapRefreshButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#3B2F1B',
	},
	mapRefreshButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	spacer: {
		height: 30,
	},
	gameList: {
		gap: 16,
	},
	gameCard: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		padding: 16,
		backgroundColor: '#FFF9EF',
	},
	gameCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	gameTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
		flexShrink: 1,
		marginRight: 12,
	},
	statusBadge: {
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 4,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	statusActive: {
		backgroundColor: '#2E7D32',
	},
	statusWaiting: {
		backgroundColor: '#D97706',
	},
	statusIdle: {
		backgroundColor: '#6B7280',
	},
	gameMeta: {
		fontSize: 14,
		color: '#5A4A3A',
		marginBottom: 4,
	},
	resumeButton: {
		marginTop: 12,
	},
	emptyStateBox: {
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FBF4E3',
		alignItems: 'center',
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
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
	errorBox: {
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#F2C94C',
		backgroundColor: '#FFF7E1',
		alignItems: 'center',
		gap: 12,
	},
	errorText: {
		color: '#B91C1C',
		fontWeight: '600',
		textAlign: 'center',
	},
	refreshButton: {
		backgroundColor: '#8B6914',
	},
	paletteHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	paletteHint: {
		color: '#6B5B3D',
		fontSize: 12,
	},
	paletteScroll: {
		marginTop: 8,
	},
	paletteContent: {
		gap: 12,
		paddingRight: 12,
	},
	npcCard: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		minWidth: 140,
		backgroundColor: '#FFFFFF',
	},
	npcCardSelected: {
		borderColor: '#8B6914',
		backgroundColor: '#F5E6D3',
	},
	npcName: {
		fontWeight: '600',
	},
	npcMeta: {
		color: '#6B5B3D',
		fontSize: 12,
	},
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
});

export default HostGameScreen;

