import { useQueryClient } from '@tanstack/react-query';
import { useMutationApi } from 'expo-auth-template/frontend';

import { websocketClient } from '@/services/api/websocket-client';
import type { GameStateResponse } from '@/types/api/multiplayer-api';
import type { MultiplayerGameState } from '@/types/multiplayer-game';

/**
 * Start a turn
 */
export function useStartTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate just the active game's state/map data
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			// Invalidate just the active game's state/map data
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Interrupt the current turn
 */
export function useInterruptTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		activeTurn: NonNullable<MultiplayerGameState['activeTurn']>;
		pausedTurn?: MultiplayerGameState['pausedTurn'];
	}>({
		method: 'POST',
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Resume a paused turn
 */
export function useResumeTurn(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		activeTurn: NonNullable<MultiplayerGameState['activeTurn']>;
	}>({
		method: 'POST',
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			websocketClient.sendRefresh();
		},
	});
}
