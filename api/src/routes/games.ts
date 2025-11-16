import type { Context } from 'hono';
import { Hono } from 'hono';

import { CharacterRow, Database, GameRow, GameStateRow, MapRow, MapTileRow, MapTokenRow, NpcRow } from '../../../shared/workers/db';
import { generateInviteCode, getSessionId, getSessionStub } from '../../../shared/workers/session-manager';
import type { Character, MapState, MapTokenState, Quest } from '../../../shared/workers/types';
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

const parseJsonColumn = <T>(value: string | null | undefined, fallback: T): T => {
        if (!value) return fallback;
        try {
                return JSON.parse(value) as T;
        } catch (error) {
                console.error('Failed to parse JSON column', error);
                return fallback;
        }
};

const mapTokenFromRow = (row: MapTokenRow): MapTokenState => ({
        id: row.id,
        label: row.label,
        type: (row.token_type as MapTokenState['type']) ?? 'object',
        referenceId: row.reference_id ?? undefined,
        characterId: row.reference_id ?? undefined,
        x: row.x,
        y: row.y,
        elevation: row.elevation ?? undefined,
        icon: row.icon ?? undefined,
        color: row.color ?? undefined,
        metadata: parseJsonColumn<Record<string, unknown> | undefined>(row.metadata, undefined),
});

const buildMapStatePayload = (
        mapRow: MapRow,
        tiles: MapTileRow[],
        tokens: MapTokenRow[],
        persistedState?: Partial<MapState> | null,
): MapState => {
        const tilePayload = tiles.map(tile => ({
                x: tile.x,
                y: tile.y,
                terrain: tile.terrain,
                elevation: tile.elevation ?? undefined,
                isBlocked: Boolean(tile.is_blocked),
                hasFog: Boolean(tile.has_fog),
        }));

        const base: MapState = {
                id: persistedState?.id ?? mapRow.id,
                mapId: mapRow.id,
                name: persistedState?.name ?? mapRow.name,
                width: mapRow.width,
                height: mapRow.height,
                gridSize: mapRow.grid_size,
                terrain: persistedState?.terrain ?? mapRow.terrain,
                fogOfWar: persistedState?.fogOfWar ?? mapRow.fog,
                tiles: persistedState?.tiles ?? tilePayload,
                tokens: tokens.map(mapTokenFromRow),
                updatedAt: persistedState?.updatedAt ?? Date.now(),
        };

        return base;
};

const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const defaultStatBlock = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

const toNpcDefinition = (row: NpcRow) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        role: row.role as 'hostile' | 'friendly' | 'vendor',
        alignment: row.alignment ?? undefined,
        description: row.description ?? undefined,
        stats: parseJsonColumn(row.stats, defaultStatBlock),
        maxHealth: row.max_health,
        abilities: parseJsonColumn<string[]>(row.abilities, []),
        metadata: parseJsonColumn<Record<string, unknown> | undefined>(row.metadata, undefined),
});

const loadMapStateForGame = async (
        db: Database,
        game: GameRow,
        preferredMapId?: string,
): Promise<{ map: MapState; persisted: GameStateRow | null } | null> => {
        const stateRow = await db.getGameState(game.id);
        const activeMapId = preferredMapId || stateRow?.active_map_id || undefined;

        let targetMap: MapRow | null = null;
        if (activeMapId) {
                targetMap = await db.getMapById(activeMapId);
        }

        if (!targetMap) {
                const available = await db.listMaps();
                targetMap = available[0] ?? null;
        }

        if (!targetMap) {
                return null;
        }

        const tiles = await db.getMapTiles(targetMap.id);
        const tokens = await db.getMapTokensForGame(game.id);
        const persistedState = stateRow?.map_state
                ? parseJsonColumn<Partial<MapState>>(stateRow.map_state, null)
                : null;
        const mapState = buildMapStatePayload(targetMap, tiles, tokens, persistedState ?? undefined);
        return { map: mapState, persisted: stateRow || null };
};

