import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DMControlsPanel } from '@/components/dm-controls-panel';
import { InteractiveMap } from '@/components/map/interactive-map';
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
import { calculateMovementRange, DEFAULT_TERRAIN_COSTS, findCheapestPath } from '@/utils/movement-calculator';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
        const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
        const [sharedMap, setSharedMap] = useState<MapState | null>(null);
        const [isHost, setIsHost] = useState(false);
        const [wsConnected, setWsConnected] = useState(false);
        const { isMobile } = useScreenSize();
        const insets = useSafeAreaInsets();
        const [movementMode, setMovementMode] = useState(false);
        const [reachableTiles, setReachableTiles] = useState<Set<string>>(new Set());
        const [reachableCosts, setReachableCosts] = useState<Map<string, number>>(new Map());
        const [pathPreview, setPathPreview] = useState<Array<{ x: number; y: number }>>([]);

	// Get character ID from gameState (memoized to prevent re-renders)
        const characterId = useMemo(() => {
                if (!gameState || !playerId) return '';
                const player = gameState.players.find(p => p.playerId === playerId);
                return player?.characterId || '';
        }, [gameState, playerId]);

        const playerToken = useMemo(
                () => sharedMap?.tokens?.find(token => token.entityId === characterId),
                [sharedMap?.tokens, characterId],
        );

        const playerCharacter = useMemo(
                () => gameState?.characters.find(character => character.id === characterId),
                [gameState?.characters, characterId],
        );

        const movementBudget = useMemo(() => {
                if (!playerCharacter) {
                        return 0;
                }

                return playerCharacter.actionPoints ?? playerCharacter.maxActionPoints ?? 6;
        }, [playerCharacter]);

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

        useEffect(() => {
                if (!movementMode || !sharedMap || !playerToken) {
                        setReachableTiles(new Set());
                        setReachableCosts(new Map());
                        setPathPreview([]);
                        return;
                }

                const { reachable } = calculateMovementRange(
                        sharedMap,
                        { x: playerToken.x, y: playerToken.y },
                        movementBudget,
                        DEFAULT_TERRAIN_COSTS,
                );

                setReachableTiles(new Set(reachable.keys()));
                setReachableCosts(reachable);
        }, [movementMode, sharedMap, playerToken, movementBudget]);

        useEffect(() => {
                if (!playerToken) {
                        setMovementMode(false);
                }
        }, [playerToken]);

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

        const handleDMAction = useCallback(async (type: string, data: any) => {
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
	}, [inviteCode, hostId, gameState, wsIsConnected]);

        const handleAIRequest = useCallback(async (prompt: string): Promise<string> => {
                // For now, return a placeholder. In production, this would call the Ollama API through the worker
                return 'AI assistance feature coming soon. This will integrate with Ollama for DM help.';
        }, []);

        const handleTilePress = useCallback(
                async (x: number, y: number) => {
                        if (!movementMode || !sharedMap || !playerToken || !inviteCode || !characterId) {
                                return;
                        }

                        const key = `${x},${y}`;
                        const reachableCost = reachableCosts.get(key);
                        if (reachableCost === undefined || !Number.isFinite(reachableCost)) {
                                setPathPreview([]);
                                return;
                        }

                        const path = findCheapestPath(
                                sharedMap,
                                { x: playerToken.x, y: playerToken.y },
                                { x, y },
                                DEFAULT_TERRAIN_COSTS,
                        );
                        setPathPreview(path.path);

                        const totalCost = path.cost;
                        if (!Number.isFinite(totalCost) || totalCost > movementBudget) {
                                Alert.alert('Out of range', 'That tile exceeds your movement allowance.');
                                return;
                        }

                        try {
                                let validatedCost = totalCost;
                                try {
                                        const validation = await multiplayerClient.validateMovement(
                                                inviteCode,
                                                characterId,
                                                playerToken.x,
                                                playerToken.y,
                                                x,
                                                y,
                                        );

                                        if (!validation.valid) {
                                                Alert.alert('Move blocked', 'That path is not valid right now.');
                                                return;
                                        }

                                        validatedCost = validation.cost;
                                } catch (error) {
                                        console.warn('Movement validation unavailable; using client calculation.', error);
                                }

                                if (validatedCost > movementBudget) {
                                        Alert.alert(
                                                'Out of range',
                                                'Server validation reported insufficient movement points.',
                                        );
                                        return;
                                }

                                await multiplayerClient.saveMapToken(inviteCode, {
                                        id: playerToken.id,
                                        tokenType: playerToken.type,
                                        label: playerToken.label,
                                        x,
                                        y,
                                        color: playerToken.color,
                                        metadata: playerToken.metadata,
                                });
                                await refreshSharedMap();
                                setMovementMode(false);
                                setPathPreview([]);
                        } catch (error) {
                                Alert.alert('Move failed', error instanceof Error ? error.message : 'Unable to move.');
                        }
                },
                [
                        movementMode,
                        sharedMap,
                        playerToken,
                        inviteCode,
                        characterId,
                        reachableCosts,
                        movementBudget,
                        refreshSharedMap,
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

        const currentCharacterId = gameState.players.find(p => p.playerId === playerId)?.characterId;

        const renderMapSection = () => (
                <View style={styles.mapContainer}>
                        <View style={styles.mapHeader}>
                                <ThemedText type="subtitle">Shared Map</ThemedText>
                                {currentCharacterId && (
                                        <TouchableOpacity
                                                style={[styles.movementButton, movementMode && styles.movementButtonActive]}
                                                onPress={() => {
                                                        setMovementMode(mode => !mode);
                                                        setPathPreview([]);
                                                }}
                                        >
                                                <ThemedText style={styles.movementButtonText}>
                                                        {movementMode ? 'Movement: On' : 'Movement: Off'}
                                                </ThemedText>
                                        </TouchableOpacity>
                                )}
                        </View>
                        {movementMode && (
                                <ThemedText style={styles.mapHint}>
                                        Tap a highlighted tile to move (budget {movementBudget}).
                                </ThemedText>
                        )}
                        {sharedMap ? (
                                <InteractiveMap
                                        map={sharedMap}
                                        highlightTokenId={currentCharacterId || undefined}
                                        reachableTiles={movementMode ? reachableTiles : undefined}
                                        pathPreview={movementMode ? pathPreview : undefined}
                                        onTilePress={movementMode ? handleTilePress : undefined}
                                />
                        ) : (
                                <ThemedText style={styles.mapHint}>
                                        Waiting for the DM to configure a map.
                                </ThemedText>
                        )}
                </View>
        );

	const renderActivityLog = () => (
		<View style={styles.logPanel}>
			<ThemedText type="subtitle">Activity Log</ThemedText>
			{gameState.messages.length === 0 ? (
				<ThemedText style={styles.mapHint}>No actions recorded yet.</ThemedText>
			) : (
				gameState.messages.slice(-25).map(message => (
					<View key={message.id} style={styles.logItem}>
						<ThemedText style={styles.logContent}>{message.content}</ThemedText>
						<View style={styles.logMetaRow}>
							{message.speaker && (
								<ThemedText style={styles.logMeta}>{message.speaker}</ThemedText>
							)}
							<ThemedText style={styles.logMeta}>
								{new Date(message.timestamp).toLocaleTimeString()}
							</ThemedText>
						</View>
					</View>
				))
			)}
		</View>
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
				<ThemedText style={styles.statusText}>
					{wsConnected ? '🟢 Connected' : '🟡 Polling'}
				</ThemedText>
				{isHost && (
					<ThemedText style={styles.hostBadge}>Host</ThemedText>
				)}
			</View>
			<View style={styles.content}>
				{isMobile ? (
					// Mobile: Stacked layout
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={[
							styles.scrollContent,
							{ paddingTop: insets.top },
						]}
					>
						<PlayerCharacterList
							characters={gameState.characters}
							currentPlayerId={currentCharacterId}
						/>
						{renderMapSection()}
						{renderActivityLog()}
					</ScrollView>
				) : (
					// Tablet/Desktop: Side-by-side layout
					<View style={styles.desktopLayout}>
						<View style={styles.sidebar}>
							<PlayerCharacterList
								characters={gameState.characters}
								currentPlayerId={currentCharacterId}
							/>
						</View>
						<View style={styles.mainContent}>
							{renderMapSection()}
							{renderActivityLog()}
							{isHost && (
								<View style={styles.dmPanel}>
									<DMControlsPanel
										gameState={gameState}
										onDMAction={handleDMAction}
										onAIRequest={handleAIRequest}
									/>
								</View>
							)}
						</View>
					</View>
				)}
				{isMobile && isHost && (
					<View style={styles.mobileDMPanel}>
						<DMControlsPanel
							gameState={gameState}
							onDMAction={handleDMAction}
							onAIRequest={handleAIRequest}
						/>
					</View>
				)}
			</View>
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
                alignItems: 'center',
                justifyContent: 'space-between',
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
        movementButtonText: {
                color: '#3B2F1B',
                fontWeight: '600',
        },
        mapHint: {
                color: '#6B5B3D',
        },
	logPanel: {
		borderWidth: 1,
		borderColor: '#D4BC8B',
		borderRadius: 12,
		padding: 12,
		backgroundColor: '#FFF4DF',
		gap: 8,
		marginBottom: 16,
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

