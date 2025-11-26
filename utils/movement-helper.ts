import { findPathWithCosts, type Coordinate } from './movement-calculator';

import type { MapState } from '@/types/multiplayer-map';
import type { MapTokenUpsertRequest } from '@/types/api/multiplayer-api';

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

		// Set the appropriate ID field based on token type
		if (token.type === 'npc' && token.entityId) {
			tokenData.npcId = token.entityId;
			tokenData.overrideValidation = isHost; // DM can override validation for NPCs
		} else if (token.type === 'player' && token.entityId) {
			tokenData.characterId = token.entityId;
		}

		// Save token to backend
		await saveToken(tokenData);

		// Update movement budget (only for players and NPCs, not objects)
		// Use turnEntityId override if provided, otherwise use token.entityId
		const entityIdForTurnUpdate = turnEntityId || token.entityId;
		if ((token.type === 'player' || token.type === 'npc') && entityIdForTurnUpdate) {
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

