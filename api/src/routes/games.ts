import type { Context } from 'hono';
import { Hono } from 'hono';

import { CharacterRow, Database, GameRow, MapRow, NpcInstanceRow } from '../../../shared/workers/db';
import { generateProceduralMap, MapGeneratorPreset } from '../../../shared/workers/map-generator';
import { generateInviteCode, getSessionId, getSessionStub } from '../../../shared/workers/session-manager';
import { Character, MultiplayerGameState, Quest } from '../../../shared/workers/types';
import type { CloudflareBindings } from '../env';

import { mapStateFromDb, npcFromDb } from '@/utils/schema-adapters';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

type GamesContext = { Bindings: CloudflareBindings; Variables: Variables };

interface CreateGameBody {
	questId?: string;
	quest?: Quest;
	world: string;
	startingArea: string;
	hostId?: string;
	hostEmail?: string;
	hostCharacter?: Character;
	currentMapId?: string;
}

interface JoinGameBody {
	inviteCode: string;
	characterId?: string;
	character?: Character;
	playerId?: string;
	playerEmail?: string;
}

const games = new Hono<GamesContext>();

const normalizePath = (path: string): string => (path.startsWith('/') ? path : `/${path}`);

const buildDurableRequest = (
	req: Request,
	path: string,
	init?: RequestInit,
): Request => {
	const origin = new URL(req.url).origin;
	return new Request(`${origin}${normalizePath(path)}`, init);
};

