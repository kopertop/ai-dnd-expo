import { useQueryClient } from '@tanstack/react-query';
import { useMutationApi } from 'expo-auth-template/frontend';

import type { GameStateResponse, MultiplayerGameState } from '@/types/api/multiplayer-api';

/**
 * Start a turn
 */
export function useStartTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * End a turn
 */
export function useEndTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * Update turn state
 */
export function useUpdateTurnState(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MultiplayerGameState>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * Interrupt the current turn
 */
export function useInterruptTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		activeTurn: {
			type: string;
			entityId: string;
			turnNumber: number;
			startedAt: number;
		};
		pausedTurn?: {
			type: string;
			entityId: string;
			turnNumber: number;
			startedAt: number;
		};
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * Resume a paused turn
 */
export function useResumeTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		activeTurn: {
			type: string;
			entityId: string;
			turnNumber: number;
			startedAt: number;
		};
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * Skip to next turn (DM only)
 */
export function useNextTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all queries to ensure UI updates immediately
			queryClient.invalidateQueries();
		},
	});
}

/**
 * Roll dice with notation
 */
export function useRollDice(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		total: number;
		rolls: number[];
		modifier: number;
		breakdown: string;
		purpose?: string;
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game state to reflect dice roll in activity log
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/log`] });
		},
	});
}

