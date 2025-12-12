import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, useMutationApi, useQueryApi } from 'expo-auth-template/frontend';

import { websocketClient } from '@/services/api/websocket-client';
import type {
	MapMoveResponse,
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
		inviteCode ? `/games/${inviteCode}/map` : '/games/null/map',
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
		inviteCode ? `/games/${inviteCode}/map/tokens` : '/games/null/map/tokens',
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
			world?: string | null;
			metadata?: Record<string, unknown>;
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			websocketClient.sendRefresh();
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
		onSuccess: (data) => {
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });

			// Optimistically update caches if data is returned
			if (data && data.tokens) {
				queryClient.setQueryData([`/games/${inviteCode}/map/tokens`], { tokens: data.tokens });
			}

			websocketClient.sendRefresh();
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
		onSuccess: (data) => {
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map tokens and map state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });

			// Optimistically update caches if data is returned
			if (data && data.tokens) {
				queryClient.setQueryData([`/games/${inviteCode}/map/tokens`], { tokens: data.tokens });
			}

			websocketClient.sendRefresh();
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			// Also invalidate game state and NPC instances to ensure UI refreshes
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/npc-instances`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			websocketClient.sendRefresh();
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
		onSuccess: (data) => {
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map tokens and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });

			// Optimistically update caches if data is returned
			if (data && data.tokens) {
				queryClient.setQueryData([`/games/${inviteCode}/map/tokens`], { tokens: data.tokens });
			}

			websocketClient.sendRefresh();
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate map state and tokens
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
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
 * Delete a map
 */
export function useDeleteMap(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'DELETE',
		onSuccess: () => {
			// Invalidate all maps list
			queryClient.invalidateQueries({ queryKey: ['/maps'] });
			// Only invalidate session if inviteCode is valid
			if (inviteCode) {
				queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/session`] });
			}
		},
	});
}

/**
 * Import a VTT map
 */
export function useImportVTTMap(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			file: any;
			name: string;
			columns: number;
			rows: number;
			gridSize: number;
			icon?: string;
		}) => {
			const formData = new FormData();
			// React Native/Expo handles file objects differently than web
			// For web, it's a File/Blob. For native, it's { uri, name, type }
			if (data.file instanceof File || data.file instanceof Blob) {
				formData.append('file', data.file);
			} else {
				// @ts-ignore - FormData on RN accepts this object
				formData.append('file', {
					uri: data.file.uri,
					name: data.file.name,
					type: data.file.type,
				});
			}

			formData.append('name', data.name);
			formData.append('columns', data.columns.toString());
			formData.append('rows', data.rows.toString());
			formData.append('gridSize', data.gridSize.toString());
			if (data.icon) {
				formData.append('icon', data.icon);
			}

			// Use apiService.fetchApi for FormData uploads
			return apiService.fetchApi(`/games/${inviteCode}/map/import-vtt`, {
				method: 'POST',
				body: formData,
			});
		},
		onSuccess: () => {
			// Only invalidate if inviteCode is valid
			if (inviteCode) {
				queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
				queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/session`] });
			}
			queryClient.invalidateQueries({ queryKey: ['/maps'] });
			websocketClient.sendRefresh();
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
 * Move a token and return updated game state (including movement budget)
 */
export function useMoveToken(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<MapMoveResponse>({
		method: 'POST',
		onSuccess: (data) => {
			// Only proceed if inviteCode and data are valid
			if (!inviteCode || !data?.gameState) return;

			queryClient.setQueryData([`/games/${inviteCode}/state`], data.gameState);
			if (data.gameState.mapState) {
				queryClient.setQueryData([`/games/${inviteCode}/map`], data.gameState.mapState);
			} else {
				queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			}
			// Also refresh tokens list if used elsewhere
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			websocketClient.sendRefresh();
		},
	});
}

/**
 * Get NPC definitions for a game
 */
export function useNpcDefinitions(inviteCode: string | null | undefined) {
	return useQueryApi<NpcDefinitionListResponse>(
		inviteCode ? `/games/${inviteCode}/npcs` : '/games/null/npcs',
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
		inviteCode && npcId ? `/games/${inviteCode}/npcs/${npcId}` : '/games/null/npcs/null',
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
		inviteCode ? `/games/${inviteCode}/npc-instances` : '/games/null/npc-instances',
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
		onSuccess: (data) => {
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			// Invalidate NPC instances, tokens, map state, and character queries so NPCs show up immediately
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/npc-instances`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });

			// Optimistically update caches if data is returned
			if (data && data.tokens) {
				queryClient.setQueryData([`/games/${inviteCode}/map/tokens`], { tokens: data.tokens });
			}

			websocketClient.sendRefresh();
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
			// Only invalidate if inviteCode is valid
			if (!inviteCode) return;

			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/npc-instances`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map/tokens`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/map`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
			websocketClient.sendRefresh();
		},
	});
}
