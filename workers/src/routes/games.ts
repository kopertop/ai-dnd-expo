/**
 * Game Routes
 *
 * Handles game creation, joining, state management, and WebSocket connections
 */

import { Hono } from 'hono';

import { Database } from '../db';
import type { Env } from '../env';
import { requireAuth } from '../middleware/auth';
import { generateInviteCode, getSessionStub } from '../session-manager';
import { Quest } from '../types';

const games = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string; name?: string | null } | null } }>();

// Apply auth middleware to all game routes
games.use('*', requireAuth);

// POST /api/games - Create new game
games.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = await c.req.json();
	const { questId, quest, world, startingArea, hostCharacter } = body;
	const db = new Database(c.env.DB);

	// Use quest from request body if provided, otherwise try to load from KV
	let questData: Quest;
	if (quest) {
		questData = quest;
	} else if (questId) {
		const kvQuestData = await c.env.QUESTS.get(questId);
		if (!kvQuestData) {
			return c.json({ error: 'Quest not found. Please provide quest data in the request body.' }, 404);
		}
		questData = JSON.parse(kvQuestData);
	} else {
		return c.json({ error: 'Quest ID or quest data is required' }, 400);
	}

	// Generate invite code
	const inviteCode = generateInviteCode();
	const sessionStub = getSessionStub(c.env, inviteCode);

	// Initialize session
	const requestUrl = new URL(c.req.url);
	const baseOrigin = requestUrl.origin;

	const initRequest = new Request(`${baseOrigin}/initialize`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			inviteCode,
			hostId: user.id,
			quest: questData,
			world,
			startingArea,
		}),
	});

	const initResponse = await sessionStub.fetch(initRequest);
	if (!initResponse.ok) {
		const errorText = await initResponse.text();
		console.error('Failed to initialize session:', errorText);
		return c.json({ error: 'Failed to initialize game session', details: errorText }, 500);
	}

	// Save game to database
	const gameId = sessionStub.id.toString();
	await db.createGame({
		id: gameId,
		invite_code: inviteCode,
		host_id: user.id,
		host_email: user.email,
		quest_id: questData.id,
		quest_data: JSON.stringify(questData),
		world,
		starting_area: startingArea,
		status: 'waiting',
	});

	// Add host's character if provided
	if (hostCharacter) {
		await db.createCharacter({
			id: hostCharacter.id,
			player_id: user.id,
			player_email: user.email,
			name: hostCharacter.name,
			level: hostCharacter.level,
			race: hostCharacter.race,
			class: hostCharacter.class,
			description: hostCharacter.description || null,
			stats: JSON.stringify(hostCharacter.stats),
			skills: JSON.stringify(hostCharacter.skills || []),
			inventory: JSON.stringify(hostCharacter.inventory || []),
			equipped: JSON.stringify(hostCharacter.equipped || {}),
			health: hostCharacter.health,
			max_health: hostCharacter.maxHealth,
			action_points: hostCharacter.actionPoints,
			max_action_points: hostCharacter.maxActionPoints,
		});

		await db.addPlayerToGame({
			game_id: gameId,
			player_id: user.id,
			player_email: user.email,
			character_id: hostCharacter.id,
			character_name: hostCharacter.name,
			joined_at: Date.now(),
		});

		await sessionStub.fetch(
			new Request(`${baseOrigin}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					character: hostCharacter,
					playerId: user.id,
				}),
			}),
		);
	}

	// Get session info
	const sessionResponse = await sessionStub.fetch(
		new Request(`${baseOrigin}/state`),
	);
	const sessionData = await sessionResponse.json();

	return c.json(sessionData);
});

// GET /api/games/:inviteCode - Get game session info
games.get('/:inviteCode', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);

	const response = await sessionStub.fetch(
		new Request(`${c.req.url}/state`),
	);
	const data = await response.json();
	return c.json(data);
});

// POST /api/games/:inviteCode/join - Join game
games.post('/:inviteCode/join', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const body = await c.req.json();
	const { character } = body;
	const db = new Database(c.env.DB);

	// Get game from database
	const game = await db.getGameByInviteCode(inviteCode);
	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Save character to database
	await db.createCharacter({
		id: character.id,
		player_id: user.id,
		player_email: user.email,
		name: character.name,
		level: character.level,
		race: character.race,
		class: character.class,
		description: character.description || null,
		stats: JSON.stringify(character.stats),
		skills: JSON.stringify(character.skills || []),
		inventory: JSON.stringify(character.inventory || []),
		equipped: JSON.stringify(character.equipped || {}),
		health: character.health,
		max_health: character.maxHealth,
		action_points: character.actionPoints,
		max_action_points: character.maxActionPoints,
	});

	// Add player to game
	await db.addPlayerToGame({
		game_id: game.id,
		player_id: user.id,
		player_email: user.email,
		character_id: character.id,
		character_name: character.name,
		joined_at: Date.now(),
	});

	const sessionStub = getSessionStub(c.env, inviteCode);
	const url = new URL(c.req.url);
	const doRequest = new Request(`${url.origin}/join`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ character, playerId: user.id }),
	});
	const response = await sessionStub.fetch(doRequest);
	const data = await response.json();
	return c.json(data);
});

// GET /api/games/:inviteCode/state - Poll game state
games.get('/:inviteCode/state', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);
	const url = new URL(c.req.url);
	const response = await sessionStub.fetch(
		new Request(`${url.origin}/state`),
	);
	const data = await response.json();
	return c.json(data);
});

// POST /api/games/:inviteCode/action - Player action
games.post('/:inviteCode/action', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(c.req.raw);
	const data = await response.json();
	return c.json(data);
});

// POST /api/games/:inviteCode/dm-action - DM action
games.post('/:inviteCode/dm-action', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(c.req.raw);
	const data = await response.json();
	return c.json(data);
});

// POST /api/games/:inviteCode/start - Start game
games.post('/:inviteCode/start', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(c.req.raw);
	const data = await response.json();
	return c.json(data);
});

// WS /api/games/:inviteCode/ws - WebSocket connection
games.get('/:inviteCode/ws', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);
	return sessionStub.fetch(c.req.raw);
});

export default games;


