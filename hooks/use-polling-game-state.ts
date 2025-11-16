import { useEffect, useRef, useState, useCallback } from 'react';

import { multiplayerClient } from '@/services/api/multiplayer-client';
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

	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lastStateRef = useRef<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Store callback in ref to prevent re-creating poll function
	const onGameStateUpdateRef = useRef(onGameStateUpdate);
	useEffect(() => {
		onGameStateUpdateRef.current = onGameStateUpdate;
	}, [onGameStateUpdate]);

	const poll = useCallback(async () => {
		if (!enabled || !inviteCode) return;

		try {
			setIsLoading(true);
			setError(null);

			const response: GameSessionResponse = await multiplayerClient.pollGameState(inviteCode);

			if (response.gameState) {
				const stateString = JSON.stringify(response.gameState);
				// Only update if state actually changed
				if (stateString !== lastStateRef.current) {
					lastStateRef.current = stateString;
					setGameState(response.gameState);
					onGameStateUpdateRef.current?.(response.gameState);
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to poll game state';
			setError(errorMessage);
			console.error('Polling error:', err);
		} finally {
			setIsLoading(false);
		}
	}, [enabled, inviteCode]);

	// Start polling when enabled
	useEffect(() => {
		if (enabled && inviteCode) {
			// Poll immediately
			poll();

			// Then poll at interval
			intervalRef.current = setInterval(poll, pollInterval);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [enabled, inviteCode, pollInterval, poll]);

	return {
		gameState,
		isLoading,
		error,
		refresh: poll,
	};
}

