import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import { createId, isHostUser, serializeCharacter, toGameSummary } from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';
import { generateInviteCode } from '@/shared/workers/session-manager';
import type { CreateGameBody, JoinGameBody } from '@/types/games-api';
import { MultiplayerGameState } from '@/types/multiplayer-game';



const core = new Hono<GamesContext>();

/**
 * Create a new game
 * POST /api/games
 *
 * Creates a new game with quest data, world, and starting area.
 * Optionally includes a host character.
 *
 * @returns Game state object
 */
core.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = (await c.req.json()) as CreateGameBody;
	const { questId, quest, world, startingArea, hostId, hostEmail, hostCharacter, currentMapId } = body;
	const resolvedHostId = hostId ?? user.id;
	const resolvedHostEmail = hostEmail ?? user.email ?? undefined;

	if (!resolvedHostId) {
		return c.json({ error: 'Host identity is required' }, 400);
	}

	if (!questId && !quest) {
		return c.json({ error: 'Quest ID or quest data is required' }, 400);
	}

	const db = new Database(c.env.DATABASE);

	let questData = quest ?? null;
	if (!questData && questId) {
		const questString = await c.env.QUESTS.get(questId);
		if (!questString) {
			return c.json({ error: 'Quest not found. Please provide quest data in the request body.' }, 404);
		}
		questData = JSON.parse(questString);
	}

	if (!questData) {
		return c.json({ error: 'Quest data is required' }, 400);
	}

	const inviteCode = generateInviteCode();
	const gameId = createId('game');
	const persistedQuest = {
		...questData,
		objectives: questData.objectives ?? [],
		createdAt: questData.createdAt ?? Date.now(),
		createdBy: questData.createdBy ?? (resolvedHostEmail || user.email || 'host'),
	};

	await db.createGame({
		id: gameId,
		invite_code: inviteCode,
		host_id: resolvedHostId,
		host_email: resolvedHostEmail || user.email || null,
		quest_id: persistedQuest.id,
		quest_data: JSON.stringify(persistedQuest),
		world,
		starting_area: startingArea,
		status: 'waiting',
		current_map_id: currentMapId || null,
	});

	if (hostCharacter) {
		const serializedCharacter = serializeCharacter(
			hostCharacter,
			resolvedHostId,
			resolvedHostEmail || user.email || null,
		);

		const existingCharacter = await db.getCharacterById(hostCharacter.id);
		if (existingCharacter) {
			await db.updateCharacter(hostCharacter.id, serializedCharacter);
		} else {
			await db.createCharacter(serializedCharacter);
		}

		await db.addPlayerToGame({
			game_id: gameId,
			player_id: resolvedHostId,
			player_email: resolvedHostEmail || user.email || null,
			character_id: hostCharacter.id,
			character_name: hostCharacter.name,
			joined_at: Date.now(),
		});
	}

	// Return the game state
	const gameStateService = new GameStateService(db);
	const game = await db.getGameByInviteCode(inviteCode);
	if (!game) {
		return c.json({ error: 'Failed to load game' }, 500);
	}
	const state = await gameStateService.getState(game);
	return c.json(state);
});

/**
 * Get user's games (hosted and joined)
 * GET /api/games/me
 *
 * Returns lists of games the user is hosting and games they've joined.
 *
 * @returns Object with hostedGames and joinedGames arrays
 */
core.get('/me', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = new Database(c.env.DATABASE);
	const hostedGames = await db.getGamesHostedByUser(user.id, user.email);
	const memberships = await db.getGameMembershipsForPlayer(user.id, user.email);

	const joinedSummariesMap = new Map<string, ReturnType<typeof toGameSummary> & {
		characterId?: string;
		characterName?: string;
		joinedAt?: number;
	}>();

	for (const membership of memberships) {
		const existing = joinedSummariesMap.get(membership.game_id);
		if (existing) {
			continue;
		}

		const game = await db.getGameById(membership.game_id);
		if (!game) {
			continue;
		}

		joinedSummariesMap.set(membership.game_id, {
			...toGameSummary(game),
			characterId: membership.character_id,
			characterName: membership.character_name,
			joinedAt: membership.joined_at,
		});
	}

	return c.json({
		hostedGames: hostedGames.map(toGameSummary),
		joinedGames: Array.from(joinedSummariesMap.values()),
	});
});

/**
 * Get game by invite code
 * GET /api/games/:inviteCode
 *
 * Returns the full game state for a game identified by invite code.
 *
 * @returns Game state object
 */
