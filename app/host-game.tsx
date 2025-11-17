import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
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
import {
	GameSessionResponse,
	HostedGameSummary,
	NpcPlacementRequest,
	PlacedNpc,
} from '@/types/api/multiplayer-api';
import { LocationOption } from '@/types/location-option';
import { MapState, NpcDefinition } from '@/types/multiplayer-map';
import { Quest } from '@/types/quest';
import { WorldOption } from '@/types/world-option';

type HostStep = 'quest' | 'world' | 'location' | 'ready' | 'waiting';
type MapEditorMode = 'npc' | 'road' | 'tree' | 'erase';
type MapPresetOption = 'forest' | 'road' | 'dungeon' | 'town';

const MAP_PRESETS: MapPresetOption[] = ['forest', 'road', 'dungeon', 'town'];
const MAP_EDITOR_MODES: Array<{ key: MapEditorMode; label: string }> = [
	{ key: 'npc', label: 'NPC' },
	{ key: 'road', label: 'Road' },
	{ key: 'tree', label: 'Tree' },
	{ key: 'erase', label: 'Erase' },
];

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
	const [customNpcForm, setCustomNpcForm] = useState<NonNullable<NpcPlacementRequest['customNpc']>>({
		name: 'Custom Ally',
		role: 'Support',
		alignment: 'neutral',
		disposition: 'friendly',
		description: 'Quick ally ready to assist the party.',
		maxHealth: 18,
		armorClass: 12,
		color: '#4A6741',
	});
	const [useCustomNpc, setUseCustomNpc] = useState(false);
	const [npcInstances, setNpcInstances] = useState<PlacedNpc[]>([]);
	const [npcInstancesLoading, setNpcInstancesLoading] = useState(false);
	const [editorMode, setEditorMode] = useState<MapEditorMode>('npc');
	const [mapPreset, setMapPreset] = useState<MapPresetOption>('forest');
	const [mutatingTerrain, setMutatingTerrain] = useState(false);
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

	const loadNpcInstances = useCallback(async () => {
		if (!session?.inviteCode) {
			setNpcInstances([]);
			return;
		}

		setNpcInstancesLoading(true);
		try {
			const instances = await multiplayerClient.getNpcInstances(session.inviteCode);
			setNpcInstances(instances.instances);
		} catch (error) {
			console.error('Failed to load NPC instances:', error);
		} finally {
			setNpcInstancesLoading(false);
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
			setNpcInstances([]);
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
		loadNpcInstances().catch(() => undefined);
	}, [session?.inviteCode, refreshMapState, loadNpcInstances]);

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
			if (!session?.inviteCode || !mapState) {
				return;
			}

			if (editorMode === 'npc') {
				const customPayload = !selectedNpc && useCustomNpc ? customNpcForm : null;
				if (!selectedNpc && !customPayload) {
					Alert.alert('Select NPC', 'Choose an NPC from the palette first.');
					return;
				}

				try {
					await multiplayerClient.placeNpc(session.inviteCode, {
						npcId: selectedNpc?.slug ?? 'custom',
						x,
						y,
						label: selectedNpc?.name ?? customPayload?.name,
						customNpc: customPayload ?? undefined,
					});
					await Promise.all([refreshMapState(), loadNpcInstances()]);
				} catch (error) {
					Alert.alert(
						'Placement Failed',
						error instanceof Error ? error.message : 'Unable to place NPC',
					);
				}
				return;
			}

			const terrainType =
			editorMode === 'road'
					? 'road'
					: editorMode === 'tree'
						? 'tree'
						: mapState.defaultTerrain ?? 'stone';
			const featureType =
				editorMode === 'road' ? 'road' : editorMode === 'tree' ? 'tree' : null;
			setMutatingTerrain(true);
			try {
				await multiplayerClient.mutateTerrain(session.inviteCode, {
					tiles: [
						{
							x,
							y,
							terrainType,
							featureType,
							isBlocked: editorMode === 'tree',
							metadata:
								editorMode === 'road'
									? { variant: 'stone' }
									: editorMode === 'tree'
										? { variant: 'oak' }
										: {},
						},
					],
				});
				await refreshMapState();
			} catch (error) {
				Alert.alert(
					'Edit Failed',
					error instanceof Error ? error.message : 'Unable to edit terrain',
				);
			} finally {
				setMutatingTerrain(false);
			}
		},
		[
			session?.inviteCode,
			editorMode,
			selectedNpc,
			mapState,
			refreshMapState,
			loadNpcInstances,
		],
	);

	const handleGenerateMap = useCallback(async () => {
		if (!session?.inviteCode) {
			return;
		}

		setMapLoading(true);
		try {
			const generated = await multiplayerClient.generateMap(session.inviteCode, {
				preset: mapPreset,
			});
			setMapState(generated);
		} catch (error) {
			Alert.alert(
				'Generation Failed',
				error instanceof Error ? error.message : 'Unable to generate map',
			);
		} finally {
			setMapLoading(false);
		}
	}, [session?.inviteCode, mapPreset]);

	const handleNpcHealthAdjust = useCallback(
		async (tokenId: string, currentHealth: number, delta: number) => {
			if (!session?.inviteCode) {
				return;
			}

			try {
				await multiplayerClient.updateNpcInstance(session.inviteCode, tokenId, {
					currentHealth: currentHealth + delta,
				});
				await loadNpcInstances();
			} catch (error) {
				Alert.alert(
					'Update Failed',
					error instanceof Error ? error.message : 'Unable to update NPC',
				);
			}
		},
		[session?.inviteCode, loadNpcInstances],
	);

	const handleNpcFriendlyToggle = useCallback(
		async (tokenId: string, nextValue: boolean) => {
			if (!session?.inviteCode) {
			 return;
			}

			try {
				await multiplayerClient.updateNpcInstance(session.inviteCode, tokenId, {
					isFriendly: nextValue,
				});
				await loadNpcInstances();
			} catch (error) {
				Alert.alert(
					'Update Failed',
					error instanceof Error ? error.message : 'Unable to update NPC',
				);
			}
		},
		[session?.inviteCode, loadNpcInstances],
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
					<ThemedText style={styles.emptyStateSubtext}>
						No NPCs placed yet.
					</ThemedText>
				) : (
					npcInstances.map(instance => (
						<View key={instance.id} style={styles.instanceCard}>
							<View style={styles.instanceRow}>
								<ThemedText style={styles.instanceName}>{instance.name}</ThemedText>
								<TouchableOpacity
									style={[
										styles.statusBadge,
										instance.isFriendly
											? styles.statusFriendly
											: styles.statusHostile,
									]}
									onPress={() =>
										handleNpcFriendlyToggle(instance.tokenId, !instance.isFriendly)
									}
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
							<View style={styles.hostWorkspace}>
								<View style={styles.sidebar}>
									<PlayerList
										players={session.players}
										characters={session.gameState?.characters}
									/>
									{renderNpcInstances()}
								</View>
								<View style={styles.mapColumn}>
									<View style={styles.editorToolbar}>
										<View style={styles.workspaceHeader}>
											<ThemedText type="subtitle">Map Tools</ThemedText>
											<View style={styles.toolbarActions}>
												<TouchableOpacity
													style={styles.mapRefreshButton}
													onPress={() => refreshMapState().catch(() => undefined)}
												>
													<ThemedText style={styles.mapRefreshButtonText}>
														Refresh
													</ThemedText>
												</TouchableOpacity>
												{mutatingTerrain && (
													<ActivityIndicator size="small" color="#8B6914" />
												)}
											</View>
										</View>
										<View style={styles.presetControls}>
											{MAP_PRESETS.map(preset => {
												const active = mapPreset === preset;
												return (
													<TouchableOpacity
														key={preset}
														style={[
															styles.presetButton,
															active && styles.presetButtonActive,
														]}
														onPress={() => setMapPreset(preset)}
													>
														<ThemedText
															style={[
																styles.presetButtonText,
																active && styles.presetButtonTextActive,
															]}
														>
															{preset}
														</ThemedText>
													</TouchableOpacity>
												);
											})}
											<TouchableOpacity
												style={[
													styles.generateButton,
													mapLoading && styles.buttonDisabled,
												]}
												onPress={handleGenerateMap}
												disabled={mapLoading}
											>
												<ThemedText style={styles.generateButtonText}>
													{mapLoading ? 'Working...' : 'Generate'}
												</ThemedText>
											</TouchableOpacity>
										</View>
										<View style={styles.editorModes}>
											{MAP_EDITOR_MODES.map(mode => {
												const active = editorMode === mode.key;
												return (
													<TouchableOpacity
														key={mode.key}
														style={[
															styles.modeButton,
															active && styles.modeButtonActive,
														]}
														onPress={() => setEditorMode(mode.key)}
													>
														<ThemedText
															style={[
																styles.modeButtonText,
																active && styles.modeButtonTextActive,
															]}
														>
															{mode.label}
														</ThemedText>
													</TouchableOpacity>
												);
											})}
										</View>
									</View>
									<View style={styles.dmWorkspace}>
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
												const isSelected = selectedNpc?.id === npc.id && !useCustomNpc;
												return (
													<TouchableOpacity
														key={npc.id}
														style={[
															styles.npcCard,
															isSelected && styles.npcCardSelected,
														]}
														onPress={() => {
															setUseCustomNpc(false);
															setSelectedNpc(isSelected ? null : npc);
														}}
													>
														<ThemedText style={styles.npcName}>
															{npc.name}
														</ThemedText>
														<ThemedText style={styles.npcMeta}>
															{npc.role} • {npc.alignment}
														</ThemedText>
													</TouchableOpacity>
												);
											})}
											<View
												style={[
													styles.npcCard,
													useCustomNpc && styles.npcCardSelected,
												]}
											>
												<ThemedText style={styles.npcName}>
													Custom NPC
												</ThemedText>
												<TextInput
													style={styles.input}
													value={customNpcForm.name}
													onChangeText={value =>
														setCustomNpcForm(prev => ({ ...prev, name: value }))
													}
													placeholder="Name"
													placeholderTextColor="#9C8A63"
												/>
												<TextInput
													style={styles.input}
													value={customNpcForm.role}
													onChangeText={value =>
														setCustomNpcForm(prev => ({ ...prev, role: value }))
													}
													placeholder="Role"
													placeholderTextColor="#9C8A63"
												/>
												<View style={styles.dispositionRow}>
													{['friendly', 'neutral', 'hostile'].map(disposition => {
														const active = customNpcForm.disposition === disposition;
														return (
															<TouchableOpacity
																key={disposition}
																style={[
																	styles.dispositionButton,
																	active && styles.dispositionButtonActive,
																]}
																onPress={() =>
																	setCustomNpcForm(prev => ({
																		...prev,
																		disposition: disposition as NonNullable<
																			NpcPlacementRequest['customNpc']
																		>['disposition'],
																		alignment:
																			disposition === 'hostile'
																				? 'chaotic_evil'
																				: 'neutral',
																	}))
																}
															>
																<ThemedText
																	style={[
																		styles.dispositionButtonText,
																		active && styles.dispositionButtonTextActive,
																	]}
																>
																	{disposition}
																</ThemedText>
															</TouchableOpacity>
														);
													})}
												</View>
												<TouchableOpacity
													style={styles.customNpcButton}
													onPress={() => {
														setSelectedNpc(null);
														setUseCustomNpc(true);
													}}
												>
													<ThemedText style={styles.customNpcButtonText}>
														Use Custom
													</ThemedText>
												</TouchableOpacity>
											</View>
										</ScrollView>
									</View>
								</View>
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
	toolbarActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	editorToolbar: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF4DF',
		gap: 12,
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
	presetControls: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		alignItems: 'center',
	},
	presetButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	presetButtonActive: {
		backgroundColor: '#C9B037',
	},
	presetButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	presetButtonTextActive: {
		color: '#1F130A',
	},
	generateButton: {
		backgroundColor: '#3B2F1B',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 12,
	},
	generateButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	editorModes: {
		flexDirection: 'row',
		gap: 8,
	},
	modeButton: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#D4BC8B',
	},
	modeButtonActive: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	modeButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	modeButtonTextActive: {
		color: '#FFF9EF',
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
	input: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		color: '#3B2F1B',
	},
	dispositionRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	dispositionButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	dispositionButtonActive: {
		backgroundColor: '#C9B037',
	},
	dispositionButtonText: {
		color: '#6B5B3D',
		fontSize: 12,
		textTransform: 'capitalize',
	},
	dispositionButtonTextActive: {
		color: '#1F130A',
	},
	customNpcButton: {
		marginTop: 8,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#3B2F1B',
		alignItems: 'center',
	},
	customNpcButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
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
		color: '#3B2F1B',
		fontWeight: '600',
	},
	instanceActions: {
		flexDirection: 'row',
		gap: 8,
	},
	adjustButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#C9B037',
	},
	adjustButtonText: {
		color: '#1F130A',
		fontWeight: '700',
	},
	statusFriendly: {
		backgroundColor: '#2E7D32',
	},
	statusHostile: {
		backgroundColor: '#B91C1C',
	},
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
});

export default HostGameScreen;

