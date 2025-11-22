import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommandPalette, type Command } from '@/components/command-palette';
import { InteractiveMap } from '@/components/map/interactive-map';
import { NotificationsPanel } from '@/components/notifications-panel';
import { PlayerCharacterList } from '@/components/player-character-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePollingGameState } from '@/hooks/use-polling-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useWebSocket } from '@/hooks/use-websocket';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { PlayerActionMessage } from '@/types/api/websocket-messages';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { MapState } from '@/types/multiplayer-map';
import { calculateMovementRange, findPathWithCosts } from '@/utils/movement-calculator';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const [sharedMap, setSharedMap] = useState<MapState | null>(null);
	const [movementRange, setMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
	const [pathPreview, setPathPreview] = useState<{ path: Array<{ x: number; y: number }>; cost: number } | null>(
		null,
	);
	const [movementInFlight, setMovementInFlight] = useState(false);
	const [movementMode, setMovementMode] = useState(false);
	const [isHost, setIsHost] = useState(false);
	const [wsConnected, setWsConnected] = useState(false);
	const [showMapSwitcher, setShowMapSwitcher] = useState(false);
	const [availableMaps, setAvailableMaps] = useState<Array<{ id: string; name: string }>>([]);
	const [switchingMap, setSwitchingMap] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [unreadMessageCount, setUnreadMessageCount] = useState(0);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Get character ID from gameState (memoized to prevent re-renders)
	const characterId = useMemo(() => {
		if (!gameState || !playerId) return '';
		const player = gameState.players.find(p => p.playerId === playerId);
		return player?.characterId || '';
	}, [gameState, playerId]);

	const currentCharacterId = useMemo(
		() => gameState?.players.find(p => p.playerId === playerId)?.characterId,
		[gameState?.players, playerId],
	);

	const playerToken = useMemo(() => {
		if (!sharedMap || !currentCharacterId) {
			return null;
		}

		return (
			sharedMap.tokens?.find(token => token.type === 'player' && token.entityId === currentCharacterId) ?? null
		);
	}, [sharedMap, currentCharacterId]);

	const movementBudget = useMemo(() => {
		const character = gameState?.characters.find(c => c.id === currentCharacterId);
		if (!character) {
			return 0;
		}

		return character.actionPoints ?? character.maxActionPoints ?? 6;
	}, [gameState?.characters, currentCharacterId]);

	const isPlayerTurn = useMemo(() => {
		if (!gameState?.activeTurn || !currentCharacterId) {
			return false;
		}
		return (
			gameState.activeTurn.type === 'player' &&
                        gameState.activeTurn.entityId === currentCharacterId
		);
	}, [gameState?.activeTurn, currentCharacterId]);

	const currentTurnName = useMemo(() => {
		if (!gameState?.activeTurn) {
			return null;
		}
		if (gameState.activeTurn.type === 'player') {
			const character = gameState.characters.find(
				c => c.id === gameState.activeTurn?.entityId,
			);
			return character?.name || 'Player';
		}
		if (gameState.activeTurn.type === 'npc') {
			return 'NPC';
		}
		return 'DM';
	}, [gameState?.activeTurn, gameState?.characters]);

	const refreshSharedMap = useCallback(async () => {
		if (!inviteCode) {
			return;
		}

		try {
			const state = await multiplayerClient.getMapState(inviteCode);
			setSharedMap(state);
		} catch (error) {
			console.error('Failed to refresh shared map:', error);
		}
	}, [inviteCode]);

	const loadAvailableMaps = useCallback(async () => {
		try {
			const response = await multiplayerClient.getAllMaps();
			setAvailableMaps(response.maps || []);
		} catch (error) {
			console.error('Failed to load maps:', error);
		}
	}, []);

	const handleSwitchMap = useCallback(
		async (mapId: string) => {
			if (!inviteCode) return;

			setSwitchingMap(true);
			try {
				await multiplayerClient.switchMap(inviteCode, mapId);
				await refreshSharedMap();
				setShowMapSwitcher(false);
				Alert.alert('Success', 'Map switched successfully');
			} catch (error) {
				console.error('Failed to switch map:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to switch map');
			} finally {
				setSwitchingMap(false);
			}
		},
		[inviteCode, refreshSharedMap],
	);

	useEffect(() => {
		if (isHost && showMapSwitcher) {
			loadAvailableMaps();
		}
	}, [isHost, showMapSwitcher, loadAvailableMaps]);

	// Determine if this is the host
	useEffect(() => {
		if (hostId && gameState) {
			setIsHost(gameState.hostId === hostId);
		}
	}, [hostId, gameState?.hostId]);

	// Stable callback for game state updates
	const handleGameStateUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(true);
	}, []);

	// WebSocket connection - only connect when we have characterId
	const { isConnected: wsIsConnected, send: wsSend } = useWebSocket({
		inviteCode: inviteCode || '',
		playerId: playerId || '',
		characterId: characterId,
		onGameStateUpdate: handleGameStateUpdate,
		onPlayerAction: (message: PlayerActionMessage) => {
			// Handle player action updates
			console.log('Player action:', message);
		},
		autoConnect: !!inviteCode && !!playerId && !!characterId,
	});

	// Stable callback for polling updates
	const handlePollingUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(false);
	}, []);

	// Polling fallback when WebSocket is not connected OR when we need initial state
	const { gameState: polledState } = usePollingGameState({
		inviteCode: inviteCode || '',
		enabled: (!wsIsConnected && !!inviteCode) || !gameState, // Poll if WS not connected OR no gameState yet
		pollInterval: 3000,
		onGameStateUpdate: handlePollingUpdate,
	});

	// Update gameState from polling if we don't have it yet
	useEffect(() => {
		if (!gameState && polledState) {
			setGameState(polledState);
		}
	}, [gameState, polledState]);

	useEffect(() => {
		if (gameState?.mapState) {
			setSharedMap(gameState.mapState);
		}
	}, [gameState?.mapState]);

	// Track unread messages
	useEffect(() => {
		if (gameState?.messages) {
			// Count messages that are newer than when notifications were last opened
			// For now, just show total count if panel is closed
			if (!showNotifications && gameState.messages.length > 0) {
				setUnreadMessageCount(gameState.messages.length);
			} else {
				setUnreadMessageCount(0);
			}
		}
	}, [gameState?.messages, showNotifications]);

	useEffect(() => {
		if (!movementMode || !sharedMap || !playerToken || movementBudget <= 0 || !isPlayerTurn) {
			setMovementRange([]);
			setPathPreview(null);
			return;
		}

		const reachable = calculateMovementRange(sharedMap, { x: playerToken.x, y: playerToken.y }, movementBudget);
		setMovementRange(reachable);
	}, [sharedMap, playerToken, movementBudget, movementMode, isPlayerTurn]);

	// Load initial game state - only once
	const loadGameStateRef = useRef(false);
	useEffect(() => {
		if (inviteCode && !loadGameStateRef.current && !gameState) {
			loadGameStateRef.current = true;
			loadGameState();
		}
		refreshSharedMap().catch(() => undefined);
		const interval = setInterval(() => {
			refreshSharedMap().catch(() => undefined);
		}, 5000);
		return () => clearInterval(interval);
	}, [inviteCode, refreshSharedMap]);

	// Handle CMD+K / CTRL+K keyboard shortcut for command palette
	useEffect(() => {
		if (Platform.OS !== 'web') return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// CMD+K on Mac, CTRL+K on Windows/Linux
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setShowCommandPalette(prev => !prev);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const loadGameState = async () => {
		try {
			const session = await multiplayerClient.getGameSession(inviteCode);
			if (session.gameState) {
				setGameState(session.gameState);
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to load game state');
			console.error(error);
		}
	};

	const handleDMAction = useCallback(
		async (type: string, data: any) => {
			if (!inviteCode || !hostId || !gameState) return;

			try {
				await multiplayerClient.submitDMAction(inviteCode, {
					type: type as any,
					data,
					hostId,
				});

				// Refresh state
				if (!wsIsConnected) {
					setTimeout(loadGameState, 500);
				}
			} catch (error) {
				Alert.alert('Error', 'Failed to perform DM action');
				console.error(error);
			}
		},
		[inviteCode, hostId, gameState, wsIsConnected],
	);

	const handleAIRequest = useCallback(async (_prompt: string): Promise<string> => {
		if (!inviteCode || !hostId) {
			return 'AI assistance requires host privileges';
		}

		// TODO: Implement AI request - for now return placeholder
		// This should call the AI service to generate DM responses
		return 'AI assistance is not yet implemented. This will generate DM narration and suggestions based on your prompt.';
	}, [inviteCode, hostId]);

	// Build command palette commands
	const commandPaletteCommands = useMemo<Command[]>(() => {
		const commands: Command[] = [];

		if (isHost) {
			commands.push(
				{
					id: 'roll-initiative',
					label: 'Roll Initiative',
					description: 'Start encounter by rolling initiative for all characters and NPCs',
					keywords: ['initiative', 'roll', 'encounter', 'combat', 'start'],
					category: 'Encounter',
					action: () => {
						// TODO: Implement initiative rolling
						Alert.alert('Initiative', 'Initiative rolling will be implemented soon');
					},
				},
				{
					id: 'switch-map',
					label: 'Switch Map',
					description: 'Change to a different map',
					keywords: ['map', 'switch', 'change', 'load'],
					category: 'Map',
					action: () => {
						setShowMapSwitcher(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'stop-game',
					label: 'Stop Game',
					description: 'Stop the current game and return to lobby',
					keywords: ['stop', 'end', 'quit', 'lobby'],
					category: 'Game',
					action: async () => {
						if (inviteCode) {
							try {
								await multiplayerClient.stopGame(inviteCode);
								router.push(`/host-game/${inviteCode}`);
							} catch (error) {
								console.error('Failed to stop game:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop game');
							}
						}
					},
				},
			);
		}

		commands.push(
			{
				id: 'open-notifications',
				label: 'Open Activity Log',
				description: 'View game activity and messages',
				keywords: ['log', 'activity', 'messages', 'notifications'],
				category: 'View',
				action: () => {
					setShowNotifications(true);
					setShowCommandPalette(false);
				},
			},
		);

		return commands;
	}, [isHost, inviteCode]);

	const handleMovementTilePress = useCallback(
		(x: number, y: number) => {
			if (!movementMode || !sharedMap || !playerToken || !currentCharacterId || movementInFlight || !isPlayerTurn) {
				if (!isPlayerTurn) {
					Alert.alert('Not your turn', 'Wait for your turn to move.');
				}
				return;
			}

			const reachable = movementRange.find(tile => tile.x === x && tile.y === y);
			if (!reachable) {
				// Silent return if clicking outside range in movement mode, or just clear preview
				setPathPreview(null);
				return;
			}

			const pathResult = findPathWithCosts(sharedMap, { x: playerToken.x, y: playerToken.y }, { x, y });

			if (!pathResult || !pathResult.path.length) {
				Alert.alert('No path', 'Unable to find a valid path to that tile.');
				return;
			}

			if (pathResult.cost > movementBudget) {
				Alert.alert('Not enough movement', 'You need more movement points for that path.');
				return;
			}

			setPathPreview(pathResult);

			const performMove = async () => {
				try {
					setMovementInFlight(true);
					const validation = await multiplayerClient.validateMovement(inviteCode || '', {
						characterId: currentCharacterId,
						fromX: playerToken.x,
						fromY: playerToken.y,
						toX: x,
						toY: y,
					});

					if (!validation?.valid) {
						Alert.alert('Move blocked', 'That move is not allowed on the current terrain.');
						return;
					}

					await multiplayerClient.saveMapToken(inviteCode || '', {
						id: playerToken.id,
						tokenType: 'player',
						x,
						y,
						characterId: playerToken.entityId ?? currentCharacterId,
						label: playerToken.label,
						color: playerToken.color,
						metadata: { ...playerToken.metadata, path: validation.path },
					});
					await refreshSharedMap();
					setPathPreview(null);
					setMovementMode(false); // Exit movement mode after move
				} catch (error) {
					console.error('Failed to move player', error);
					Alert.alert('Movement failed', error instanceof Error ? error.message : 'Could not move token');
				} finally {
					setMovementInFlight(false);
				}
			};

			performMove();
		},
		[
			movementMode,
			sharedMap,
			playerToken,
			currentCharacterId,
			movementRange,
			movementBudget,
			movementInFlight,
			inviteCode,
			refreshSharedMap,
			isPlayerTurn,
		],
	);

	if (!gameState) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Loading...' }} />
				<ThemedText>Loading game...</ThemedText>
			</ThemedView>
		);
	}

	const renderMapSection = () => (
		<ScrollView
			style={styles.mapScrollContainer}
			contentContainerStyle={styles.mapScrollContent}
			showsVerticalScrollIndicator={true}
			showsHorizontalScrollIndicator={true}
		>
			<View style={styles.mapContainer}>
				<View style={styles.mapHeader}>
					<ThemedText type="subtitle">Shared Map</ThemedText>
					{currentCharacterId && (
						<TouchableOpacity
							style={[
								styles.movementButton,
								movementMode && styles.movementButtonActive,
								!isPlayerTurn && styles.movementButtonDisabled,
							]}
							onPress={() => {
								if (!isPlayerTurn) {
									Alert.alert('Not your turn', 'Wait for your turn to enable movement.');
									return;
								}
								setMovementMode(mode => !mode);
								setPathPreview(null);
							}}
							disabled={!isPlayerTurn}
						>
							<ThemedText style={styles.movementButtonText}>
								{movementMode ? 'Movement: On' : 'Movement: Off'}
							</ThemedText>
						</TouchableOpacity>
					)}
				</View>
				{!isPlayerTurn && currentTurnName && (
					<ThemedText style={styles.mapHint}>Waiting for your turn... (Current: {currentTurnName})</ThemedText>
				)}
				{movementMode && isPlayerTurn && (
					<ThemedText style={styles.mapHint}>Tap a highlighted tile to move (budget {movementBudget}).</ThemedText>
				)}
				{sharedMap ? (
					<InteractiveMap
						map={sharedMap}
						highlightTokenId={currentCharacterId || undefined}
						onTilePress={playerToken ? handleMovementTilePress : undefined}
						reachableTiles={movementRange}
						pathTiles={pathPreview?.path}
					/>
				) : (
					<ThemedText style={styles.mapHint}>Waiting for the DM to configure a map.</ThemedText>
				)}
			</View>
		</ScrollView>
	);


	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: gameState.quest.name,
					headerShown: true,
				}}
			/>
			<View style={styles.statusBar}>
				<ThemedText style={styles.statusText}>{wsConnected ? '🟢 Connected' : '🟡 Polling'}</ThemedText>
				<View style={styles.statusRight}>
					{currentTurnName && (
						<ThemedText style={styles.turnIndicator}>
							{isPlayerTurn ? '🟢 Your Turn' : `Turn: ${currentTurnName}`}
						</ThemedText>
					)}
					<TouchableOpacity
						style={styles.notificationButton}
						onPress={() => setShowNotifications(true)}
					>
						<ThemedText style={styles.notificationButtonText}>📋</ThemedText>
						{unreadMessageCount > 0 && (
							<View style={styles.notificationBadge}>
								<ThemedText style={styles.notificationBadgeText}>
									{unreadMessageCount > 99 ? '99+' : unreadMessageCount}
								</ThemedText>
							</View>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.commandButton}
						onPress={() => setShowCommandPalette(true)}
					>
						<ThemedText style={styles.commandButtonText}>
							{Platform.OS === 'web' ? '⌘K' : '⚡'}
						</ThemedText>
					</TouchableOpacity>
					{isHost && (
						<>
							<TouchableOpacity
								style={[styles.lobbyButton, styles.stopButton]}
								onPress={async () => {
									if (inviteCode) {
										try {
											await multiplayerClient.stopGame(inviteCode);
											router.push(`/host-game/${inviteCode}`);
										} catch (error) {
											console.error('Failed to stop game:', error);
											Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop game');
										}
									} else {
										router.push('/host-game');
									}
								}}
							>
								<ThemedText style={styles.lobbyButtonText}>End Enconter</ThemedText>
							</TouchableOpacity>
							<ThemedText style={styles.hostBadge}>Host</ThemedText>
						</>
					)}
				</View>
			</View>
			<View style={styles.content}>
				{isMobile ? (
					// Mobile: Stacked layout
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
					>
						<PlayerCharacterList
							characters={gameState.characters}
							currentPlayerId={currentCharacterId}
							npcTokens={sharedMap?.tokens?.filter(t => t.type === 'npc') || []}
							activeTurnEntityId={gameState?.activeTurn?.entityId}
						/>
						{renderMapSection()}
					</ScrollView>
				) : (
					// Tablet/Desktop: Side-by-side layout
					<View style={styles.desktopLayout}>
						<View style={styles.sidebar}>
							<PlayerCharacterList
								characters={gameState.characters}
								currentPlayerId={currentCharacterId}
								npcTokens={sharedMap?.tokens?.filter(t => t.type === 'npc') || []}
								activeTurnEntityId={gameState?.activeTurn?.entityId}
							/>
						</View>
						<View style={styles.mainContent}>
							{renderMapSection()}
							{isHost && (
								<View style={styles.mapSwitcherContainer}>
									<TouchableOpacity
										style={styles.mapSwitchButton}
										onPress={() => setShowMapSwitcher(!showMapSwitcher)}
									>
										<ThemedText style={styles.mapSwitchButtonText}>
											{showMapSwitcher ? 'Hide Map Switcher' : 'Switch Map'}
										</ThemedText>
									</TouchableOpacity>
									{showMapSwitcher && (
										<View style={styles.mapSwitcherPanel}>
											<ThemedText style={styles.mapSwitcherTitle}>Available Maps</ThemedText>
											{availableMaps.length === 0 ? (
												<ThemedText style={styles.mapSwitcherEmpty}>Loading maps...</ThemedText>
											) : (
												<ScrollView style={styles.mapSwitcherList}>
													{availableMaps.map(map => (
														<TouchableOpacity
															key={map.id}
															style={[
																styles.mapSwitcherItem,
																sharedMap?.id === map.id && styles.mapSwitcherItemActive,
															]}
															onPress={() => handleSwitchMap(map.id)}
															disabled={switchingMap || sharedMap?.id === map.id}
														>
															<ThemedText
																style={[
																	styles.mapSwitcherItemText,
																	sharedMap?.id === map.id && styles.mapSwitcherItemTextActive,
																]}
															>
																{map.name}
																{sharedMap?.id === map.id && ' (Current)'}
															</ThemedText>
														</TouchableOpacity>
													))}
												</ScrollView>
											)}
										</View>
									)}
								</View>
							)}
						</View>
					</View>
				)}
			</View>

			{/* Notifications Panel */}
			<NotificationsPanel
				messages={gameState?.messages || []}
				visible={showNotifications}
				onClose={() => setShowNotifications(false)}
				unreadCount={unreadMessageCount}
			/>

			{/* Command Palette */}
			<CommandPalette
				visible={showCommandPalette}
				onClose={() => setShowCommandPalette(false)}
				commands={commandPaletteCommands}
				onAIRequest={handleAIRequest}
			/>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	statusBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#E2D3B3',
		borderBottomWidth: 1,
		borderBottomColor: '#C9B037',
	},
	statusText: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	statusRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	turnIndicator: {
		fontSize: 12,
		fontWeight: '600',
		color: '#8B6914',
	},
	lobbyButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#8B6914',
		borderRadius: 6,
		marginRight: 8,
	},
	stopButton: {
		backgroundColor: '#B91C1C',
	},
	lobbyButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	hostBadge: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#8B6914',
		backgroundColor: '#F5E6D3',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	content: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 20,
	},
	desktopLayout: {
		flex: 1,
		flexDirection: 'row',
	},
	sidebar: {
		width: 300,
		borderRightWidth: 1,
		borderRightColor: '#C9B037',
	},
	mainContent: {
		flex: 1,
	},
	mapContainer: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
		backgroundColor: '#FFF9EF',
		gap: 8,
	},
	mapHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	movementButton: {
		backgroundColor: '#E6DDC6',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	movementButtonActive: {
		backgroundColor: '#C9B037',
	},
	movementButtonDisabled: {
		opacity: 0.5,
	},
	movementButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	mapHint: {
		color: '#6B5B3D',
	},
	mapScrollContainer: {
		flex: 1,
	},
	mapScrollContent: {
		flexGrow: 1,
		padding: 8,
	},
	movementToggle: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		backgroundColor: '#FFF',
	},
	movementToggleActive: {
		backgroundColor: '#E9D8A6',
	},
	movementToggleText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	notificationButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#8B6914',
		marginRight: 8,
		position: 'relative',
	},
	notificationButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	notificationBadge: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: '#B91C1C',
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: '#FFF9EF',
	},
	notificationBadgeText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '700',
	},
	commandButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#4A6741',
		marginRight: 8,
	},
	commandButtonText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
	},
	mapSwitcherContainer: {
		marginTop: 16,
		gap: 8,
	},
	mapSwitchButton: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	mapSwitchButtonText: {
		color: '#FFF9EF',
		fontSize: 14,
		fontWeight: '600',
	},
	mapSwitcherPanel: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 12,
		padding: 12,
		backgroundColor: '#FFF9EF',
		maxHeight: 300,
	},
	mapSwitcherTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
		marginBottom: 12,
	},
	mapSwitcherList: {
		maxHeight: 250,
	},
	mapSwitcherItem: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	mapSwitcherItemActive: {
		backgroundColor: '#E9D8A6',
		borderColor: '#C9B037',
	},
	mapSwitcherItemText: {
		fontSize: 14,
		color: '#3B2F1B',
	},
	mapSwitcherItemTextActive: {
		fontWeight: '700',
		color: '#8B6914',
	},
	mapSwitcherEmpty: {
		color: '#6B5B3D',
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 20,
	},
	logItem: {
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		padding: 10,
		gap: 6,
	},
	logContent: {
		color: '#3B2F1B',
	},
	logMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	logMeta: {
		fontSize: 11,
		color: '#6B5B3D',
	},
	dmPanel: {
		width: 350,
		borderLeftWidth: 1,
		borderLeftColor: '#C9B037',
		maxHeight: '100%',
	},
	mobileDMPanel: {
		maxHeight: 320,
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
});

export default MultiplayerGameScreen;
