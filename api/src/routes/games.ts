import type { Context } from 'hono';
import { Hono } from 'hono';

import { CharacterRow, Database, GameRow, MapRow, NpcInstanceRow } from '../../../shared/workers/db';
import { generateProceduralMap, MapGeneratorPreset } from '../../../shared/workers/map-generator';
import { generateInviteCode, getSessionId, getSessionStub } from '../../../shared/workers/session-manager';
import { Character, Quest } from '../../../shared/workers/types';
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
		base_health: custom.maxHealth ?? 12,
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
				hostId,
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
					playerId: hostId,
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

	return c.json(await stateResponse.json());
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

	const payload = (await c.req.json()) as { id?: string };

	if (payload?.id && payload.id !== game.current_map_id) {
		await db.updateGameMap(game.id, payload.id);
		game.current_map_id = payload.id;
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

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

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
		metadata?: Record<string, unknown>;
	};

	const mapRow = await resolveMapRow(db, game);
	const tokenId = body.id || createId('token');
	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: body.mapId || mapRow.id,
		character_id: body.characterId || null,
		npc_id: body.npcId || null,
		token_type: body.tokenType || 'player',
		label: body.label || null,
		x: body.x,
		y: body.y,
		facing: 0,
		color: body.color || null,
		status: 'idle',
		is_visible: 1,
		hit_points: null,
		max_hit_points: null,
		metadata: JSON.stringify(body.metadata ?? {}),
	});

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
		hit_points: npc.base_health,
		max_hit_points: npc.base_health,
		metadata: npc.metadata,
	});
	await db.saveNpcInstance({
		id: createId('npci'),
		game_id: game.id,
		npc_id: npc.id,
		token_id: tokenId,
		name: payload.label || npc.name,
		disposition: npc.disposition,
		current_health: npc.base_health,
		max_health: npc.base_health,
		status_effects: JSON.stringify([]),
		is_friendly: npc.disposition === 'hostile' ? 0 : 1,
		metadata: JSON.stringify({
			color: npcMetadata.color || payload.customNpc?.color || '#3B2F1B',
			role: npc.role,
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
		statusEffects?: string[];
		isFriendly?: boolean;
		metadata?: Record<string, unknown>;
		name?: string;
	};

	const instance = await db.getNpcInstanceByToken(tokenId);
	if (!instance) {
		return c.json({ error: 'NPC instance not found' }, 404);
	}

	await db.saveNpcInstance({
		...instance,
		name: payload.name ?? instance.name,
		current_health:
			typeof payload.currentHealth === 'number'
				? Math.max(0, Math.min(instance.max_health, payload.currentHealth))
				: instance.current_health,
		status_effects: JSON.stringify(payload.statusEffects ?? JSON.parse(instance.status_effects || '[]')),
		is_friendly:
			typeof payload.isFriendly === 'boolean'
				? (payload.isFriendly ? 1 : 0)
				: instance.is_friendly,
		metadata: JSON.stringify({
			...(JSON.parse(instance.metadata || '{}')),
			...(payload.metadata ?? {}),
		}),
	});

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

games.get('/:inviteCode/ws', async (c) => {
	const sessionStub = getSessionStub(c.env, c.req.param('inviteCode'));
	return sessionStub.fetch(c.req.raw);
});

export default games;


