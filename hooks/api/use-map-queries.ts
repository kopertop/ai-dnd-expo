import { useQueryClient } from '@tanstack/react-query';
import { useMutationApi, useQueryApi } from 'expo-auth-template/frontend';

import type {
	MapStateResponse,
	MapTokenListResponse,
	MapTokenMutationResponse,
	MovementValidationResponse,
	NpcDefinitionListResponse,
	NpcInstanceListResponse,
} from '@/types/api/multiplayer-api';
import type { NpcDefinition } from '@/types/multiplayer-map';

/**
 * Get map state for a game
 */
export function useMapState(inviteCode: string | null | undefined) {
	return useQueryApi<MapStateResponse>(
		inviteCode ? `/games/${inviteCode}/map` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * List map tokens
 */
export function useMapTokens(inviteCode: string | null | undefined) {
	return useQueryApi<MapTokenListResponse>(
		inviteCode ? `/games/${inviteCode}/map/tokens` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Get all available maps
 */
export function useAllMaps() {
	return useQueryApi<{
		maps: Array<{
			id: string;
			slug: string;
			name: string;
			description: string | null;
			width: number;
			height: number;
		}>;
	}>('/maps');
}

/**
 * Update map state
 */
export function useUpdateMapState(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapStateResponse>({
		method: 'PATCH',
		onSuccess: () => {
			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
		},
	});
}

/**
 * Generate a new map
 */
export function useGenerateMap(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
		},
	});
}

/**
 * Mutate terrain
 */
export function useMutateTerrain(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapStateResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate map state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
		},
	});
}

/**
 * Place a player token
 */
export function usePlacePlayerToken(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapTokenMutationResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
		},
	});
}

/**
 * Save/update a map token
 */
export function useSaveMapToken(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapTokenMutationResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate map tokens and map state
			queryClient.invalidateQueries();
			// Immediately refetch game state to get updated movementUsed
			queryClient.refetchQueries();
		},
	});
}

/**
 * Delete a map token
 */
export function useDeleteMapToken(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'DELETE',
		onSuccess: () => {
			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			// Also invalidate game state and NPC instances to ensure UI refreshes
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/npc-instances`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
		},
	});
}

/**
 * Place a map element (fire, water, chest, etc.)
 */
export function usePlaceMapElement(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapTokenMutationResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
		},
	});
}

/**
 * Switch to a different map for a game
 */
export function useSwitchMap(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapStateResponse>({
		method: 'PATCH',
		onSuccess: () => {
			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
		},
	});
}

/**
 * Clone a map
 */
export function useCloneMap() {
	const queryClient = useQueryClient();

	return useMutationApi<{
		map: {
			id: string;
			slug: string;
			name: string;
			description: string | null;
			width: number;
			height: number;
		};
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate all maps list
			queryClient.invalidateQueries({ queryKey: ['/maps'] });
		},
	});
}

/**
 * Validate movement
 */
export function useValidateMovement(inviteCode: string) {
	return useMutationApi<MovementValidationResponse>({
		method: 'POST',
	});
}

/**
 * Get NPC definitions for a game
 */
export function useNpcDefinitions(inviteCode: string | null | undefined) {
	return useQueryApi<NpcDefinitionListResponse>(
		inviteCode ? `/games/${inviteCode}/npcs` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Get a single NPC definition
 */
export function useNpcDefinition(
	inviteCode: string | null | undefined,
	npcId: string | null | undefined,
) {
	return useQueryApi<NpcDefinition>(
		inviteCode && npcId ? `/games/${inviteCode}/npcs/${npcId}` : '',
		{
			enabled: !!inviteCode && !!npcId,
		},
	);
}

/**
 * Get NPC instances for a game
 */
export function useNpcInstances(inviteCode: string | null | undefined) {
	return useQueryApi<NpcInstanceListResponse>(
		inviteCode ? `/games/${inviteCode}/npc-instances` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Place an NPC
 */
export function usePlaceNpc(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapTokenMutationResponse>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate NPC instances, tokens, map state, and character queries so NPCs show up immediately
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/npc-instances`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Update an NPC instance
 */
export function useUpdateNpcInstance(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'PATCH',
		onSuccess: () => {
			queryClient.invalidateQueries();
			queryClient.refetchQueries();
		},
	});
}

