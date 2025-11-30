import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import {
	buildMapState,
	createId,
	deserializeCharacter,
	isHostUser,
	resolveMapRow,
} from '@/api/src/utils/games-utils';
import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { Database, MapTokenRow } from '@/shared/workers/db';
import { generateProceduralMap, MapGeneratorPreset } from '@/shared/workers/map-generator';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { getTerrainCost } from '@/utils/movement-calculator';
import { mapStateFromDb } from '@/utils/schema-adapters';


const map = new Hono<GamesContext>();

/**
 * Get map state
 * GET /api/games/:inviteCode/map
 *
 * Returns the current map state including tiles and tokens.
 *
 * @returns Map state object
 */
map.get('/:inviteCode/map', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	try {
		// buildMapState internally calls resolveMapRow to ensure map exists
		const mapState = await buildMapState(db, game);
		return c.json(mapState);
	} catch (error) {
		console.error('Failed to build map state:', error);
		return c.json({ error: 'Failed to load map' }, 500);
	}
});

/**
 * Switch to a different map
 * PATCH /api/games/:inviteCode/map
 *
 * Changes the current map for the game. Only the host can switch maps.
 *
 * @returns Updated map state
 */
map.patch('/:inviteCode/map', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	let payload: { id?: string; mapId?: string };
	try {
		const rawBody = await c.req.text();
		console.log(`[SwitchMap] Raw request body: ${rawBody}, type: ${typeof rawBody}`);

		if (!rawBody || rawBody.trim() === '') {
			return c.json({ error: 'Request body is required' }, 400);
		}

		// Check if body is already a string representation of an object
		if (rawBody === '[object Object]') {
			console.error('[SwitchMap] Received [object Object] - body was not properly stringified');
			return c.json({ error: 'Invalid request body format. Expected JSON object.' }, 400);
		}

		// Try to parse as JSON
		try {
			payload = JSON.parse(rawBody) as { id?: string; mapId?: string };
		} catch (parseError) {
			// If parsing fails, try to extract mapId from the raw body if it's a simple string
			console.warn('[SwitchMap] Failed to parse as JSON, trying alternative parsing:', parseError);
			// If the body is just a mapId string, wrap it
			if (rawBody && !rawBody.includes('{') && !rawBody.includes('[')) {
				payload = { mapId: rawBody.trim() };
			} else {
				throw parseError;
			}
		}
		console.log('[SwitchMap] Parsed payload:', payload);
	} catch (error) {
		console.error('[SwitchMap] Failed to parse request body:', error);
		return c.json({ error: 'Invalid JSON in request body' }, 400);
	}

	// Support both 'id' and 'mapId' for backward compatibility
	const mapId = payload?.mapId || payload?.id;

	if (mapId && mapId !== game.current_map_id) {
		// Verify the map exists
		const mapRow = await db.getMapById(mapId);
		if (!mapRow) {
			return c.json({ error: 'Map not found' }, 404);
		}

		await db.updateGameMap(game.id, mapId);
		game.current_map_id = mapId;
	}

	try {
		const mapState = await buildMapState(db, game);
		return c.json(mapState);
	} catch (error) {
		console.error('Failed to update map state:', error);
		return c.json({ error: 'Failed to update map' }, 500);
	}
});

/**
 * Generate a procedural map
 * POST /api/games/:inviteCode/map/generate
 *
 * Generates a new procedural map and sets it as the current map.
 * Only the host can generate maps.
 *
 * @returns Map state with generated map
 */
map.post('/:inviteCode/map/generate', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		preset?: MapGeneratorPreset;
		width?: number;
		height?: number;
		seed?: string;
		name?: string;
		slug?: string;
	};

	const generated = generateProceduralMap({
		preset: payload.preset,
		width: payload.width,
		height: payload.height,
		seed: payload.seed,
		name: payload.name,
		slug: payload.slug,
	});

	await db.saveMap({
		...generated.map,
		created_at: Date.now(),
		updated_at: Date.now(),
	});
	await db.replaceMapTiles(generated.map.id, generated.tiles);
	await db.updateGameMap(game.id, generated.map.id);
	game.current_map_id = generated.map.id;

	const mapState = await buildMapState(db, game);
	return c.json(mapState);
});

/**
 * Update map terrain tiles
 * POST /api/games/:inviteCode/map/terrain
 *
 * Updates terrain properties for multiple tiles.
 * Only the host can update terrain.
 *
 * @returns Updated map state
 */
