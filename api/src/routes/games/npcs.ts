import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import {
	buildMapState,
	createCustomNpcDefinition,
	createId,
	isHostUser,
	npcTokenToResponse,
	resolveMapRow,
} from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { npcFromDb } from '@/utils/schema-adapters';

const npcs = new Hono<GamesContext>();

/**
 * List NPC definitions
 * GET /api/games/:inviteCode/npcs
 *
 * Returns all available NPC definitions in the system.
 *
 * @returns Object with npcs array
 */
npcs.get('/:inviteCode/npcs', async (c) => {
	const db = new Database(c.env.DATABASE);
	const npcRows = await db.listNpcDefinitions();
	return c.json({ npcs: npcRows.map(npcFromDb) });
});

/**
 * Get NPC definition by ID
 * GET /api/games/:inviteCode/npcs/:npcId
 *
 * Returns a specific NPC definition.
 *
 * @returns NPC definition object
 */
npcs.get('/:inviteCode/npcs/:npcId', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const npcId = c.req.param('npcId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const npc = await db.getNpcById(npcId);
	if (!npc) {
		return c.json({ error: 'NPC not found' }, 404);
	}

	return c.json(npcFromDb(npc));
});

/**
 * Place an NPC on the map
 * POST /api/games/:inviteCode/npcs
 *
 * Creates an NPC token on the map. Can use an existing NPC definition or create a custom one.
 * Only the host can place NPCs.
 *
 * @returns Object with tokens array
 */
npcs.post('/:inviteCode/npcs', async (c) => {
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

	const payload = (await c.req.json()) as {
		npcId?: string;
		x: number;
		y: number;
		label?: string;
		maxHealth?: number; // DM override for health
		actionPoints?: number; // DM override for action points
		statusEffects?: string[];
		customNpc?: {
			name: string;
			role: string;
			alignment: string;
			disposition: string;
			description?: string;
			maxHealth?: number;
			armorClass?: number;
			color?: string;
			icon?: string;
		};
	};

	let npc =
		payload.npcId
			? await db.getNpcBySlug(payload.npcId)
			: null;

	if (!npc && payload.customNpc) {
		try {
			npc = await createCustomNpcDefinition(db, user.id, payload.customNpc);
		} catch (error) {
			console.error('Failed to create custom NPC', error);
			return c.json({ error: 'Failed to create NPC' }, 500);
		}
	}

	if (!npc) {
		return c.json({ error: 'NPC not found' }, 404);
	}

	const mapRow = await resolveMapRow(db, game);
	const npcMetadata = JSON.parse(npc.metadata || '{}');
	const tokenId = createId('npc');

	// Generate unique label if not provided - count existing NPCs with same base name
	let uniqueLabel = payload.label;
	if (!uniqueLabel) {
		const existingTokens = await db.listMapTokensForGame(game.id);
		const baseName = npc.name;
		const existingNpcsOfType = existingTokens.filter(
			token => token.token_type === 'npc' &&
			(token.label === baseName || token.label?.startsWith(`${baseName} `)),
		);
		const count = existingNpcsOfType.length;
		uniqueLabel = count > 0 ? `${baseName} ${count + 1}` : baseName;
	}

	// Use DM override if provided, otherwise default to 10/10 for health, 3/3 for AP
	const maxHealth = payload.maxHealth ?? npc.base_health ?? 10;
	const currentHealth = maxHealth;
	const actionPoints = payload.actionPoints ?? 3;
	const maxActionPoints = 3;

	// Store action points and icon in metadata
	// Copy icon from NPC definition if it exists
	const tokenMetadata = {
		...(JSON.parse(npc.metadata || '{}')),
		actionPoints,
		maxActionPoints,
		// Ensure icon is copied from NPC definition to token metadata
		...(npcMetadata.icon ? { icon: npcMetadata.icon } : {}),
		...(npc.icon ? { icon: npc.icon } : {}),
		...(payload.customNpc?.icon ? { icon: payload.customNpc.icon } : {}),
	};

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: mapRow.id,
		character_id: null,
		npc_id: npc.id,
		token_type: 'npc',
		label: uniqueLabel,
		x: payload.x,
		y: payload.y,
		facing: 0,
		color: npcMetadata.color ?? '',
		status: npc.disposition,
		is_visible: 1,
		hit_points: currentHealth,
		max_hit_points: maxHealth,
		status_effects: payload.statusEffects ? JSON.stringify(payload.statusEffects) : null,
		metadata: JSON.stringify(tokenMetadata),
	});

	// Auto-roll initiative for NPC if game is active
	if (game.status === 'active') {
		try {
			const gameStateService = new GameStateService(db);
			// Get DEX from NPC definition
			const stats = JSON.parse(npc.stats || '{}');
			const dex = stats.DEX;

			// For NPCs, entityId is the tokenId
			await gameStateService.addToInitiativeOrder(game, {
				entityId: tokenId,
				type: 'npc',
				dex,
			});
			console.log(`[Auto-Initiative] Added NPC ${uniqueLabel} (token ${tokenId}) to initiative order`);
		} catch (error) {
			console.error('Failed to auto-roll initiative for NPC:', error);
			// Don't fail the NPC placement if initiative fails
		}
	}

	const mapState = await buildMapState(db, game);

	// Update the game state's map state so /state returns fresh data
	try {
		const gameStateService = new GameStateService(db);
		const currentState = await gameStateService.getState(game);
		const updatedState: MultiplayerGameState = {
			...currentState,
			mapState,
			lastUpdated: Date.now(),
		};
		await gameStateService['saveState'](game.id, updatedState);
		console.log(`[NPC] Updated game state map state for game ${inviteCode}`);
	} catch (error) {
		// Don't fail the request if game state update fails - database is source of truth
		console.error('[NPC] Failed to update game state map state:', error);
	}

	return c.json({ tokens: mapState.tokens });
});

