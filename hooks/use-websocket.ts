import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { websocketClient } from '@/services/api/websocket-client';
import {
	WebSocketMessage,
	PlayerJoinedMessage,
	PlayerLeftMessage,
	PlayerActionMessage,
	DMMessage,
	ErrorMessage,
} from '@/types/api/websocket-messages';
import { MultiplayerGameState } from '@/types/multiplayer-game';

export interface UseWebSocketOptions {
	inviteCode: string;
	playerId: string;
	characterId: string;
	onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
	onPlayerJoined?: (message: PlayerJoinedMessage) => void;
	onPlayerLeft?: (message: PlayerLeftMessage) => void;
	onPlayerAction?: (message: PlayerActionMessage) => void;
	onDMMessage?: (message: DMMessage) => void;
	onError?: (message: ErrorMessage) => void;
	autoConnect?: boolean;
	requireCharacterId?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
	const {
		inviteCode,
		playerId,
		characterId,
		onGameStateUpdate,
		onPlayerJoined,
		onPlayerLeft,
		onPlayerAction,
		onDMMessage,
		onError,
		autoConnect = true,
		requireCharacterId = true,
	} = options;

	const [isConnected, setIsConnected] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const handlersRef = useRef<{
		onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
		onPlayerJoined?: (message: PlayerJoinedMessage) => void;
		onPlayerLeft?: (message: PlayerLeftMessage) => void;
		onPlayerAction?: (message: PlayerActionMessage) => void;
		onDMMessage?: (message: DMMessage) => void;
		onError?: (message: ErrorMessage) => void;
			}>({});

	// Update handlers ref when callbacks change
	useEffect(() => {
		handlersRef.current = {
			onGameStateUpdate,
			onPlayerJoined,
			onPlayerLeft,
			onPlayerAction,
			onDMMessage,
			onError,
		};
	}, [
		onGameStateUpdate,
		onPlayerJoined,
		onPlayerLeft,
		onPlayerAction,
		onDMMessage,
		onError,
	]);

	// Message handler
	const handleMessage = useCallback((message: WebSocketMessage | { type: 'state'; state: MultiplayerGameState }) => {
		switch (message.type) {
			case 'game_state_update':
				handlersRef.current.onGameStateUpdate?.(message.data.gameState);
				if (inviteCode) {
					queryClient.setQueryData<MultiplayerGameState | undefined>(
						[`/games/${inviteCode}/state`],
						message.data.gameState,
					);
					if (message.data.gameState.mapState) {
						queryClient.setQueryData(
							[`/games/${inviteCode}/map`],
							message.data.gameState.mapState,
						);
					}
				}
				break;
			case 'state': {
				const nextState = (message as { state: MultiplayerGameState }).state;
				if (inviteCode) {
					queryClient.setQueryData<MultiplayerGameState | undefined>(
						[`/games/${inviteCode}/state`],
						nextState,
					);
					if (nextState?.mapState) {
						queryClient.setQueryData(
							[`/games/${inviteCode}/map`],
							nextState.mapState,
						);
					}
				}
				handlersRef.current.onGameStateUpdate?.(nextState);
				break;
			}
			case 'player_joined':
				handlersRef.current.onPlayerJoined?.(message);
				break;
			case 'player_left':
				handlersRef.current.onPlayerLeft?.(message);
				break;
			case 'player_action':
				handlersRef.current.onPlayerAction?.(message);
				break;
			case 'dm_message':
				handlersRef.current.onDMMessage?.(message);
				break;
			case 'error':
				handlersRef.current.onError?.(message);
				setConnectionError(message.data.error);
				break;
			case 'ping':
				if (inviteCode) {
					queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
					queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
				}
				break;
			case 'pong':
				break;
		}
	}, [inviteCode, queryClient]);

	// Connect
	const connect = useCallback(async () => {
		try {
			setConnectionError(null);
			await websocketClient.connect(inviteCode, playerId, characterId);
			setIsConnected(true);

			// Register message handler
			websocketClient.onMessage(handleMessage);
		} catch (error) {
			console.error('WebSocket connection error:', error);
			setConnectionError(
				error instanceof Error ? error.message : 'Failed to connect',
			);
			setIsConnected(false);
		}
	}, [inviteCode, playerId, characterId, handleMessage]);

	// Disconnect
	const disconnect = useCallback(() => {
		websocketClient.disconnect();
		setIsConnected(false);
		setConnectionError(null);
	}, []);

	// Auto-connect on mount - use ref to prevent re-connection loops
	const hasConnectedRef = useRef(false);
	useEffect(() => {
		const hasIdentity = requireCharacterId ? Boolean(playerId && characterId) : Boolean(playerId);
		if (autoConnect && inviteCode && hasIdentity && !hasConnectedRef.current) {
			hasConnectedRef.current = true;
			connect();
		}

		return () => {
			if (hasConnectedRef.current) {
				hasConnectedRef.current = false;
				disconnect();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoConnect, inviteCode, playerId, characterId, requireCharacterId]);

	// Check connection status periodically - removed isConnected from deps to prevent loop
	useEffect(() => {
		const interval = setInterval(() => {
			const connected = websocketClient.isConnected();
			setIsConnected(prev => {
				if (prev !== connected) {
					return connected;
				}
				return prev;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return {
		isConnected,
		connectionError,
		connect,
		disconnect,
		send: websocketClient.send.bind(websocketClient),
	};
}
