import type { Context } from 'hono';
import { Hono } from 'hono';

import { CharacterRow, Database, GameRow, MapRow, NpcRow } from '../../../shared/workers/db';
import { generateInviteCode, getSessionId, getSessionStub } from '../../../shared/workers/session-manager';
import type { MapState, NpcDefinition } from '../../../shared/workers/types';
import { Character, Quest } from '../../../shared/workers/types';
import type { CloudflareBindings } from '../env';

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
        mapId?: string;
}

interface JoinGameBody {
	inviteCode: string;
	character: Character;
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

const mapRowToState = (row: MapRow | null): MapState | null => {
        if (!row) {
                return null;
        }

        const safeParse = <T>(value: string | null, fallback: T): T => {
                if (!value) return fallback;
                try {
                        return JSON.parse(value) as T;
                } catch {
                        return fallback;
                }
        };

        return {
                id: row.id,
                name: row.name,
                width: row.width,
                height: row.height,
                terrain: safeParse(row.terrain, []),
                fog: safeParse(row.fog, []),
                tokens: [],
                updatedAt: Date.now(),
        } satisfies MapState;
};

const npcRowsToDefinitions = (rows: NpcRow[]): NpcDefinition[] => {
        const safeParse = (value: string | null) => {
                if (!value) return undefined;
                try {
                        return JSON.parse(value);
                } catch {
                        return undefined;
                }
        };

        return rows.map(row => {
                const stats = safeParse(row.stats);
                const abilities = safeParse(row.abilities);
                const metadata = safeParse(row.metadata);
                return {
                        id: row.id,
                        name: row.name,
                        alignment: (row.alignment as NpcDefinition['alignment']) ?? 'friendly',
                        description: row.description ?? undefined,
                        maxHealth: stats?.maxHealth ?? 10,
                        armorClass: stats?.armorClass,
                        attack: abilities?.attack,
                        stats,
                        icon: row.icon ?? undefined,
                        color: row.color ?? metadata?.color,
                        metadata,
                } satisfies NpcDefinition;
        });
};

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
	createdAt: game.created_at,
        updatedAt: game.updated_at,
});

const characterBelongsToUser = (row: CharacterRow, user: Variables['user']) =>
        (!!user?.id && row.player_id === user.id) || (!!user?.email && row.player_email === user.email);

games.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

        const body = (await c.req.json()) as CreateGameBody;
        const { questId, quest, world, startingArea, hostId, hostEmail, mapId } = body;
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
        });

        const availableMaps = await db.getMaps();
        const selectedMapState = mapRowToState(
                availableMaps.find(map => map.id === mapId) ?? availableMaps[0] ?? null,
        );
        const npcDefinitions = npcRowsToDefinitions(await db.getNpcDefinitions());

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
                                mapState: selectedMapState ?? undefined,
                                npcDefinitions,
                        }),
                }),
        );

        if (!initResponse.ok) {
                const details = await initResponse.text();
                return c.json({ error: 'Failed to initialize game session', details }, 500);
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

        const db = new Database(c.env.DATABASE);
        const character = (await c.req.json()) as Character;
        const ownerId = user.id ?? user.email;
        if (!ownerId) {
                return c.json({ error: 'Missing user identity' }, 400);
        }
        const serializedCharacter = serializeCharacter(character, ownerId, user.email ?? null);
        const existing = await db.getCharacterById(character.id);
        if (existing) {
                        await db.updateCharacter(character.id, serializedCharacter);
        } else {
                        await db.createCharacter(serializedCharacter);
        }
        const created = await db.getCharacterById(character.id);
        return c.json({ character: created ? deserializeCharacter(created) : character });
});

games.put('/me/characters/:id', async (c) => {
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
        if (!characterBelongsToUser(existing, user)) {
                return c.json({ error: 'Forbidden' }, 403);
        }
        const body = (await c.req.json()) as Character;
        const ownerId = existing.player_id || user.id || user.email;
        if (!ownerId) {
                return c.json({ error: 'Missing user identity' }, 400);
        }
        const serializedCharacter = serializeCharacter(body, ownerId, existing.player_email || user.email || null);
        await db.updateCharacter(characterId, serializedCharacter);
        const updated = await db.getCharacterById(characterId);
        return c.json({ character: updated ? deserializeCharacter(updated) : body });
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
        if (!characterBelongsToUser(existing, user)) {
                return c.json({ error: 'Forbidden' }, 403);
        }
        await db.deleteCharacter(characterId);
        return c.json({ ok: true });
});

games.get('/:inviteCode', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const sessionStub = getSessionStub(c.env, inviteCode);

	const stateResponse = await sessionStub.fetch(
		buildDurableRequest(c.req.raw, '/state'),
	);

	if (!stateResponse.ok) {
		const details = await stateResponse.text();
		return c.json({ error: 'Failed to fetch session', details }, stateResponse.status);
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
		return c.json({ error: 'Failed to join game', details }, joinResponse.status);
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
		return c.json({ error: 'Failed to fetch game state', details }, stateResponse.status);
	}

        return c.json(await stateResponse.json());
});

games.get('/:inviteCode/map', async (c) => {
        return forwardJsonRequest(c, '/map', { method: 'GET', body: null });
});

games.patch('/:inviteCode/map', async (c) => {
        if (!c.get('user')) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        return forwardJsonRequest(c, '/map', { method: 'PATCH' });
});

games.get('/:inviteCode/map/tokens', async (c) => {
        return forwardJsonRequest(c, '/map/tokens', { method: 'GET', body: null });
});

games.post('/:inviteCode/map/tokens', async (c) => {
        if (!c.get('user')) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        return forwardJsonRequest(c, '/map/tokens');
});

games.delete('/:inviteCode/map/tokens/:tokenId', async (c) => {
        if (!c.get('user')) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const tokenId = c.req.param('tokenId');
        return forwardJsonRequest(c, '/map/tokens', {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', tokenId }),
        });
});

games.get('/:inviteCode/npcs', async (c) => {
        return forwardJsonRequest(c, '/npcs', { method: 'GET', body: null });
});

games.post('/:inviteCode/npcs', async (c) => {
        if (!c.get('user')) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        return forwardJsonRequest(c, '/npcs');
});

games.post('/:inviteCode/characters/:characterId/:action', async (c) => {
        if (!c.get('user')) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const characterId = c.req.param('characterId');
        const action = c.req.param('action');
        return forwardJsonRequest(c, `/characters/${characterId}/${action}`);
});

const forwardJsonRequest = async (
        c: Context<GamesContext>,
        path: string,
        override?: { method?: string; body?: string | null },
) => {
        const sessionStub = getSessionStub(c.env, c.req.param('inviteCode'));
        const method = override?.method ?? c.req.method;
        let body: string | undefined;
        if (override?.body !== undefined) {
                        body = override.body === null ? undefined : override.body;
        } else if (method !== 'GET' && method !== 'HEAD') {
                        body = await c.req.text();
        }

        const headers: Record<string, string> = {};
        if (body) {
                headers['Content-Type'] = c.req.header('Content-Type') || 'application/json';
        }

        const response = await sessionStub.fetch(
                buildDurableRequest(c.req.raw, path, {
                        method,
                        headers,
                        body,
                }),
        );

	if (!response.ok) {
		const details = await response.text();
		return c.json({ error: 'Durable Object request failed', details }, response.status);
	}

	if (response.headers.get('Content-Type')?.includes('application/json')) {
		return c.json(await response.json(), response.status);
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