const jsonWithStatus = <T>(_: Context<GamesContext>, payload: T, status: number) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const createId = (prefix: string) => {
	if (globalThis.crypto?.randomUUID) {
		return `${prefix}_${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}_${Math.random().toString(36).slice(2)}`;
};

const isHostUser = (game: GameRow, user: Variables['user']) => {
	if (!user) {
		return false;
	}

	if (game.host_id && game.host_id === user.id) {
		return true;
	}

	if (game.host_email && user.email && game.host_email === user.email) {
		return true;
	}

	return false;
};

const resolveMapRow = async (db: Database, game: GameRow): Promise<MapRow> => {
	if (game.current_map_id) {
		const existing = await db.getMapById(game.current_map_id);
		if (existing) {
			return existing;
		}
	}

	const maps = await db.listMaps();
	if (!maps.length) {
		throw new Error('No maps available');
	}

	const fallback = maps[0];
	await db.updateGameMap(game.id, fallback.id);
	return fallback;
};

const buildMapState = async (db: Database, game: GameRow) => {
	const mapRow = await resolveMapRow(db, game);
	const [tiles, tokens] = await Promise.all([
		db.getMapTiles(mapRow.id),
		db.listMapTokensForGame(game.id),
	]);
	return mapStateFromDb(mapRow, { tiles, tokens });
};

const slugifyName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'npc';

const npcInstanceToResponse = (instance: NpcInstanceRow) => ({
	id: instance.id,
	tokenId: instance.token_id,
	npcId: instance.npc_id,
	name: instance.name,
	disposition: instance.disposition,
	currentHealth: instance.current_health,
	maxHealth: instance.max_health,
	statusEffects: JSON.parse(instance.status_effects || '[]'),
	isFriendly: Boolean(instance.is_friendly),
	metadata: JSON.parse(instance.metadata || '{}'),
	updatedAt: instance.updated_at,
});

const createCustomNpcDefinition = async (
	db: Database,
	hostId: string,
	custom: {
		name: string;
		role: string;
		alignment: string;
		disposition: string;
		description?: string;
		maxHealth?: number;
		armorClass?: number;
		challengeRating?: number;
		color?: string;
	},
) => {
	const slug = `${slugifyName(custom.name)}_${hostId.slice(0, 6)}`;
	const npcId = `npc_${slug}_${Date.now()}`;
	const now = Date.now();
	await db.saveNpcDefinition({
		id: npcId,
		slug,
		name: custom.name,
		role: custom.role || 'custom',
		alignment: custom.alignment || 'neutral',
		disposition: custom.disposition || 'neutral',
		description: custom.description ?? null,
		base_health: custom.maxHealth ?? 10,
		base_armor_class: custom.armorClass ?? 12,
		challenge_rating: custom.challengeRating ?? 1,
		archetype: 'custom',
		default_actions: JSON.stringify(['attack']),
		stats: JSON.stringify({}),
		abilities: JSON.stringify([]),
		loot_table: JSON.stringify([]),
		metadata: JSON.stringify({ color: custom.color ?? '#3B2F1B', createdBy: hostId }),
		created_at: now,
		updated_at: now,
	});

	const created = await db.getNpcBySlug(slug);
	if (!created) {
		throw new Error('Failed to create NPC definition');
	}
	return created;
};

const serializeCharacter = (
	character: Character,
	playerId: string,
	playerEmail?: string | null,
) => ({
	id: character.id,
	player_id: playerId,
	player_email: playerEmail || null,
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

const deserializeCharacter = (row: CharacterRow): Character => ({
	id: row.id,
	level: row.level,
	race: row.race,
	name: row.name,
	class: row.class,
	description: row.description || undefined,
	stats: JSON.parse(row.stats),
	skills: JSON.parse(row.skills || '[]'),
	inventory: JSON.parse(row.inventory || '[]'),
	equipped: JSON.parse(row.equipped || '{}'),
	health: row.health,
	maxHealth: row.max_health,
	actionPoints: row.action_points,
	maxActionPoints: row.max_action_points,
});

const parseQuestData = (questJson: string): Quest => {
	try {
		const parsed = JSON.parse(questJson);
		return {
			...parsed,
			objectives: parsed.objectives ?? [],
			createdAt: parsed.createdAt ?? Date.now(),
		} as Quest;
	} catch (error) {
		console.error('Failed to parse quest data:', error);
		throw error;
	}
};

const toGameSummary = (game: GameRow) => ({
	id: game.id,
	inviteCode: game.invite_code,
	status: game.status,
	hostId: game.host_id,
	hostEmail: game.host_email,
	world: game.world,
	startingArea: game.starting_area,
	quest: parseQuestData(game.quest_data),
	currentMapId: game.current_map_id,
	createdAt: game.created_at,
	updatedAt: game.updated_at,
});

games.post('/', async (c) => {
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

	let questData: Quest | null = quest ?? null;
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
	const sessionId = getSessionId(c.env, inviteCode);
	const sessionStub = c.env.GAME_SESSION.get(sessionId);

	const initResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/initialize', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				inviteCode,
				hostId: resolvedHostId,
				quest: questData,
				world,
				startingArea,
			}),
		}),
	);

	if (!initResponse.ok) {
		const details = await initResponse.text();
		return c.json({ error: 'Failed to initialize game session', details }, 500);
	}

	const gameId = sessionId.toString();
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

		const joinResponse = await sessionStub.fetch(
			buildDurableRequest(c.req.raw, '/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					character: hostCharacter,
					playerId: resolvedHostId,
				}),
			}),
		);

		if (!joinResponse.ok) {
			const details = await joinResponse.text();
			return c.json({ error: 'Failed to register host in session', details }, 500);
		}
	}

	const stateResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/state'),
	);

	if (!stateResponse.ok) {
		const details = await stateResponse.text();
		return c.json({ error: 'Failed to load game state', details }, 500);
	}

	return c.json(await stateResponse.json());
});

games.get('/me', async (c) => {
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

games.get('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = new Database(c.env.DATABASE);
	const characterRows = await db.getCharactersByPlayerIdentity(user.id, user.email);

	// Use map to de-duplicate characters that match both ID and email
	const deduped = new Map<string, Character>();
	for (const row of characterRows) {
		deduped.set(row.id, deserializeCharacter(row));
	}

	return c.json({ characters: Array.from(deduped.values()) });
});

games.post('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const payload = (await c.req.json()) as Character;
	const characterId = payload.id || createId('char');
	const db = new Database(c.env.DATABASE);
	const serialized = serializeCharacter(
		{ ...payload, id: characterId },
		user.id,
		user.email,
	);
	await db.createCharacter(serialized);
	const saved = await db.getCharacterById(characterId);
	return c.json({ character: saved ? deserializeCharacter(saved) : payload });
});

