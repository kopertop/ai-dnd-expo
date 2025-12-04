import { type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { useMutationApi, useQueryApi } from 'expo-auth-template/frontend';

import { websocketClient } from '@/services/api/websocket-client';

import type {
	ActivityLogListResponse,
	GameSessionResponse,
	GameStateResponse,
	MyGamesResponse,
} from '@/types/api/multiplayer-api';
import { Quest } from '@/types/quest';

/**
 * Get game session by invite code
 */
export function useGameSession(
	inviteCode: string | null | undefined,
	options?: { refetchInterval?: UseQueryOptions<GameSessionResponse>['refetchInterval'] },
) {
	// Don't make API call if inviteCode is falsy - pass empty string and disable query
	return useQueryApi<GameSessionResponse>(
		inviteCode ? `/games/${inviteCode}` : '',
		{
			enabled: !!inviteCode, // Only enable when we have an invite code
			refetchInterval: options?.refetchInterval,
		},
	);
}

/**
 * Get current user's games (hosted and joined)
 */
export function useMyGames() {
	return useQueryApi<MyGamesResponse>('/games/me');
}

/**
 * Get all available quests
 */
export function useQuests() {
	return useQueryApi<{ quests: Quest[] }>('/quests');
}

/**
 * Get activity logs for a game
 */
export function useActivityLogs(
	inviteCode: string | null | undefined,
	limit: number = 100,
	offset: number = 0,
) {
	return useQueryApi<ActivityLogListResponse>(
		inviteCode ? `/games/${inviteCode}/log?limit=${limit}&offset=${offset}` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Get current turn state
 */
export function useCurrentTurn(inviteCode: string | null | undefined) {
	return useQueryApi<{
		activeTurn: {
			type: string;
			entityId: string;
			turnNumber: number;
			startedAt: number;
		} | null;
	}>(
		inviteCode ? `/games/${inviteCode}/turn` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Create a new game
 */
export function useCreateGame() {
	const queryClient = useQueryClient();

	return useMutationApi<GameSessionResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate my games list
			queryClient.invalidateQueries({ queryKey: ['/games/me'] });
		},
	});
}

/**
 * Join a game
 */
export function useJoinGame() {
	const queryClient = useQueryClient();

	return useMutationApi<GameSessionResponse>({
		method: 'POST',
		onSuccess: (data) => {
			// Invalidate game session and my games
			if (data.inviteCode) {
				queryClient.invalidateQueries({ queryKey: [`/games/${data.inviteCode}`] });
			}
			queryClient.invalidateQueries({ queryKey: ['/games/me'] });
		},
	});
}

/**
 * Start a game
 */
export function useStartGame(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game session and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Delete a game
 */
export function useDeleteGame() {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'DELETE',
		onSuccess: () => {
			// Invalidate my games list
			queryClient.invalidateQueries({ queryKey: ['/games/me'] });
		},
	});
}

/**
 * Stop a game (return to waiting status)
 */
export function useStopGame(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'PATCH',
		onSuccess: () => {
			// Invalidate game session and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Submit a player action
 */
export function useSubmitPlayerAction(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Submit a DM action
 */
export function useSubmitDMAction(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game state and characters to ensure UI refreshes
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Roll initiative for all characters and NPCs
 */
export function useRollInitiative(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<GameStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game state and turn
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/turn`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Create an activity log entry
 */
export function useCreateActivityLog(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{ id: string; success: boolean }>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate activity logs
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/log`] });
		},
	});
}

/**
 * Clear activity logs
 */
export function useClearActivityLogs(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'DELETE',
		onSuccess: () => {
			// Invalidate activity logs
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/log`] });
		},
	});
}
