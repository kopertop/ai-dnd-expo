import { BLOCKED_COST, findPathWithCosts, getTerrainCost, type Coordinate } from './movement-calculator';

import type { MapTokenUpsertRequest } from '@/types/api/multiplayer-api';
import type { MapState } from '@/types/multiplayer-map';

export interface MoveTokenParams {
	/** The map state containing terrain and tokens */
	map: MapState;
	/** Starting position */
	from: Coordinate;
	/** Target position */
	to: Coordinate;
	/** Token information */
	token: {
		id: string;
		type: 'player' | 'npc' | 'object';
		label: string;
		color?: string;
		entityId?: string; // characterId for players, npcId for NPCs
		metadata?: Record<string, unknown>;
	};
	/** Current movement used (from activeTurn.movementUsed) */
	currentMovementUsed: number;
	/** Total movement speed (from activeTurn.speed or character speed) */
	totalMovementSpeed: number;
	/** Whether this is a host/DM move (can override validation) */
	isHost: boolean;
	/** Function to save the token to the backend */
	saveToken: (data: MapTokenUpsertRequest) => Promise<unknown>;
	/** Function to update turn usage */
	updateTurnUsage: (params: {
		movementUsed: number;
		majorActionUsed?: boolean;
		minorActionUsed?: boolean;
	}, entityId?: string) => Promise<unknown>;
	/** Optional entityId override for turn usage updates (e.g., token.id for NPCs) */
	turnEntityId?: string;
	/** Optional callback for optimistic map state update */
	onOptimisticUpdate?: (updatedTokens: Array<{ id: string; x: number; y: number }>) => void;
	/** Optional callback for error handling */
	onError?: (error: Error) => void;
}

export interface MoveTokenResult {
	/** Whether the move was successful */
	success: boolean;
	/** The path taken */
	path: Coordinate[];
	/** The movement cost */
	cost: number;
	/** Updated movement used */
	updatedMovementUsed: number;
	/** Error message if failed */
	error?: string;
}

/**
 * Helper function to move a token and update movement budget.
 * Handles pathfinding, validation, token saving, and movement budget updates.
 *
 * @param params - Movement parameters
 * @returns Result of the movement operation
 */
export async function moveTokenWithBudget(params: MoveTokenParams): Promise<MoveTokenResult> {
	const {
		map,
		from,
		to,
		token,
		currentMovementUsed,
		totalMovementSpeed,
		isHost,
		saveToken,
		updateTurnUsage,
		turnEntityId,
		onOptimisticUpdate,
		onError,
	} = params;

	// Check if destination is blocked before attempting pathfinding
	const destinationCell = map.terrain?.[to.y]?.[to.x];
	const destinationCost = getTerrainCost(destinationCell);
	if (destinationCost >= BLOCKED_COST) {
		const error = new Error('Cannot move to blocked terrain.');
		onError?.(error);
		return {
			success: false,
			path: [],
			cost: 0,
			updatedMovementUsed: currentMovementUsed,
			error: error.message,
		};
	}

	// Calculate path and cost
	const pathResult = findPathWithCosts(map, from, to);

	if (!pathResult || !pathResult.path.length) {
		const error = new Error('Unable to find a valid path to that tile.');
		onError?.(error);
		return {
			success: false,
			path: [],
			cost: 0,
			updatedMovementUsed: currentMovementUsed,
			error: error.message,
		};
	}

	// Check if there's enough movement budget
	const remainingMovement = Math.max(0, totalMovementSpeed - currentMovementUsed);
	if (pathResult.cost > remainingMovement && !isHost) {
		const error = new Error('Not enough movement points for that path.');
		onError?.(error);
		return {
			success: false,
			path: pathResult.path,
			cost: pathResult.cost,
			updatedMovementUsed: currentMovementUsed,
			error: error.message,
		};
	}

	// Calculate updated movement used
	const updatedMovementUsed = Math.min(totalMovementSpeed, currentMovementUsed + pathResult.cost);

	try {
		// Optimistic update: update local state immediately
		if (onOptimisticUpdate) {
			onOptimisticUpdate([
				{
					id: token.id,
					x: to.x,
					y: to.y,
				},
			]);
		}

		// Prepare token data
		const tokenData: MapTokenUpsertRequest = {
			id: token.id,
			tokenType: token.type,
			x: to.x,
			y: to.y,
			label: token.label,
			color: token.color,
			metadata: {
				...(token.metadata || {}),
				path: pathResult.path,
			},
		};

		if (token.type === 'player' && token.entityId) {
			tokenData.characterId = token.entityId;
		}

		// Save token to backend
		await saveToken(tokenData);

		// Update movement budget (only for players and NPCs, not objects)
		// NOTE: For non-host player tokens, the backend already updates movementUsed in map.ts,
		// so we skip the frontend update to avoid overwriting with stale values.
		// For host player tokens and NPCs, we need to update from the frontend.
		const entityIdForTurnUpdate = turnEntityId || token.entityId;
		const shouldUpdateFromFrontend = 
			(token.type === 'npc' && entityIdForTurnUpdate) ||
			(token.type === 'player' && isHost && entityIdForTurnUpdate);
		
		if (shouldUpdateFromFrontend) {
			await updateTurnUsage(
				{
					movementUsed: updatedMovementUsed,
				},
				entityIdForTurnUpdate,
			);
		}

		return {
			success: true,
			path: pathResult.path,
			cost: pathResult.cost,
			updatedMovementUsed,
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		onError?.(err);

		// Revert optimistic update on error
		if (onOptimisticUpdate) {
			onOptimisticUpdate([
				{
					id: token.id,
					x: from.x,
					y: from.y,
				},
			]);
		}

		return {
			success: false,
			path: pathResult.path,
			cost: pathResult.cost,
			updatedMovementUsed: currentMovementUsed,
			error: err.message,
		};
	}
}