const mutateCharacterRecord = async (
        c: Context<GamesContext>,
        inviteCode: string,
        characterId: string,
        mutation: { type: 'damage' | 'heal' | 'update'; amount?: number; updates?: Partial<Character> },
) => {
        const db = new Database(c.env.DATABASE);
        const existing = await db.getCharacterById(characterId);
        if (!existing) {
                throw new Error('Character not found');
        }

        let character = deserializeCharacter(existing);

        if (mutation.type === 'damage' || mutation.type === 'heal') {
                const delta = mutation.amount ?? 0;
                const signedDelta = mutation.type === 'damage' ? -Math.abs(delta) : Math.abs(delta);
                const nextHealth = Math.min(
                        character.maxHealth,
                        Math.max(0, character.health + signedDelta),
                );
                character = {
                        ...character,
                        health: nextHealth,
                };
        }

        if (mutation.type === 'update' && mutation.updates) {
                character = {
                        ...character,
                        ...mutation.updates,
                } as Character;
        }

        const ownerId = existing.player_id || c.get('user')?.id || 'system';
        const ownerEmail = existing.player_email || c.get('user')?.email || null;

        await db.updateCharacter(
                characterId,
                serializeCharacter(character, ownerId, ownerEmail),
        );

        try {
                await proxyDurableRequest(c, inviteCode, '/characters', {
                        type: mutation.type,
                        characterId,
                        amount: mutation.amount,
                        updates: mutation.updates,
                        snapshot: character,
                });
        } catch (error) {
                console.error('Failed to sync character mutation', error);
        }

        return character;
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

games.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

        const body = (await c.req.json()) as CreateGameBody;
        const { questId, quest, world, startingArea, hostId, hostEmail } = body;
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
	});

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

games.post('/me/characters', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const payload = (await c.req.json()) as Character;
        const db = new Database(c.env.DATABASE);
        const resolvedCharacter: Character = {
                ...payload,
                id: payload.id || generateId('char'),
        };

        await db.createCharacter(
                serializeCharacter(resolvedCharacter, user.id, user.email || null),
        );

        return c.json({ character: resolvedCharacter }, 201);
});

games.put('/me/characters/:characterId', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const characterId = c.req.param('characterId');
        const updates = (await c.req.json()) as Partial<Character>;
        const db = new Database(c.env.DATABASE);
        const existing = await db.getCharacterById(characterId);

        if (!existing) {
                return c.json({ error: 'Character not found' }, 404);
        }

        const merged: Character = {
                ...deserializeCharacter(existing),
                ...updates,
        };

        await db.updateCharacter(
                characterId,
                serializeCharacter(merged, existing.player_id || user.id, existing.player_email || user.email || null),
        );

        return c.json({ character: merged });
});

games.delete('/me/characters/:characterId', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const characterId = c.req.param('characterId');
        const db = new Database(c.env.DATABASE);
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
        const playerId = body.playerId || user.id;
        const playerEmail = body.playerEmail || user.email || null;
        let character = body.character;

        if (body.characterId && !character) {
                const existing = await db.getCharacterById(body.characterId);
                if (!existing) {
                        return c.json({ error: 'Character not found' }, 404);
                }
                character = deserializeCharacter(existing);
        }

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

games.get('/:inviteCode/map', async c => {
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

        const mapPayload = await loadMapStateForGame(db, game);
        if (!mapPayload) {
                return c.json({ error: 'No maps available' }, 404);
        }

        return c.json({ map: mapPayload.map });
});

games.post('/:inviteCode/map', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const inviteCode = c.req.param('inviteCode');
        const payload = (await c.req.json()) as Partial<MapState> & { mapId?: string };
        const db = new Database(c.env.DATABASE);
        const game = await db.getGameByInviteCode(inviteCode);
        if (!game) {
                return c.json({ error: 'Game not found' }, 404);
        }

        const mapPayload = await loadMapStateForGame(db, game, payload.mapId);
        if (!mapPayload) {
                return c.json({ error: 'No maps available' }, 404);
        }

        const updatedMap: MapState = {
                ...mapPayload.map,
                ...payload,
                updatedAt: Date.now(),
        };

        await db.saveGameState(
                game.id,
                mapPayload.persisted?.state_data ?? JSON.stringify({}),
                {
                        activeMapId: updatedMap.mapId ?? mapPayload.map.mapId ?? mapPayload.map.id,
                        mapState: JSON.stringify(updatedMap),
                },
        );

        await proxyDurableRequest(c, inviteCode, '/map', { map: updatedMap });

        return c.json({ map: updatedMap });
});

