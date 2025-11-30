import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import {
	createId,
	deserializeCharacter,
	isHostUser,
} from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';
import { Character } from '@/types/character';

const turns = new Hono<GamesContext>();

/**
 * Roll initiative for all characters and NPCs
 * POST /api/games/:inviteCode/initiative/roll
 *
 * Rolls initiative for all characters and NPCs in the game, restoring them to full health/AP.
 * Only the host can roll initiative.
 *
 * @returns Updated game state with initiative order
 */
turns.post('/:inviteCode/initiative/roll', async (c) => {
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

	// Get all characters in the game
	const memberships = await db.getGamePlayers(game.id);
	const characters = await Promise.all(
		memberships.map(async membership => {
			const row = await db.getCharacterById(membership.character_id);
			return row ? deserializeCharacter(row) : null;
		}),
	);
	const validCharacters = characters.filter((c): c is Character => Boolean(c));

	// Restore all player characters to full health and action points when starting encounter
	for (const character of validCharacters) {
		await db.updateCharacter(character.id, {
			health: character.maxHealth,
			action_points: character.maxActionPoints,
		});
		console.log(`[Initiative] Restored character ${character.id} to full health (${character.maxHealth}) and AP (${character.maxActionPoints})`);
	}

	// Get all NPC tokens on the map
	const allTokens = await db.listMapTokensForGame(game.id);
	const npcTokens = allTokens.filter(t => t.token_type === 'npc');

	// Fetch NPC definitions for all NPCs on the map
	const npcs = await Promise.all(
		npcTokens.map(async token => {
			if (!token.npc_id) return null;

			// Fetch the actual NPC definition from the database
			const npcDef = await db.getNpcById(token.npc_id);
			if (!npcDef) return null;

			// Get stats from the NPC definition (stats field is JSON string)
			const stats = JSON.parse(npcDef.stats || '{}');
			if (!stats.DEX) {
				stats.DEX = 10; // Default DEX if not set
			}

			return {
				id: token.id,
				entityId: token.id,
				stats,
			};
		}),
	);

	const validNpcs = npcs.filter((n): n is { id: string; entityId: string; stats: { DEX: number } } => Boolean(n));

	// Restore all NPC tokens to full health and action points when starting encounter
	for (const npcToken of npcTokens) {
		const tokenMetadata = JSON.parse(npcToken.metadata || '{}');
		const maxHealth = npcToken.max_hit_points ?? 10;
		const maxActionPoints = tokenMetadata.maxActionPoints ?? 3;

		await db.updateMapToken(npcToken.id, {
			hit_points: maxHealth,
			metadata: JSON.stringify({
				...tokenMetadata,
				actionPoints: maxActionPoints,
				maxActionPoints,
			}),
		});
		console.log(`[Initiative] Restored NPC token ${npcToken.id} to full health (${maxHealth}) and AP (${maxActionPoints})`);
	}

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.rollInitiative(
		game,
		validCharacters.map(c => ({ id: c.id, stats: c.stats })),
		validNpcs,
	);

	// Log detailed initiative roll to database
	try {
		if (gameState.initiativeOrder && gameState.initiativeOrder.length > 0) {
			// Get NPC tokens for name lookup (already fetched above)

			// Build detailed initiative roll descriptions
			const rollDetails = gameState.initiativeOrder.map((entry, index) => {
				let name = 'Unknown';
				let rollInfo = '';

				if (entry.type === 'player') {
					const character = validCharacters.find(c => c.id === entry.entityId);
					name = character?.name || 'Unknown';
					// Get roll details from the entry if available (roll and dexMod)
					const roll = entry.roll;
					const dexMod = entry.dexMod;
					if (roll !== undefined && dexMod !== undefined) {
						rollInfo = ` (d20: ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative})`;
					} else {
						rollInfo = ` (Total: ${entry.initiative})`;
					}
				} else {
					// NPC
					const token = npcTokens.find(t => t.id === entry.entityId);
					name = token?.label || 'Unknown NPC';
					const roll = entry.roll;
					const dexMod = entry.dexMod;
					if (roll !== undefined && dexMod !== undefined) {
						rollInfo = ` (d20: ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative})`;
					} else {
						rollInfo = ` (Total: ${entry.initiative})`;
					}
				}

				return `${index + 1}. ${name}: ${entry.initiative}${rollInfo}`;
			});

			const firstEntity = gameState.initiativeOrder[0];
			let firstName = 'Unknown';
			if (firstEntity.type === 'player') {
				const character = validCharacters.find(c => c.id === firstEntity.entityId);
				firstName = character?.name || 'Unknown';
			} else {
				const token = npcTokens.find(t => t.id === firstEntity.entityId);
				firstName = token?.label || 'Unknown NPC';
			}

			await db.saveActivityLog({
				id: createId('log'),
				game_id: game.id,
				invite_code: inviteCode,
				type: 'initiative_roll',
				timestamp: Date.now(),
				description: `Initiative rolled. ${firstName} goes first.`,
				actor_id: user.id,
				actor_name: user.name || user.email || null,
				data: JSON.stringify({
					initiativeOrder: gameState.initiativeOrder,
					rollDetails: rollDetails,
					activeTurn: gameState.activeTurn,
				}),
			});

			// Also log individual rolls for each character
			for (const entry of gameState.initiativeOrder) {
				let name = 'Unknown';
				if (entry.type === 'player') {
					const character = validCharacters.find(c => c.id === entry.entityId);
					name = character?.name || 'Unknown';
				} else {
					const token = npcTokens.find(t => t.id === entry.entityId);
					name = token?.label || 'Unknown NPC';
				}

				const roll = entry.roll;
				const dexMod = entry.dexMod;
				const rollDescription = roll !== undefined && dexMod !== undefined
					? `${name} rolled ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative} for initiative`
					: `${name} has initiative ${entry.initiative}`;

				await db.saveActivityLog({
					id: createId('log'),
					game_id: game.id,
					invite_code: inviteCode,
					type: 'initiative_roll_individual',
					timestamp: Date.now(),
					description: rollDescription,
					actor_id: user.id,
					actor_name: user.name || user.email || null,
					data: JSON.stringify({
						entityId: entry.entityId,
						entityType: entry.type,
						initiative: entry.initiative,
						roll: roll,
						dexMod: dexMod,
					}),
				});
			}
		}
	} catch (error) {
		console.error('Failed to log initiative roll:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

/**
 * Start a specific turn
 * POST /api/games/:inviteCode/turn/start
 *
 * Manually starts a turn for a specific entity.
 * Only the host can start turns.
 *
 * @returns Updated game state
 */
turns.post('/:inviteCode/turn/start', async (c) => {
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

	const body = (await c.req.json().catch(() => ({}))) as {
		turnType: 'player' | 'npc' | 'dm';
		entityId: string;
	};

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.startTurn(game, body.turnType, body.entityId);

	// Log turn start to database
	try {
		const characterName = body.turnType === 'player'
			? gameState.characters.find(c => c.id === body.entityId)?.name
			: gameState.initiativeOrder?.find(e => e.entityId === body.entityId)
				? 'NPC'
				: 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_start',
			timestamp: Date.now(),
			description: `${characterName || 'Character'} started their turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: body.entityId,
				entityType: body.turnType,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn start:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

/**
 * End the current turn
 * POST /api/games/:inviteCode/turn/end
 *
 * Ends the current turn and advances to the next entity in initiative order.
 *
 * @returns Updated game state
 */
turns.post('/:inviteCode/turn/end', async (c) => {
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

	const gameStateService = new GameStateService(db);

	// Get current game state BEFORE ending the turn to capture the turn that's ending
	const previousGameState = await gameStateService.getState(game);
	const previousTurn = previousGameState.activeTurn ?? null;
	const previousCharacters = previousGameState.characters ?? [];

	const gameState = await gameStateService.endTurn(game);

	// Log turn end to database using the PREVIOUS turn (the one that just ended)
	try {
		// Use previousTurn (the turn that ended) instead of gameState.activeTurn (the new turn)
		const endedTurn = previousTurn;
		const characterName = previousCharacters.find(c => c.id === endedTurn?.entityId)?.name || 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_end',
			timestamp: Date.now(),
			description: `${characterName} ended their turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: endedTurn?.entityId,
				entityType: endedTurn?.type,
				turnNumber: endedTurn?.turnNumber,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn end:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

/**
 * Advance to next turn
 * POST /api/games/:inviteCode/turn/next
 *
 * Ends the current turn and advances to the next entity (same as turn/end).
 * Only the host can use this endpoint.
 *
 * @returns Updated game state
 */
turns.post('/:inviteCode/turn/next', async (c) => {
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

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.endTurn(game);

	// Log turn skip to database
	try {
		const currentTurn = gameState.activeTurn;
		const characterName = gameState.characters.find(c => c.id === currentTurn?.entityId)?.name || 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_skip',
			timestamp: Date.now(),
			description: `DM skipped to ${characterName}'s turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: currentTurn?.entityId,
				entityType: currentTurn?.type,
				turnNumber: currentTurn?.turnNumber,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn skip:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

/**
 * Update turn state
 * POST /api/games/:inviteCode/turn/update
 *
 * Updates the current turn's state (movement used, actions used, etc.).
 * Hosts can update any turn, players can only update their own turn.
 *
 * @returns Updated game state
 */
turns.post('/:inviteCode/turn/update', async (c) => {
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
	const players = await db.getGamePlayers(game.id);
	const membership = players.find(p => p.player_id === user.id);

	if (!isHost && !membership) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		movementUsed?: number;
		majorActionUsed?: boolean;
		minorActionUsed?: boolean;
		actorEntityId?: string;
	};

	const payload = {
		movementUsed: body.movementUsed,
		majorActionUsed: body.majorActionUsed,
		minorActionUsed: body.minorActionUsed,
		// Don't restrict actor for host - trust the host's intent to update the active turn
		actorEntityId: isHost ? undefined : membership?.character_id,
	};

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.updateTurn(game, payload);
	return c.json(gameState);
});

/**
 * Interrupt the current turn
 * POST /api/games/:inviteCode/turn/interrupt
 *
 * Pauses the current turn, allowing the DM to take control.
 * Only the host can interrupt turns.
 *
 * @returns Updated game state with paused turn
 */
turns.post('/:inviteCode/turn/interrupt', async (c) => {
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

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.interruptTurn(game, game.host_id);
	return c.json(gameState);
});

/**
 * Resume a paused turn
 * POST /api/games/:inviteCode/turn/resume
 *
 * Resumes a previously paused turn.
 * Only the host can resume turns.
 *
 * @returns Updated game state with resumed turn
 */
turns.post('/:inviteCode/turn/resume', async (c) => {
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

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.resumeTurn(game);
	return c.json(gameState);
});

export default turns;