games.put('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const updates = (await c.req.json()) as Partial<Character>;
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const serializedUpdate = serializeCharacter(
		{ ...deserializeCharacter(existing), ...updates, id: characterId },
		existing.player_id || user.id,
		existing.player_email || user.email,
	);
	await db.updateCharacter(characterId, serializedUpdate);
	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : updates });
});

games.delete('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await db.deleteCharacter(characterId);
	return c.json({ ok: true });
});

games.patch('/:inviteCode/stop', async (c) => {
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

games.delete('/:inviteCode', async (c) => {
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

games.get('/:inviteCode', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);

	const stateResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/state'),
	);

	if (!stateResponse.ok) {
		const details = await stateResponse.text();
		return jsonWithStatus(c, { error: 'Failed to fetch session', details }, stateResponse.status);
	}

	const sessionData = await stateResponse.json();

	// Add currentMapId, world, and startingArea from database (in case session doesn't have them)
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);
	if (game) {
		sessionData.currentMapId = game.current_map_id;
		// Fallback to database if session doesn't have these
		if (!sessionData.world) {
			sessionData.world = game.world;
		}
		if (!sessionData.startingArea) {
			sessionData.startingArea = game.starting_area;
		}
	}

	return c.json(sessionData);
});

games.post('/:inviteCode/join', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);

	const joinResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ character, playerId }),
		}),
	);

	if (!joinResponse.ok) {
		const details = await joinResponse.text();
		return jsonWithStatus(c, { error: 'Failed to join game', details }, joinResponse.status);
	}

	return c.json(await joinResponse.json());
});

games.get('/:inviteCode/state', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);

	const stateResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/state'),
	);

	if (!stateResponse.ok) {
		const details = await stateResponse.text();
		return jsonWithStatus(c, { error: 'Failed to fetch game state', details }, stateResponse.status);
	}

	return c.json(await stateResponse.json());
});

games.get('/:inviteCode/map', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	try {
		// Clean up duplicate tokens before building map state
		const mapRow = await resolveMapRow(db, game);
		const duplicatesRemoved = await db.removeDuplicateTokens(game.id, mapRow.id);
		if (duplicatesRemoved > 0) {
			console.log(`Removed ${duplicatesRemoved} duplicate token(s) when loading map for game ${game.id}`);
		}

		const mapState = await buildMapState(db, game);
		return c.json(mapState);
	} catch (error) {
		console.error('Failed to build map state:', error);
		return c.json({ error: 'Failed to load map' }, 500);
	}
});

