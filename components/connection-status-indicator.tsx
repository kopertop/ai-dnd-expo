import { useAuth, useQueryApi } from 'expo-auth-template/frontend';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RefreshButton } from '@/components/refresh-button';
import { ThemedText } from '@/components/themed-text';
import { usePollingGameState } from '@/hooks/use-polling-game-state';
import { useWebSocket } from '@/hooks/use-websocket';
import { MultiplayerGameState } from '@/types/multiplayer-game';

interface ConnectionStatusIndicatorProps {
	inviteCode?: string;
	onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
	inviteCode: propInviteCode,
	onGameStateUpdate,
}) => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const inviteCode = propInviteCode || params.inviteCode || '';
	const { playerId: paramPlayerId } = params;
	const { user } = useAuth();
	const playerId = user?.id ?? paramPlayerId ?? null;

	// Track API health status
	const [isApiHealthy, setIsApiHealthy] = useState<boolean>(true);
	const [apiHealthError, setApiHealthError] = useState<string | null>(null);

	// Check API health periodically
	const { data: healthData, error: healthError, isFetching: isHealthChecking } = useQueryApi<{ status: string; timestamp?: string }>(
		inviteCode ? '/health' : '', // Only check health if we have an invite code
		{
			enabled: !!inviteCode,
			refetchInterval: 30000, // Check every 30 seconds
			retry: 1,
			retryDelay: 1000,
		},
	);

	// Update API health state
	useEffect(() => {
		if (healthError) {
			setIsApiHealthy(false);
			setApiHealthError(healthError.message || 'API unreachable');
		} else if (healthData?.status === 'ok' || healthData?.status === 'healthy') {
			setIsApiHealthy(true);
			setApiHealthError(null);
		}
	}, [healthData, healthError]);

	// Get character ID from game state (needed for WebSocket)
	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const characterId = useMemo(() => {
		if (!gameState || !playerId) return null;
		return gameState.players.find(p => p.playerId === playerId)?.characterId || null;
	}, [gameState, playerId]);

	// Stable callback for game state updates
	const handleGameStateUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(true);
		onGameStateUpdate?.(newState);
	}, [onGameStateUpdate]);

	// WebSocket connection state
	const [wsConnected, setWsConnected] = useState(false);
	const { isConnected: wsIsConnected } = useWebSocket({
		inviteCode: inviteCode || '',
		playerId: playerId || '',
		characterId: characterId || '',
		onGameStateUpdate: handleGameStateUpdate,
		onPlayerAction: () => {
			// Handle player action updates if needed
		},
		// TODO: Enable autoConnect when we implement the backend WebSocket connection
		autoConnect: false,
		// autoConnect: !!inviteCode && !!playerId && !!characterId,
	});

	// Update WebSocket connection state
	useEffect(() => {
		setWsConnected(wsIsConnected);
	}, [wsIsConnected]);

	// Stable callback for polling updates
	const handlePollingUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(false);
		onGameStateUpdate?.(newState);
	}, [onGameStateUpdate]);

	// Polling fallback when WebSocket is not connected OR when we need initial state
	const { refresh: refreshGameState, isFetching: isPollingFetching, error: pollingError } = usePollingGameState({
		inviteCode: inviteCode || '',
		enabled: (!wsIsConnected && !!inviteCode) || !gameState, // Poll if WS not connected OR no gameState yet
		pollInterval: 15000,
		onGameStateUpdate: handlePollingUpdate,
	});

	// Determine connection status
	const connectionStatus = useMemo(() => {
		// Check if API is unreachable
		if (!isApiHealthy || apiHealthError) {
			return { status: 'offline', text: '🔴 Offline', color: '#000000' };
		}

		// Check if polling failed
		if (pollingError && !wsIsConnected) {
			return { status: 'error', text: '🔴 Connection Error', color: '#000000' };
		}

		// Check if currently fetching/loading
		if (isPollingFetching || isHealthChecking) {
			return { status: 'loading', text: '🟡 Loading', color: '#000000' };
		}

		// Check WebSocket connection
		if (wsConnected || wsIsConnected) {
			return { status: 'connected', text: '🟢 Connected', color: '#000000' };
		}

		// Default to polling
		return { status: 'polling', text: '🟡 Polling', color: '#000000' };
	}, [isApiHealthy, apiHealthError, pollingError, wsIsConnected, wsConnected, isPollingFetching, isHealthChecking]);

	const handleRefresh = useCallback(() => {
		if (!isPollingFetching && !isHealthChecking) {
			refreshGameState();
		}
	}, [refreshGameState, isPollingFetching, isHealthChecking]);

	return (
		<View style={styles.statusLeft}>
			<RefreshButton
				disabled={isPollingFetching || isHealthChecking}
				onPress={handleRefresh}
				variant="small"
			/>
			<ThemedText style={[styles.statusText, { color: connectionStatus.color }]}>
				{connectionStatus.text}
			</ThemedText>
		</View>
	);
};

const styles = StyleSheet.create({
	statusLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusText: {
		fontSize: 12,
		color: '#6B5B3D',
	},
});