core.get('/:inviteCode', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	try {
		const gameStateService = new GameStateService(db);
		const sessionData = await gameStateService.getState(game);

		// Add currentMapId, world, and startingArea from database (in case session doesn't have them)
		// Create response object with additional properties
		const response = {
			...sessionData,
			currentMapId: game.current_map_id,
			// Use gameWorld from state, fallback to database world
			gameWorld: sessionData.gameWorld || game.world,
			// Ensure startingArea is set
			startingArea: sessionData.startingArea || game.starting_area,
		};

		return c.json(response);
	} catch (error) {
		console.error('Failed to fetch game state:', error);
		return c.json({ error: 'Failed to fetch game state', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

/**
 * Get game state
 * GET /api/games/:inviteCode/state
 *
 * Returns the current game state including characters, map, and turn information.
 *
 * @returns Game state object
 */
core.get('/:inviteCode/state', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	console.log(`[State] Fetching game state for invite code: "${inviteCode}" (length: ${inviteCode.length})`);

	const db = new Database(c.env.DATABASE);

	// getGameByInviteCode now handles case-insensitive fallback internally
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		console.log(`[State] Game not found for invite code: "${inviteCode}"`);
		return c.json({ error: 'Game not found' }, 404);
	}

	console.log(`[State] Found game ${game.id} for invite code ${inviteCode}, building state...`);

	try {
		const gameStateService = new GameStateService(db);
		const state = await gameStateService.getState(game);
		console.log(`[State] Successfully built game state for ${inviteCode}`);
		return c.json(state);
	} catch (error) {
		console.error(`[State] Failed to fetch game state for ${inviteCode}:`, error);
		return c.json({ error: 'Failed to fetch game state', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

/**
 * Join a game
 * POST /api/games/:inviteCode/join
 *
 * Allows a player to join a game with their character.
 *
 * @returns Game state object
 */
core.post('/:inviteCode/join', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const body = (await c.req.json()) as JoinGameBody;
	const { character } = body;
	const playerId = body.playerId || user.id;
	const playerEmail = body.playerEmail || user.email || null;

	if (!character) {
		return c.json({ error: 'Character data is required' }, 400);
	}

	if (!playerId) {
		return c.json({ error: 'Player identity is required' }, 400);
	}

	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const serializedCharacter = serializeCharacter(character, playerId, playerEmail);
	const existingCharacter = await db.getCharacterById(character.id);

	if (existingCharacter) {
		await db.updateCharacter(character.id, serializedCharacter);
	} else {
		await db.createCharacter(serializedCharacter);
	}

	const existingMemberships = await db.getGamePlayers(game.id);
	const existingPlayer = existingMemberships.find(player => player.player_id === playerId);
	if (existingPlayer) {
		await db.removePlayerFromGame(game.id, playerId);
	}

	await db.addPlayerToGame({
		game_id: game.id,
		player_id: playerId,
		player_email: playerEmail,
		character_id: character.id,
		character_name: character.name,
		joined_at: Date.now(),
	});

	// Return the game state
	const gameStateService = new GameStateService(db);
	const state = await gameStateService.getState(game);
	return c.json(state);
});

/**
 * Start a game
 * POST /api/games/:inviteCode/start
 *
 * Transitions a game from 'waiting' to 'active' status.
 * Only the host can start a game.
 *
 * @returns Updated game state
 */
core.post('/:inviteCode/start', async (c) => {
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

	try {
		const payload = (await c.req.json().catch(() => ({}))) as { gameState?: Partial<MultiplayerGameState> };
		const gameStateService = new GameStateService(db);
		const state = await gameStateService.startGame(game, payload);
		return c.json(state);
	} catch (error) {
		console.error('Failed to start game:', error);
		return c.json({ error: 'Failed to start game', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

/**
 * Stop a game
 * PATCH /api/games/:inviteCode/stop
 *
 * Transitions a game from 'active' back to 'waiting' status.
 * Only the host can stop a game.
 *
 * @returns Success response
 */
core.patch('/:inviteCode/stop', async (c) => {
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
		return c.json({ error: 'Forbidden - Only the host can stop this game' }, 403);
	}

	// Change game status back to 'waiting' to allow lobby access
	await db.updateGameStatus(game.id, 'waiting');

	return c.json({ ok: true, message: 'Game stopped successfully' });
});

/**
 * Delete a game
 * DELETE /api/games/:inviteCode
 *
 * Permanently deletes a game and all related data.
 * Only the host can delete a game.
 *
 * @returns Success response
 */
core.delete('/:inviteCode', async (c) => {
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
		return c.json({ error: 'Forbidden - Only the host can delete this game' }, 403);
	}

	// Delete the game and all related data
	await db.deleteGame(game.id);

	// Note: Durable Objects are automatically garbage collected after inactivity
	// We don't need to explicitly delete the Durable Object

	return c.json({ ok: true, message: 'Game deleted successfully' });
});

export default core;


