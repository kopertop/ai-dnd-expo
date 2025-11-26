import { useQueryApi } from 'expo-auth-template/frontend';
import { useEffect, useRef } from 'react';

import { GameSessionResponse } from '@/types/api/multiplayer-api';
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

	const query = useQueryApi<GameSessionResponse>(
		enabled && inviteCode ? `/games/${inviteCode}/state` : '',
		{
			enabled: enabled && !!inviteCode,
			refetchInterval: enabled && inviteCode ? pollInterval : false,
			onSuccess: (data) => {
				if (data.gameState) {
					onGameStateUpdateRef.current?.(data.gameState);
				}
			},
		},
	);

	return {
		gameState: query.data?.gameState || null,
		isLoading: query.isLoading,
		error: query.error?.message || null,
		refresh: query.refetch,
	};
}

