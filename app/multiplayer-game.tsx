import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DMControlsPanel } from '@/components/dm-controls-panel';
import { MultiplayerChat } from '@/components/multiplayer-chat';
import { PlayerCharacterList } from '@/components/player-character-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePollingGameState } from '@/hooks/use-polling-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useWebSocket } from '@/hooks/use-websocket';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { PlayerActionMessage } from '@/types/api/websocket-messages';
import { MultiplayerGameState } from '@/types/multiplayer-game';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const [isHost, setIsHost] = useState(false);
	const [wsConnected, setWsConnected] = useState(false);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Get character ID from gameState (memoized to prevent re-renders)
	const characterId = useMemo(() => {
		if (!gameState || !playerId) return '';
		const player = gameState.players.find(p => p.playerId === playerId);
		return player?.characterId || '';
	}, [gameState, playerId]);

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

	// Load initial game state - only once
	const loadGameStateRef = useRef(false);
	useEffect(() => {
		if (inviteCode && !loadGameStateRef.current && !gameState) {
			loadGameStateRef.current = true;
			loadGameState();
		}
	}, [inviteCode]);

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

	const handleSendMessage = useCallback(async (message: string) => {
		if (!inviteCode || !playerId || !gameState) return;

		try {
			// Find player's character ID
			const player = gameState.players.find(p => p.playerId === playerId);
			if (!player) {
				Alert.alert('Error', 'Player not found in game');
				return;
			}

			// Submit action
			await multiplayerClient.submitPlayerAction(inviteCode, {
				action: message,
				characterId: player.characterId,
				playerId,
			});

			// If WebSocket is connected, it will update via WebSocket
			// Otherwise, polling will pick it up
			if (!wsIsConnected) {
				// Refresh state after a short delay
				setTimeout(loadGameState, 500);
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to send message');
			console.error(error);
		}
	}, [inviteCode, playerId, gameState, wsIsConnected]);

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

	if (!gameState) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Loading...' }} />
				<ThemedText>Loading game...</ThemedText>
			</ThemedView>
		);
	}

	const currentCharacterId = gameState.players.find(p => p.playerId === playerId)?.characterId;

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
						<MultiplayerChat
							messages={gameState.messages}
							onSendMessage={handleSendMessage}
							currentPlayerId={currentCharacterId}
						/>
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
							<MultiplayerChat
								messages={gameState.messages}
								onSendMessage={handleSendMessage}
								currentPlayerId={currentCharacterId}
							/>
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
	dmPanel: {
		width: 350,
		borderLeftWidth: 1,
		borderLeftColor: '#C9B037',
		maxHeight: '100%',
	},
	mobileDMPanel: {
		maxHeight: 300,
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
});

export default MultiplayerGameScreen;