games.get('/:inviteCode/map/tokens', async c => {
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
        const tokens = await db.getMapTokensForGame(game.id);
        return c.json({ tokens: tokens.map(mapTokenFromRow) });
});

games.post('/:inviteCode/map/tokens', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const inviteCode = c.req.param('inviteCode');
        const payload = (await c.req.json()) as {
                mapId?: string;
                label: string;
                type: MapTokenState['type'];
                referenceId?: string;
                x: number;
                y: number;
                color?: string;
                icon?: string;
                metadata?: Record<string, unknown>;
        };

        const db = new Database(c.env.DATABASE);
        const game = await db.getGameByInviteCode(inviteCode);
        if (!game) {
                return c.json({ error: 'Game not found' }, 404);
        }

        const mapPayload = await loadMapStateForGame(db, game, payload.mapId);
        if (!mapPayload) {
                return c.json({ error: 'No maps available' }, 404);
        }

        const tokenId = generateId('token');
        await db.createMapToken({
                id: tokenId,
                game_id: game.id,
                map_id: payload.mapId ?? mapPayload.map.mapId ?? mapPayload.map.id,
                token_type: payload.type,
                reference_id: payload.referenceId || null,
                label: payload.label,
                x: payload.x,
                y: payload.y,
                elevation: null,
                color: payload.color || null,
                icon: payload.icon || null,
                metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        });

        const inserted = await db.getMapToken(tokenId);
        const token = inserted ? mapTokenFromRow(inserted) : null;
        if (token) {
                await proxyDurableRequest(c, inviteCode, '/map/tokens', { action: 'create', token });
        }

        return c.json({ token });
});

games.put('/:inviteCode/map/tokens/:tokenId', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const inviteCode = c.req.param('inviteCode');
        const tokenId = c.req.param('tokenId');
        const payload = (await c.req.json()) as Partial<{
                label: string;
                x: number;
                y: number;
                color: string;
                icon: string;
                metadata: Record<string, unknown>;
        }>;
        const db = new Database(c.env.DATABASE);
        const existing = await db.getMapToken(tokenId);
        if (!existing) {
                return c.json({ error: 'Token not found' }, 404);
        }

        await db.updateMapToken(tokenId, {
                label: payload.label ?? existing.label,
                x: payload.x ?? existing.x,
                y: payload.y ?? existing.y,
                color: payload.color ?? existing.color,
                icon: payload.icon ?? existing.icon,
                metadata: payload.metadata ? JSON.stringify(payload.metadata) : existing.metadata,
        });

        const updated = await db.getMapToken(tokenId);
        if (updated) {
                const token = mapTokenFromRow(updated);
                await proxyDurableRequest(c, inviteCode, '/map/tokens', { action: 'update', token });
                return c.json({ token });
        }

        return c.json({ ok: true });
});

games.delete('/:inviteCode/map/tokens/:tokenId', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const inviteCode = c.req.param('inviteCode');
        const tokenId = c.req.param('tokenId');
        const db = new Database(c.env.DATABASE);
        await db.deleteMapToken(tokenId);
        await proxyDurableRequest(c, inviteCode, '/map/tokens', { action: 'delete', tokenId });
        return c.json({ ok: true });
});

