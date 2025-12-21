import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { WebSocketMessage } from '@/types/api/websocket-messages';
import type { MultiplayerGameState } from '@/types/multiplayer-game';

export interface UseWebSocketBrowserOptions {
	inviteCode: string;
	playerId: string;
	characterId: string;
	playerEmail?: string;
	onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
	onPlayerJoined?: (message: any) => void;
	onPlayerLeft?: (message: any) => void;
	onPlayerAction?: (message: any) => void;
	onDMMessage?: (message: any) => void;
	onError?: (message: any) => void;
	autoConnect?: boolean;
}

export function useWebSocketBrowser(options: UseWebSocketBrowserOptions) {
	const {
		inviteCode,
		playerId,
		characterId,
		playerEmail,
		onGameStateUpdate,
		onPlayerJoined,
		onPlayerLeft,
		onPlayerAction,
		onDMMessage,
		onError,
		autoConnect = true,
	} = options;

	const [isConnected, setIsConnected] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const wsRef = useRef<WebSocket | null>(null);
	const handlersRef = useRef<{
		onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
		onPlayerJoined?: (message: any) => void;
		onPlayerLeft?: (message: any) => void;
		onPlayerAction?: (message: any) => void;
		onDMMessage?: (message: any) => void;
		onError?: (message: any) => void;
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
	}, [onGameStateUpdate, onPlayerJoined, onPlayerLeft, onPlayerAction, onDMMessage, onError]);

	// Construct WebSocket URL
	const getWebSocketUrl = useCallback(() => {
		if (typeof window === 'undefined') return null;

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const host = window.location.host;
		const token = `${playerId}:${playerEmail || 'unknown'}`;
		return `${protocol}//${host}/party/game-room/${inviteCode}?token=${encodeURIComponent(token)}`;
	}, [inviteCode, playerId, playerEmail]);

	// Message handler
	const handleMessage = useCallback((message: WebSocketMessage | { type: 'state'; state: MultiplayerGameState }) => {
		switch (message.type) {
			case 'game_state_update':
				handlersRef.current.onGameStateUpdate?.(message.data.gameState);
				if (inviteCode) {
					queryClient.setQueryData<MultiplayerGameState | undefined>(
						['games', inviteCode, 'state'],
						message.data.gameState,
					);
				}
				break;
			case 'state': {
				const nextState = (message as { state: MultiplayerGameState }).state;
				if (inviteCode) {
					queryClient.setQueryData<MultiplayerGameState | undefined>(
						['games', inviteCode, 'state'],
						nextState,
					);
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
					queryClient.invalidateQueries({ queryKey: ['games', inviteCode, 'state'] });
				}
				break;
			case 'pong':
				break;
		}
	}, [inviteCode, queryClient]);

	// Connect
	const connect = useCallback(async () => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		const url = getWebSocketUrl();
		if (!url) {
			setConnectionError('WebSocket not available in this environment');
			return;
		}

		try {
			setConnectionError(null);
			const ws = new WebSocket(url);

			ws.onopen = () => {
				wsRef.current = ws;
				setIsConnected(true);
				console.log('WebSocket connected');
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data as string);
					handleMessage(message);
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error);
				}
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				setConnectionError('WebSocket connection error');
				setIsConnected(false);
			};

			ws.onclose = () => {
				wsRef.current = null;
				setIsConnected(false);
				console.log('WebSocket disconnected');
			};
		} catch (error) {
			console.error('WebSocket connection error:', error);
			setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
			setIsConnected(false);
		}
	}, [getWebSocketUrl, handleMessage]);

	// Disconnect
	const disconnect = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setIsConnected(false);
		setConnectionError(null);
	}, []);

	// Send message
	const send = useCallback((message: any) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.warn('WebSocket is not connected');
		}
	}, []);

	// Auto-connect on mount
	useEffect(() => {
		if (autoConnect && inviteCode && playerId) {
			// CharacterId is optional (hosts don't need it)
			connect();
		}

		return () => {
			disconnect();
		};
	}, [autoConnect, inviteCode, playerId, connect, disconnect]);

	return {
		isConnected,
		connectionError,
		connect,
		disconnect,
		send,
	};
}