/**
 * Get NPC instances on the map
 * GET /api/games/:inviteCode/npc-instances
 *
 * Returns all NPC tokens currently on the map.
 * Only the host can access this endpoint.
 *
 * @returns Object with instances array
 */
npcs.get('/:inviteCode/npc-instances', async (c) => {
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

	const tokens = await db.listMapTokensForGame(game.id);
	const npcTokens = tokens.filter(t => t.token_type === 'npc');
	return c.json({ instances: npcTokens.map(npcTokenToResponse) });
});

/**
 * Update an NPC instance
 * PATCH /api/games/:inviteCode/npcs/:tokenId
 *
 * Updates properties of an NPC token (health, action points, status, etc.).
 * Only the host can update NPCs.
 *
 * @returns Object with updated instance
 */
npcs.patch('/:inviteCode/npcs/:tokenId', async (c) => {
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

	const payload = (await c.req.json().catch(() => ({}))) as {
		currentHealth?: number;
		maxHealth?: number;
		actionPoints?: number;
		maxActionPoints?: number;
		statusEffects?: string[];
		isFriendly?: boolean;
		metadata?: Record<string, unknown>;
		name?: string;
	};

	const token = await db.getMapTokenById(tokenId);
	if (!token || token.token_type !== 'npc') {
		return c.json({ error: 'NPC token not found' }, 404);
	}

	const maxHealth = typeof payload.maxHealth === 'number' ? payload.maxHealth : (token.max_hit_points ?? 0);
	const currentHealth =
		typeof payload.currentHealth === 'number'
			? Math.max(0, Math.min(maxHealth, payload.currentHealth))
			: (token.hit_points ?? maxHealth);

	const tokenMetadata = JSON.parse(token.metadata || '{}');
	const actionPoints = typeof payload.actionPoints === 'number' ? payload.actionPoints : (tokenMetadata.actionPoints ?? 3);
	const maxActionPoints = typeof payload.maxActionPoints === 'number' ? payload.maxActionPoints : (tokenMetadata.maxActionPoints ?? 3);

	const newStatus = typeof payload.isFriendly === 'boolean'
		? (payload.isFriendly ? 'friendly' : 'hostile')
		: token.status;

	await db.updateMapToken(tokenId, {
		label: payload.name ?? token.label,
		hit_points: currentHealth,
		max_hit_points: maxHealth,
		status_effects: payload.statusEffects ? JSON.stringify(payload.statusEffects) : token.status_effects,
		status: newStatus,
		metadata: JSON.stringify({
			...tokenMetadata,
			actionPoints,
			maxActionPoints,
			...(payload.metadata ?? {}),
		}),
	});

	const refreshed = await db.getMapTokenById(tokenId);
	return c.json({ instance: refreshed ? npcTokenToResponse(refreshed) : null });
});

export default npcs;