games.get('/:inviteCode/npcs', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }
        const db = new Database(c.env.DATABASE);
        const npcs = await db.listNpcDefinitions();
        return c.json({ npcs: npcs.map(toNpcDefinition) });
});

games.post('/:inviteCode/npcs', async c => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const inviteCode = c.req.param('inviteCode');
        const payload = (await c.req.json()) as {
                npcId: string;
                mapId?: string;
                label?: string;
                position: { x: number; y: number };
        };

        const db = new Database(c.env.DATABASE);
        const game = await db.getGameByInviteCode(inviteCode);
        if (!game) {
                return c.json({ error: 'Game not found' }, 404);
        }

        const npcRow = (await db.listNpcDefinitions()).find(npc => npc.id === payload.npcId);
        if (!npcRow) {
                return c.json({ error: 'NPC not found' }, 404);
        }

        const mapPayload = await loadMapStateForGame(db, game, payload.mapId);
        if (!mapPayload) {
                return c.json({ error: 'No maps available' }, 404);
        }

        const npcTokenId = generateId('npc');
        const metadata = {
                npcId: npcRow.id,
                role: npcRow.role,
        };

        await db.createMapToken({
                id: npcTokenId,
                game_id: game.id,
                map_id: payload.mapId ?? mapPayload.map.mapId ?? mapPayload.map.id,
                token_type: 'npc',
                reference_id: npcRow.id,
                label: payload.label || npcRow.name,
                x: payload.position.x,
                y: payload.position.y,
                elevation: null,
                color: null,
                icon: null,
                metadata: JSON.stringify(metadata),
        });

        const inserted = await db.getMapToken(npcTokenId);
        if (inserted) {
                const token = mapTokenFromRow(inserted);
                await proxyDurableRequest(c, inviteCode, '/map/tokens', { action: 'create', token });
                return c.json({ token });
        }

        return c.json({ ok: true });
});

const handleCharacterMutationRoute = async (
        c: Context<GamesContext>,
        type: 'damage' | 'heal' | 'update',
) => {
        const user = c.get('user');
        if (!user) {
                return c.json({ error: 'Unauthorized' }, 401);
        }

        const inviteCode = c.req.param('inviteCode');
        const characterId = c.req.param('characterId');
        const body = (await c.req.json()) as { amount?: number; updates?: Partial<Character> };

        if ((type === 'damage' || type === 'heal') && (!body.amount || body.amount <= 0)) {
                return c.json({ error: 'Amount must be greater than zero' }, 400);
        }

        try {
                const character = await mutateCharacterRecord(c, inviteCode, characterId, {
                        type,
                        amount: body.amount,
                        updates: body.updates,
                });

                return c.json({ character });
        } catch (error) {
                if ((error as Error).message === 'Character not found') {
                        return c.json({ error: 'Character not found' }, 404);
                }
                console.error('Character mutation failed', error);
                return c.json({ error: 'Character mutation failed' }, 500);
        }
};

games.post('/:inviteCode/characters/:characterId/damage', c =>
        handleCharacterMutationRoute(c, 'damage'),
);

games.post('/:inviteCode/characters/:characterId/heal', c =>
        handleCharacterMutationRoute(c, 'heal'),
);

games.post('/:inviteCode/characters/:characterId/update', c =>
        handleCharacterMutationRoute(c, 'update'),
);

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

const proxyDurableRequest = async (
        c: Context<GamesContext>,
        inviteCode: string,
        path: string,
        payload?: unknown,
        method: string = 'POST',
) => {
        const sessionStub = getSessionStub(c.env, inviteCode);
        const response = await sessionStub.fetch(
                buildDurableRequest(c.req.raw, path, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: payload ? JSON.stringify(payload) : undefined,
                }),
        );

        if (!response.ok) {
                const details = await response.text();
                throw new Error(`Durable request failed: ${details}`);
        }

        if (response.headers.get('Content-Type')?.includes('application/json')) {
                return response.json();
        }

        return null;
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