map.post('/:inviteCode/map/terrain', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		tiles: Array<{
			x: number;
			y: number;
			terrainType: string;
			elevation?: number;
			isBlocked?: boolean;
			hasFog?: boolean;
			featureType?: string | null;
			metadata?: Record<string, unknown>;
		}>;
	};

	if (!Array.isArray(payload.tiles) || payload.tiles.length === 0) {
		return c.json({ error: 'No tiles provided' }, 400);
	}

	const mapRow = await resolveMapRow(db, game);
	await db.upsertMapTiles(
		mapRow.id,
		payload.tiles.map(tile => ({
			x: tile.x,
			y: tile.y,
			terrain_type: tile.terrainType,
			elevation: tile.elevation ?? 0,
			is_blocked: tile.isBlocked ? 1 : 0,
			has_fog: tile.hasFog ? 1 : 0,
			feature_type: tile.featureType ?? null,
			metadata: JSON.stringify(tile.metadata ?? {}),
		})),
	);

	const mapState = await buildMapState(db, game);
	return c.json(mapState);
});

/**
 * Get map tokens
 * GET /api/games/:inviteCode/map/tokens
 *
 * Returns all tokens on the current map.
 *
 * @returns Object with tokens array
 */
map.get('/:inviteCode/map/tokens', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

/**
 * Create or update a map token
 * POST /api/games/:inviteCode/map/tokens
 *
 * Creates a new token or updates an existing one on the map.
 * Hosts can place/move any token. Players can only move their own character during their turn.
 *
 * @returns Object with updated tokens array
 */
map.post('/:inviteCode/map/tokens', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const isHost = isHostUser(game, user);
	const body = (await c.req.json()) as {
		id?: string;
		mapId?: string;
		tokenType?: string;
		label?: string;
		x: number;
		y: number;
		color?: string;
		characterId?: string;
		npcId?: string;
		elementType?: string;
		metadata?: Record<string, unknown>;
		overrideValidation?: boolean;
	};

	const gameStateService = new GameStateService(db);
	let latestGameState: MultiplayerGameState | null = null;

	// Permission check: Host can move any token, players can only move their own character during their turn
	if (!isHost) {
		// For players: must be moving their own character token during their turn
		if (body.tokenType === 'player' && body.characterId) {
			// Check if this is the player's own character
			const characterRow = await db.getCharacterById(body.characterId);
			if (!characterRow || characterRow.player_id !== user.id) {
				return c.json({ error: 'Forbidden: Not your character' }, 403);
			}

			// Check if it's currently this character's turn
			const gameState = await gameStateService.getState(game);
			latestGameState = gameState;
			const isPlayerTurn = (
				gameState.activeTurn?.type === 'player' &&
				gameState.activeTurn.entityId === body.characterId &&
				!gameState.pausedTurn
			);

			if (!isPlayerTurn) {
				// Log the mismatch for debugging
				console.log('[Token Save] Turn check failed:', {
					activeTurnType: gameState.activeTurn?.type,
					activeTurnEntityId: gameState.activeTurn?.entityId,
					requestCharacterId: body.characterId,
					pausedTurn: gameState.pausedTurn,
					isPlayerTurn,
					entityIdMatch: gameState.activeTurn?.entityId === body.characterId,
				});

				// If the turn type is player but entityId doesn't match, it might be a different player's turn
				// If there's no active turn, allow the move (game might not have started turns yet)
				if (!gameState.activeTurn) {
					console.warn('[Token Save] No active turn in game state, allowing move');
					// Allow the move if there's no active turn (game might not have started)
				} else {
					return c.json({
						error: 'Forbidden: Not your turn',
						details: {
							activeTurnType: gameState.activeTurn?.type,
							activeTurnEntityId: gameState.activeTurn?.entityId,
							requestCharacterId: body.characterId,
							pausedTurn: gameState.pausedTurn,
						},
					}, 403);
				}
			}
		} else if (body.tokenType === 'npc') {
			// Players cannot move NPC tokens
			return c.json({ error: 'Forbidden: Cannot move NPC tokens' }, 403);
		} else if (body.tokenType === 'element') {
			// Players cannot place elements
			return c.json({ error: 'Forbidden: Only DM can place elements' }, 403);
		} else {
			// Unknown token type or missing characterId
			return c.json({ error: 'Forbidden' }, 403);
		}
	}

	// Ensure game.id exists (should always be set, but validate to prevent foreign key errors)
	if (!game.id) {
		return c.json({ error: 'Game ID is missing' }, 500);
	}

	const mapRow = await resolveMapRow(db, game);
	const parsedMapState = mapStateFromDb(mapRow);

	// Validate element types if tokenType is 'element'
	if (body.tokenType === 'element') {
		const validElementTypes = ['fire', 'water', 'chest', 'barrel', 'rock', 'tree', 'bush', 'rubble'];
		if (!body.elementType || !validElementTypes.includes(body.elementType)) {
			return c.json(
				{
					error: `Invalid element type. Must be one of: ${validElementTypes.join(', ')}`,
				},
				400,
			);
		}
	}

	// Check if a token already exists for this character (to prevent duplicates)
	let existingTokenId: string | null = null;
	if (body.characterId && body.tokenType !== 'element') {
		const existingTokens = await db.listMapTokensForGame(game.id);
		const existingToken = existingTokens.find(
			token => token.character_id === body.characterId && token.token_type === 'player',
		);
		if (existingToken) {
			existingTokenId = existingToken.id;
		}
	}

	// Use existing token ID if found, otherwise create new one
	const tokenId = body.id || existingTokenId || createId('token');

	// If token already exists, fetch it to preserve existing foreign key references
	let existingToken: MapTokenRow | null = null;
	if (tokenId) {
		const allTokens = await db.listMapTokensForGame(game.id);
		existingToken = allTokens.find(t => t.id === tokenId) || null;
	}

	// Build metadata for elements
	const metadata = body.metadata || {};
	if (body.tokenType === 'element' && body.elementType) {
		metadata.elementType = body.elementType;
	}

	let playerMoveCost: number | null = null;
	if (!isHost && body.tokenType === 'player' && body.characterId) {
		const path = (metadata.path as Array<{ x: number; y: number }> | undefined);
		if (!path || path.length < 2) {
			return c.json({ error: 'Movement path missing' }, 400);
		}

		let cost = 0;
		for (let i = 1; i < path.length; i++) {
			const step = path[i];
			const cell = parsedMapState.terrain?.[step.y]?.[step.x];
			const stepCost = getTerrainCost(cell);
			if (!Number.isFinite(stepCost)) {
				cost = Number.POSITIVE_INFINITY;
				break;
			}
			cost += stepCost;
		}

		if (!Number.isFinite(cost)) {
			return c.json({ error: 'Forbidden: Path crosses invalid terrain' }, 403);
		}

		playerMoveCost = cost;

		if (latestGameState?.activeTurn?.entityId === body.characterId) {
			const speed = latestGameState.activeTurn.speed ?? DEFAULT_RACE_SPEED;
			const used = latestGameState.activeTurn.movementUsed ?? 0;
			if (used + cost > speed + 1e-6) {
				return c.json({ error: 'Forbidden: Not enough movement remaining' }, 403);
			}
		}
	}

	// Preserve existing foreign key references when updating a token
	// Only override if explicitly provided in the request
	// Normalize empty strings to null to avoid foreign key constraint violations
	const characterId = body.tokenType === 'element'
		? null
		: (body.characterId !== undefined && body.characterId !== null && body.characterId !== ''
			? body.characterId
			: existingToken?.character_id || null);

	let npcId: string | null = body.tokenType === 'element'
		? null
		: (body.npcId !== undefined && body.npcId !== null && body.npcId !== ''
			? body.npcId
			: existingToken?.npc_id || null);

	// Validate foreign key references exist before saving
	if (characterId) {
		const character = await db.getCharacterById(characterId);
		if (!character) {
			return c.json({ error: `Character with id ${characterId} not found` }, 404);
		}
	}

	// Validate NPC exists and resolve to actual NPC ID
	if (npcId) {
		// Try to find NPC by ID first, then by slug (NPCs can be referenced either way)
		let npc = await db.getNpcById(npcId);
		if (!npc) {
			// If not found by ID, try by slug
			npc = await db.getNpcBySlug(npcId);
		}
		if (!npc) {
			return c.json({ error: `NPC with id or slug "${npcId}" not found` }, 404);
		}
		// Use the actual NPC ID from the database to ensure foreign key constraint is satisfied
		npcId = npc.id;
	}

	// Use mapRow.id (already validated) or body.mapId if provided
	const finalMapId = body.mapId || mapRow.id;
	if (body.mapId && body.mapId !== mapRow.id) {
		// Validate custom mapId exists
		const mapExists = await db.getMapById(body.mapId);
		if (!mapExists) {
			return c.json({ error: `Map with id ${body.mapId} not found` }, 404);
		}
	}

	// Preserve other existing values if not provided
	const tokenType = body.tokenType || existingToken?.token_type || 'player';
	const label = body.label !== undefined
		? (body.label || (body.tokenType === 'element' ? body.elementType || null : null))
		: existingToken?.label || null;
	const color = body.color !== undefined ? body.color : existingToken?.color || null;
	const hitPoints = existingToken?.hit_points ?? null;
	const maxHitPoints = existingToken?.max_hit_points ?? null;
	const status = existingToken?.status || 'idle';
	const facing = existingToken?.facing ?? 0;
	const statusEffects = existingToken?.status_effects || null;

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: finalMapId,
		character_id: characterId,
		npc_id: npcId,
		token_type: tokenType,
		label,
		x: body.x,
		y: body.y,
		facing,
		color,
		status,
		is_visible: 1,
		hit_points: hitPoints,
		max_hit_points: maxHitPoints,
		metadata: JSON.stringify(metadata),
		status_effects: statusEffects,
	});

	// Auto-roll initiative for player and NPC tokens (not elements)
	if (body.tokenType !== 'element' && game.status === 'active') {
		try {
			const gameStateService = new GameStateService(db);
			let dex: number | undefined;
			let entityId: string;
			let entityType: 'player' | 'npc' | undefined;

			if (body.tokenType === 'player' && body.characterId) {
				// Player character
				const characterRow = await db.getCharacterById(body.characterId);
				if (characterRow) {
					const character = deserializeCharacter(characterRow);
					dex = character.stats?.DEX;
					entityId = body.characterId;
					entityType = 'player';
				} else {
					// Character not found, skip initiative
					entityId = '';
					entityType = undefined;
				}
			} else if (body.tokenType === 'npc' && body.npcId) {
				// NPC token - use tokenId as entityId
				entityId = tokenId;
				entityType = 'npc';
				// Get NPC definition to find DEX
				const npcDef = await db.getNpcById(body.npcId);
				if (npcDef) {
					const stats = JSON.parse(npcDef.stats || '{}');
					dex = stats.DEX;
				}
			} else if (body.tokenType === 'npc' && !body.npcId) {
				// NPC token without npcId - might be from token metadata, use tokenId
				entityId = tokenId;
				entityType = 'npc';
				// Try to get NPC from token's npc_id if available
				const savedToken = (await db.listMapTokensForGame(game.id)).find(t => t.id === tokenId);
				if (savedToken?.npc_id) {
					const npcDef = await db.getNpcById(savedToken.npc_id);
					if (npcDef) {
						const stats = JSON.parse(npcDef.stats || '{}');
						dex = stats.DEX;
					}
				}
			} else {
				// Unknown token type, skip
				entityId = '';
				entityType = undefined;
			}

			// Add to initiative order if we have a valid entity
			if (entityId && entityType !== undefined) {
				await gameStateService.addToInitiativeOrder(game, {
					entityId,
					type: entityType,
					dex,
				});
				console.log(`[Auto-Initiative] Added ${entityType} ${entityId} to initiative order`);
			}
		} catch (error) {
			console.error('Failed to auto-roll initiative for token:', error);
			// Don't fail the token placement if initiative fails
		}
	}

	if (
		!isHost &&
		body.tokenType === 'player' &&
		body.characterId &&
		playerMoveCost !== null &&
		latestGameState?.activeTurn?.entityId === body.characterId
	) {
		const speed = latestGameState.activeTurn.speed ?? DEFAULT_RACE_SPEED;
		const used = latestGameState.activeTurn.movementUsed ?? 0;
		const updatedMovement = Math.min(speed, used + playerMoveCost);
		try {
			const gameStateService = new GameStateService(db);
			await gameStateService.updateTurn(game, {
				movementUsed: updatedMovement,
				actorEntityId: body.characterId,
			});
		} catch (error) {
			console.error('Failed to update movement usage after token save', error);
		}
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

/**
 * Delete a map token
 * DELETE /api/games/:inviteCode/map/tokens/:tokenId
 *
 * Removes a token from the map. Also removes it from initiative order if game is active.
 * Only the host can delete tokens.
 *
 * @returns Object with updated tokens array
 */
map.delete('/:inviteCode/map/tokens/:tokenId', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const tokenId = c.req.param('tokenId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Get token info before deleting to determine entityId for initiative removal
	const tokens = await db.listMapTokensForGame(game.id);
	const tokenToDelete = tokens.find(t => t.id === tokenId);

	// Remove from initiative order if game is active
	if (game.status === 'active' && tokenToDelete) {
		try {
			const gameStateService = new GameStateService(db);
			let entityId: string | null = null;

			if (tokenToDelete.token_type === 'player' && tokenToDelete.character_id) {
				// Player token - use character_id as entityId
				entityId = tokenToDelete.character_id;
			} else if (tokenToDelete.token_type === 'npc') {
				// NPC token - use tokenId as entityId
				entityId = tokenId;
			}

			if (entityId) {
				await gameStateService.removeFromInitiativeOrder(game, entityId);
				console.log(`[Auto-Initiative] Removed ${tokenToDelete.token_type} ${entityId} from initiative order`);
			}
		} catch (error) {
			console.error('Failed to remove entity from initiative order:', error);
			// Don't fail the token deletion if initiative removal fails
		}
	}

	await db.deleteMapToken(tokenId);
	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

export default map;