games.patch('/:inviteCode/map', async (c) => {
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

	const payload = (await c.req.json()) as { id?: string; mapId?: string };

	// Support both 'id' and 'mapId' for backward compatibility
	const mapId = payload?.mapId || payload?.id;

	if (mapId && mapId !== game.current_map_id) {
		// Verify the map exists
		const map = await db.getMapById(mapId);
		if (!map) {
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

games.post('/:inviteCode/map/generate', async (c) => {
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

games.post('/:inviteCode/map/terrain', async (c) => {
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

games.get('/:inviteCode/map/tokens', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/characters', async (c) => {
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

	const memberships = await db.getGamePlayers(game.id);
	const characters = await Promise.all(
		memberships.map(async membership => {
			const row = await db.getCharacterById(membership.character_id);
			return row ? deserializeCharacter(row) : null;
		}),
	);

	return c.json({ characters: characters.filter((character): character is Character => Boolean(character)) });
});

games.post('/:inviteCode/map/tokens', async (c) => {
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
			const sessionStub = getSessionStub(c.env, inviteCode);
			const stateResponse = await sessionStub.fetch(
				buildDurableRequest(c.req.raw, '/state'),
			);

			if (stateResponse.ok) {
				const gameState = await stateResponse.json() as MultiplayerGameState;
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
			} else {
				// If we can't fetch game state, allow the move (fail open for now)
				// This prevents blocking movement if the durable object is unavailable
				console.warn('[Token Save] Could not fetch game state, allowing move:', stateResponse.status);
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

	const mapRow = await resolveMapRow(db, game);

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

	// Build metadata for elements
	const metadata = body.metadata || {};
	if (body.tokenType === 'element' && body.elementType) {
		metadata.elementType = body.elementType;
	}

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: body.mapId || mapRow.id,
		character_id: body.tokenType === 'element' ? null : body.characterId || null,
		npc_id: body.tokenType === 'element' ? null : body.npcId || null,
		token_type: body.tokenType || 'player',
		label: body.label || (body.tokenType === 'element' ? body.elementType || null : null) || null,
		x: body.x,
		y: body.y,
		facing: 0,
		color: body.color || null,
		status: 'idle',
		is_visible: 1,
		hit_points: null,
		max_hit_points: null,
		metadata: JSON.stringify(metadata),
	});

	// Clean up any duplicate tokens that may exist
	const duplicatesRemoved = await db.removeDuplicateTokens(game.id, body.mapId || mapRow.id);
	if (duplicatesRemoved > 0) {
		console.log(`Removed ${duplicatesRemoved} duplicate token(s) for game ${game.id}`);
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.delete('/:inviteCode/map/tokens/:tokenId', async (c) => {
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

	await db.deleteMapToken(tokenId);
	await db.deleteNpcInstanceByToken(tokenId);
	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/npcs', async (c) => {
	const db = new Database(c.env.DATABASE);
	const npcRows = await db.listNpcDefinitions();
	return c.json({ npcs: npcRows.map(npcFromDb) });
});

games.get('/:inviteCode/npcs/:npcId', async (c) => {
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

games.post('/:inviteCode/npcs', async (c) => {
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
		customNpc?: {
			name: string;
			role: string;
			alignment: string;
			disposition: string;
			description?: string;
			maxHealth?: number;
			armorClass?: number;
			color?: string;
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

	// Use DM override if provided, otherwise default to 10/10 for health, 3/3 for AP
	const maxHealth = payload.maxHealth ?? npc.base_health ?? 10;
	const currentHealth = maxHealth;
	const actionPoints = payload.actionPoints ?? 3;
	const maxActionPoints = 3;

	// Store action points in metadata
	const tokenMetadata = {
		...(JSON.parse(npc.metadata || '{}')),
		actionPoints,
		maxActionPoints,
	};

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: mapRow.id,
		character_id: null,
		npc_id: npc.id,
		token_type: 'npc',
		label: payload.label || npc.name,
		x: payload.x,
		y: payload.y,
		facing: 0,
		color: npcMetadata.color || '#3B2F1B',
		status: npc.disposition,
		is_visible: 1,
		hit_points: currentHealth,
		max_hit_points: maxHealth,
		metadata: JSON.stringify(tokenMetadata),
	});

	// Clean up any duplicate tokens that may exist
	const duplicatesRemoved = await db.removeDuplicateTokens(game.id, mapRow.id);
	if (duplicatesRemoved > 0) {
		console.log(`Removed ${duplicatesRemoved} duplicate token(s) after placing NPC for game ${game.id}`);
	}

	await db.saveNpcInstance({
		id: createId('npci'),
		game_id: game.id,
		npc_id: npc.id,
		token_id: tokenId,
		name: payload.label || npc.name,
		disposition: npc.disposition,
		current_health: currentHealth,
		max_health: maxHealth,
		status_effects: JSON.stringify([]),
		is_friendly: npc.disposition === 'hostile' ? 0 : 1,
		metadata: JSON.stringify({
			color: npcMetadata.color || payload.customNpc?.color || '#3B2F1B',
			role: npc.role,
			actionPoints,
			maxActionPoints,
		}),
	});

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/npc-instances', async (c) => {
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

	const instances = await db.listNpcInstances(game.id);
	return c.json({ instances: instances.map(npcInstanceToResponse) });
});

games.patch('/:inviteCode/npcs/:tokenId', async (c) => {
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

	const instance = await db.getNpcInstanceByToken(tokenId);
	if (!instance) {
		return c.json({ error: 'NPC instance not found' }, 404);
	}

	const maxHealth = typeof payload.maxHealth === 'number' ? payload.maxHealth : instance.max_health;
	const currentHealth =
		typeof payload.currentHealth === 'number'
			? Math.max(0, Math.min(maxHealth, payload.currentHealth))
			: instance.current_health;

	const instanceMetadata = JSON.parse(instance.metadata || '{}');
	const actionPoints = typeof payload.actionPoints === 'number' ? payload.actionPoints : (instanceMetadata.actionPoints ?? 3);
	const maxActionPoints = typeof payload.maxActionPoints === 'number' ? payload.maxActionPoints : (instanceMetadata.maxActionPoints ?? 3);

	await db.saveNpcInstance({
		...instance,
		name: payload.name ?? instance.name,
		current_health: currentHealth,
		max_health: maxHealth,
		status_effects: JSON.stringify(payload.statusEffects ?? JSON.parse(instance.status_effects || '[]')),
		is_friendly:
			typeof payload.isFriendly === 'boolean'
				? (payload.isFriendly ? 1 : 0)
				: instance.is_friendly,
		metadata: JSON.stringify({
			...instanceMetadata,
			actionPoints,
			maxActionPoints,
			...(payload.metadata ?? {}),
		}),
	});

	// Also update the token's hit points and metadata
	const tokens = await db.listMapTokensForGame(game.id);
	const token = tokens.find(t => t.id === tokenId);
	if (token) {
		const tokenMetadata = JSON.parse(token.metadata || '{}');
		await db.saveMapToken({
			...token,
			hit_points: currentHealth,
			max_hit_points: maxHealth,
			metadata: JSON.stringify({
				...tokenMetadata,
				actionPoints,
				maxActionPoints,
			}),
		});
	}

	const refreshed = await db.getNpcInstanceByToken(tokenId);
	return c.json({ instance: refreshed ? npcInstanceToResponse(refreshed) : null });
});

games.post('/:inviteCode/characters/:characterId/:action', async (c) => {
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

	const characterId = c.req.param('characterId');
	const action = c.req.param('action');
	const body = (await c.req.json().catch(() => ({}))) as { amount?: number };
	const amount = typeof body.amount === 'number' ? body.amount : 0;

	const characterRow = await db.getCharacterById(characterId);
	if (!characterRow) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (action === 'damage') {
		const nextHealth = Math.max(0, characterRow.health - Math.max(0, amount));
		await db.updateCharacter(characterId, { health: nextHealth });
	} else if (action === 'heal') {
		const nextHealth = Math.min(
			characterRow.max_health,
			characterRow.health + Math.max(0, amount),
		);
		await db.updateCharacter(characterId, { health: nextHealth });
	} else {
		return c.json({ error: 'Unsupported action' }, 400);
	}

	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : null });
});

games.post('/:inviteCode/characters/:characterId/actions', async (c) => {
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

	// DM can cast for any character, players can only cast for themselves
	const characterId = c.req.param('characterId');
	const isHost = isHostUser(game, user);

	if (!isHost) {
		// Check if this is the player's own character
		const characterRow = await db.getCharacterById(characterId);
		if (!characterRow || characterRow.player_id !== user.id) {
			return c.json({ error: 'Forbidden' }, 403);
		}
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		actionType: 'cast_spell' | 'basic_attack' | 'use_item' | 'heal_potion';
		spellName?: string;
		targetId?: string;
		itemId?: string;
		params?: Record<string, unknown>;
	};

	if (!body.actionType) {
		return c.json({ error: 'actionType is required' }, 400);
	}

	const characterRow = await db.getCharacterById(characterId);
	if (!characterRow) {
		return c.json({ error: 'Character not found' }, 404);
	}

	const character = deserializeCharacter(characterRow);

	// Validate action points
	const actionPointCost = body.actionType === 'cast_spell' ? 2 : body.actionType === 'basic_attack' ? 1 : 1;
	if (character.actionPoints < actionPointCost) {
		return c.json({ error: 'Not enough action points' }, 400);
	}

	// Update character action points
	const updatedActionPoints = character.actionPoints - actionPointCost;
	await db.updateCharacter(characterId, { actionPoints: updatedActionPoints });

	// Log the action to database
	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'action',
			timestamp: Date.now(),
			description: `${character.name} performed ${body.actionType}${body.spellName ? `: ${body.spellName}` : ''}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				characterId,
				actionType: body.actionType,
				spellName: body.spellName,
				targetId: body.targetId,
				itemId: body.itemId,
				params: body.params,
			}),
		});
	} catch (error) {
		console.error('Failed to log action:', error);
		// Continue anyway - action was successful
	}

	const updated = await db.getCharacterById(characterId);
	return c.json({
		character: updated ? deserializeCharacter(updated) : null,
		actionPerformed: body.actionType,
	});
});

const forwardJsonRequest = async (c: Context<GamesContext>, path: string) => {
	const body = await c.req.text();
	const sessionStub = getSessionStub(c.env, c.req.param('inviteCode'));

	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, path, {
			method: c.req.method,
			headers: {
				'Content-Type': c.req.header('Content-Type') || 'application/json',
			},
			body,
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Durable Object request failed', details }, response.status);
	}

	if (response.headers.get('Content-Type')?.includes('application/json')) {
		return jsonWithStatus(c, await response.json(), response.status);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
};

games.post('/:inviteCode/action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	return forwardJsonRequest(c, '/action');
});

games.post('/:inviteCode/dm-action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	return forwardJsonRequest(c, '/dm-action');
});

games.post('/:inviteCode/start', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	return forwardJsonRequest(c, '/start');
});

games.post('/:inviteCode/initiative/roll', async (c) => {
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

	// Get all NPC instances on the map
	const npcInstances = await db.listNpcInstances(game.id);
	const npcTokens = await db.listMapTokensForGame(game.id);

	// Fetch NPC definitions for all NPCs on the map
	const npcs = await Promise.all(
		npcInstances.map(async instance => {
			const token = npcTokens.find(t => t.id === instance.token_id);
			if (!token) return null;

			// Get npc_id from either the token or the instance
			const npcId = token.npc_id || instance.npc_id;
			if (!npcId) return null;

			// Fetch the actual NPC definition from the database
			const npcDef = await db.getNpcById(npcId);
			if (!npcDef) return null;

			// Get stats from the NPC definition (stats field is JSON string)
			const stats = JSON.parse(npcDef.stats || '{}');
			if (!stats.DEX) {
				stats.DEX = 10; // Default DEX if not set
			}

			return {
				id: instance.id,
				entityId: token.id,
				stats,
			};
		}),
	);

	const validNpcs = npcs.filter((n): n is { id: string; entityId: string; stats: { DEX: number } } => Boolean(n));

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/initiative/roll', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				characters: validCharacters.map(c => ({ id: c.id, stats: c.stats })),
				npcs: validNpcs,
			}),
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to roll initiative', details }, response.status);
	}

	const gameState = await response.json() as MultiplayerGameState;

	// Log detailed initiative roll to database
	try {
		if (gameState.initiativeOrder && gameState.initiativeOrder.length > 0) {
			// Get NPC tokens for name lookup
			const npcTokens = await db.listMapTokensForGame(game.id);

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

	return jsonWithStatus(c, gameState, response.status);
});

games.post('/:inviteCode/turn/interrupt', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/turn/interrupt', {
			method: 'POST',
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to interrupt turn', details }, response.status);
	}

	return jsonWithStatus(c, await response.json(), response.status);
});

games.post('/:inviteCode/turn/resume', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/turn/resume', {
			method: 'POST',
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to resume turn', details }, response.status);
	}

	return jsonWithStatus(c, await response.json(), response.status);
});

games.post('/:inviteCode/turn/end', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/turn/end', {
			method: 'POST',
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to end turn', details }, response.status);
	}

	const gameState = await response.json() as MultiplayerGameState;

	// Log turn end to database
	try {
		const currentTurn = gameState.activeTurn;
		const characterName = gameState.characters.find(c => c.id === currentTurn?.entityId)?.name || 'Unknown';
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
				entityId: currentTurn?.entityId,
				entityType: currentTurn?.type,
				turnNumber: currentTurn?.turnNumber,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn end:', error);
		// Continue anyway
	}

	return jsonWithStatus(c, gameState, response.status);
});

games.post('/:inviteCode/turn/start', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/turn/start', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to start turn', details }, response.status);
	}

	const gameState = await response.json() as MultiplayerGameState;

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

	return jsonWithStatus(c, gameState, response.status);
});

games.post('/:inviteCode/turn/next', async (c) => {
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

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/turn/next', {
			method: 'POST',
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to skip to next turn', details }, response.status);
	}

	const gameState = await response.json() as MultiplayerGameState;

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

	return jsonWithStatus(c, gameState, response.status);
});

games.post('/:inviteCode/dice/roll', async (c) => {
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

	const body = (await c.req.json().catch(() => ({}))) as {
		notation: string;
		advantage?: boolean;
		disadvantage?: boolean;
		purpose?: string;
	};

	const sessionStub = getSessionStub(c.env, inviteCode);
	const response = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/dice/roll', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	);

	if (!response.ok) {
		const details = await response.text();
		return jsonWithStatus(c, { error: 'Failed to roll dice', details }, response.status);
	}

	const rollResult = await response.json() as { notation: string; total: number; rolls: number[]; breakdown: string };

	// Log dice roll to database
	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${user.name || 'Player'} rolled ${body.notation}${body.purpose ? ` for ${body.purpose}` : ''}: ${rollResult.total}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				notation: body.notation,
				purpose: body.purpose,
				total: rollResult.total,
				rolls: rollResult.rolls,
				breakdown: rollResult.breakdown,
				advantage: body.advantage,
				disadvantage: body.disadvantage,
			}),
		});
	} catch (error) {
		console.error('Failed to log dice roll:', error);
		// Continue anyway
	}

	return jsonWithStatus(c, rollResult, response.status);
});

games.get('/:inviteCode/ws', async (c) => {
	const sessionStub = getSessionStub(c.env, c.req.param('inviteCode'));
	return sessionStub.fetch(c.req.raw);
});

// Activity log routes
games.get('/:inviteCode/log', async (c) => {
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

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const limit = parseInt(c.req.query('limit') || '100', 10);
	const offset = parseInt(c.req.query('offset') || '0', 10);

	const logs = await db.getActivityLogs(inviteCode, limit, offset);
	return c.json({ logs });
});

games.post('/:inviteCode/log', async (c) => {
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

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json()) as {
		type: string;
		description: string;
		data?: Record<string, unknown>;
		actorId?: string;
		actorName?: string;
	};

	if (!body.type || !body.description) {
		return c.json({ error: 'type and description are required' }, 400);
	}

	const logId = createId('log');
	await db.saveActivityLog({
		id: logId,
		game_id: game.id,
		invite_code: inviteCode,
		type: body.type,
		timestamp: Date.now(),
		description: body.description,
		actor_id: body.actorId || user.id,
		actor_name: body.actorName || user.name || user.email || null,
		data: body.data ? JSON.stringify(body.data) : null,
	});

	return c.json({ id: logId, success: true });
});

games.delete('/:inviteCode/log', async (c) => {
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

	// Only host can clear activity logs
	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Delete all activity logs for this game
	await db.deleteActivityLogs(game.id);

	return c.json({ success: true });
});

export default games;


