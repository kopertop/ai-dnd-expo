import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
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
import { calculateReachableTiles, findPathWithCost } from '@/utils/movement-calculator';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
        const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
        const [sharedMap, setSharedMap] = useState<MapState | null>(null);
        const [isHost, setIsHost] = useState(false);
        const [wsConnected, setWsConnected] = useState(false);
        const { isMobile } = useScreenSize();
        const insets = useSafeAreaInsets();
        const [movementRange, setMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
        const [pathPreview, setPathPreview] = useState<Array<{ x: number; y: number }>>([]);
        const movementBudget = 6;

	// Get character ID from gameState (memoized to prevent re-renders)
        const characterId = useMemo(() => {
                if (!gameState || !playerId) return '';
                const player = gameState.players.find(p => p.playerId === playerId);
                return player?.characterId || '';
        }, [gameState, playerId]);

        const playerToken = useMemo(() => {
                if (!sharedMap?.tokens || !characterId) {
                        return null;
                }

                return sharedMap.tokens.find(token => token.entityId === characterId || token.id === characterId) ?? null;
        }, [characterId, sharedMap?.tokens]);

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
                if (!sharedMap || !playerToken) {
                        setMovementRange([]);
                        setPathPreview([]);
                        return;
                }

                const reachable = calculateReachableTiles(
                        sharedMap,
                        { x: playerToken.x, y: playerToken.y },
                        movementBudget,
                );
                setMovementRange(Array.from(reachable.values()));
                setPathPreview([]);
        }, [movementBudget, playerToken, playerToken?.x, playerToken?.y, sharedMap]);

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

        const handleTileSelection = useCallback(
                async (x: number, y: number) => {
                        if (!inviteCode || !sharedMap || !playerToken) {
                                return;
                        }

                        setPathPreview([]);

                        const pathResult = findPathWithCost(
                                sharedMap,
                                { x: playerToken.x, y: playerToken.y },
                                { x, y },
                                movementBudget,
                        );

                        if (!pathResult) {
                                Alert.alert('Invalid Move', 'Destination is out of range or blocked.');
                                return;
                        }

                        setPathPreview(pathResult.path);

                        try {
                                await multiplayerClient.saveMapToken(inviteCode, {
                                        id: playerToken.id,
                                        mapId: sharedMap.id,
                                        tokenType: playerToken.type,
                                        label: playerToken.label,
                                        x,
                                        y,
                                        color: playerToken.color,
                                        metadata: playerToken.metadata,
                                        characterId: playerToken.entityId ?? undefined,
                                        npcId: playerToken.type === 'npc' ? playerToken.entityId : undefined,
                                });
                                await refreshSharedMap();
                        } catch (error) {
                                Alert.alert(
                                        'Move Failed',
                                        error instanceof Error ? error.message : 'Unable to move token',
                                );
                        }
                },
                [inviteCode, movementBudget, playerToken, refreshSharedMap, sharedMap],
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
                        <ThemedText type="subtitle">Shared Map</ThemedText>
                        {sharedMap ? (
                                <InteractiveMap
                                        map={sharedMap}
                                        highlightTokenId={currentCharacterId || undefined}
                                        onTilePress={handleTileSelection}
                                        movementRange={movementRange}
                                        movementPath={pathPreview}
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

