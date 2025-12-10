import { useQueryApi } from 'expo-auth-template/frontend';
import { useEffect, useRef } from 'react';

import { GameStateResponse } from '@/types/api/multiplayer-api';
import { MultiplayerGameState } from '@/types/multiplayer-game';

export interface UsePollingGameStateOptions {
	inviteCode: string;
	enabled: boolean;
	pollInterval?: number; // milliseconds
	onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
}

export function usePollingGameState(options: UsePollingGameStateOptions) {
	const {
		inviteCode,
		enabled,
		pollInterval = 3000, // Default 3 seconds
		onGameStateUpdate,
	} = options;

	// Store callback in ref to prevent re-creating onSuccess function
	const onGameStateUpdateRef = useRef(onGameStateUpdate);
	useEffect(() => {
		onGameStateUpdateRef.current = onGameStateUpdate;
	}, [onGameStateUpdate]);

	// The /state endpoint returns MultiplayerGameState directly (GameStateResponse)
	const query = useQueryApi<GameStateResponse>(
		enabled && inviteCode ? `/games/${inviteCode}/state` : '/games/null/state',
		{
			enabled: enabled && !!inviteCode,
			refetchInterval: enabled && inviteCode ? pollInterval : false,
		},
	);

	// Call onGameStateUpdate when data changes
	useEffect(() => {
		if (query.data) {
			// data IS the game state (GameStateResponse = MultiplayerGameState)
			onGameStateUpdateRef.current?.(query.data);
		}
	}, [query.data]);

	return {
		gameState: query.data || null,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		error: query.error?.message || null,
		refresh: query.refetch,
	};
}
