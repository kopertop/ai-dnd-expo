import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	GameRow,
	GamePlayerRow,
	MapRow,
	MapTileRow,
	MapTokenRow,
	NpcRow,
} from '../../shared/workers/db';
import * as dbModule from '../../shared/workers/db';
import games from '../src/routes/games';

const mockEnv = { DATABASE: {} as any };

const hostUser = { id: 'host-1', email: 'host@example.com' };

const createApp = () => {
	const app = new Hono();
	app.use('*', async (c, next) => {
		(c as any).set('user', hostUser);
		await next();
	});
	app.route('/', games);
	return app;
};

class MockMapDatabase {
	public game: GameRow = {
		id: 'game-1',
		invite_code: 'ABC123',
		host_id: hostUser.id,
		host_email: hostUser.email,
		quest_id: 'quest-1',
		quest_data: JSON.stringify({}),
		world: 'World',
		starting_area: 'Town',
		status: 'waiting',
		current_map_id: 'map-1',
		created_at: Date.now(),
		updated_at: Date.now(),
	};

	public maps: MapRow[] = [
		{
			id: 'map-1',
			slug: 'town',
			name: 'Town',
			description: null,
			width: 2,
			height: 2,
			default_terrain: JSON.stringify({ type: 'grass' }),
			fog_of_war: JSON.stringify({ enabled: false }),
			terrain_layers: JSON.stringify([]),
			metadata: JSON.stringify({}),
			generator_preset: 'forest',
			seed: 'test-seed',
			theme: 'default',
			biome: 'forest',
			is_generated: 0,
			created_at: Date.now(),
			updated_at: Date.now(),
		},
	];

	public tiles: MapTileRow[] = [
		{
			id: 'tile-1',
			map_id: 'map-1',
			x: 0,
			y: 0,
			terrain_type: 'grass',
			elevation: 0,
			is_blocked: 0,
			has_fog: 0,
			feature_type: null,
			metadata: JSON.stringify({}),
		},
	];

	public tokens: MapTokenRow[] = [];
	public players: GamePlayerRow[] = [];
	public npcs: NpcRow[] = [
		{
			id: 'npc-1',
			slug: 'guard',
			name: 'Town Guard',
			role: 'Sentinel',
			alignment: 'lawful',
			disposition: 'friendly',
			description: null,
			base_health: 20,
			base_armor_class: 15,
			challenge_rating: 1,
			archetype: 'guardian',
			default_actions: JSON.stringify(['attack']),
			stats: JSON.stringify({ strength: 14 }),
			abilities: JSON.stringify(['Shield']),
			loot_table: JSON.stringify([]),
			icon: 'MaterialIcons:shield',
			metadata: JSON.stringify({ color: '#222' }),
			created_at: Date.now(),
			updated_at: Date.now(),
		},
	];
	public stateData: Record<string, unknown> = {};
	public mapStateData: Record<string, unknown> = {};
	public logEntriesData: unknown[] = [];
	public removedPlayers: Array<{ gameId: string; playerId: string }> = [];

	async getGameByInviteCode(inviteCode: string) {
		return inviteCode === this.game.invite_code ? this.game : null;
	}

	async listMaps() {
		return this.maps;
	}

	async getMapById(id: string) {
		return this.maps.find(map => map.id === id) ?? null;
	}

	async getMapTiles(mapId: string) {
		return this.tiles.filter(tile => tile.map_id === mapId);
	}

	async listMapTokensForGame() {
		return this.tokens;
	}

	async saveMapToken(token: MapTokenRow) {
		const existingIndex = this.tokens.findIndex(t => t.id === token.id);
		if (existingIndex >= 0) {
			this.tokens[existingIndex] = token;
		} else {
			this.tokens.push(token);
		}
	}

	async deleteMapToken(id: string) {
		this.tokens = this.tokens.filter(token => token.id !== id);
	}

	async updateGameMap(gameId: string, mapId: string | null) {
		if (this.game.id === gameId) {
			this.game.current_map_id = mapId;
		}
	}

	async listNpcDefinitions() {
		return this.npcs;
	}

	async getNpcBySlug(slug: string) {
		return this.npcs.find(npc => npc.slug === slug) ?? null;
	}

	async getNpcById(id: string) {
		return this.npcs.find(npc => npc.id === id) ?? null;
	}

	async getCharacterById(characterId: string) {
		// No characters stored in this mock; return a minimal stub for icon resolution
		return characterId
			? {
				id: characterId,
				player_id: 'player-1',
				player_email: 'player@example.com',
				name: 'Mock Hero',
				level: 1,
				race: 'Human',
				class: 'Fighter',
				description: null,
				trait: null,
				stats: JSON.stringify({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }),
				skills: JSON.stringify([]),
				inventory: JSON.stringify([]),
				equipped: JSON.stringify({}),
				health: 10,
				max_health: 10,
				action_points: 3,
				max_action_points: 3,
				status_effects: JSON.stringify([]),
				prepared_spells: JSON.stringify([]),
				created_at: Date.now(),
				updated_at: Date.now(),
			}
			: null;
	}

	async getGamePlayers(gameId: string) {
		return this.players.filter(player => player.game_id === gameId);
	}

	async getGameState(gameId: string) {
		const now = Date.now();
		return {
			game_id: gameId,
			state_data: JSON.stringify(this.stateData),
			map_state: JSON.stringify(this.mapStateData),
			log_entries: JSON.stringify(this.logEntriesData),
			state_version: 1,
			updated_at: now,
		};
	}

	async updateGameState(_gameId: string, updates: Partial<{ state_data: string; map_state: string; log_entries: string }>) {
		if (updates.state_data) {
			this.stateData = JSON.parse(updates.state_data);
		}
		if (updates.map_state) {
			this.mapStateData = JSON.parse(updates.map_state);
		}
		if (updates.log_entries) {
			this.logEntriesData = JSON.parse(updates.log_entries);
		}
		this.game.updated_at = Date.now();
	}

	async removePlayerFromGame(gameId: string, playerId: string) {
		this.players = this.players.filter(player => !(player.game_id === gameId && player.player_id === playerId));
		this.removedPlayers.push({ gameId, playerId });
	}
}

describe('games map routes', () => {
	let mockDb: MockMapDatabase;

	beforeEach(() => {
		mockDb = new MockMapDatabase();
		vi.spyOn(dbModule, 'Database').mockImplementation(() => mockDb as unknown as dbModule.Database);
	});

	it('returns the current map state with tokens', async () => {
		mockDb.tokens.push({
			id: 'token-1',
			game_id: 'game-1',
			map_id: 'map-1',
			character_id: 'char-1',
			npc_id: null,
			token_type: 'player',
			label: 'Hero',
			x: 1,
			y: 1,
			facing: 0,
			color: '#123',
			status: 'idle',
			is_visible: 1,
			hit_points: null,
			max_hit_points: null,
			status_effects: null,
			metadata: JSON.stringify({}),
			created_at: Date.now(),
			updated_at: Date.now(),
		});

		const app = createApp();
		const res = await app.fetch(new Request('http://test/ABC123/map'), mockEnv);
		expect(res.status).toBe(200);
		const mapState = await res.json<{ tokens: Array<{ id: string }> }>();
		expect(mapState.tokens).toHaveLength(1);
		expect(mapState.tokens[0].id).toBe('token-1');
	});

	it('updates the current map reference', async () => {
		const app = createApp();
		const res = await app.fetch(
			new Request('http://test/ABC123/map', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: 'map-1' }),
			}),
			mockEnv,
		);

		expect(res.status).toBe(200);
		expect(mockDb.game.current_map_id).toBe('map-1');
	});

	it('creates and deletes map tokens', async () => {
		const app = createApp();
		const createRes = await app.fetch(
			new Request('http://test/ABC123/map/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: 'token-2',
					tokenType: 'player',
					label: 'Mage',
					x: 0,
					y: 0,
				}),
			}),
			mockEnv,
		);
		expect(createRes.status).toBe(200);
		const created = await createRes.json<{ tokens: Array<{ id: string }> }>();
		expect(created.tokens.some(token => token.id === 'token-2')).toBe(true);

		const deleteRes = await app.fetch(
			new Request('http://test/ABC123/map/tokens/token-2', {
				method: 'DELETE',
			}),
			mockEnv,
		);
		expect(deleteRes.status).toBe(200);
		expect(mockDb.tokens.find(token => token.id === 'token-2')).toBeUndefined();
	});

	it('removes player membership and character state when deleting a player token', async () => {
		mockDb.game.status = 'active';
		const now = Date.now();

		mockDb.players.push({
			id: 'gp-1',
			game_id: mockDb.game.id,
			player_id: 'player-123',
			player_email: 'player@example.com',
			character_id: 'char-123',
			character_name: 'Hero',
			joined_at: now,
		});

		mockDb.tokens.push({
			id: 'token-hero',
			game_id: mockDb.game.id,
			map_id: mockDb.game.current_map_id || 'map-1',
			character_id: 'char-123',
			npc_id: null,
			token_type: 'player',
			label: 'Hero',
			x: 0,
			y: 0,
			facing: 0,
			color: '',
			status: 'active',
			is_visible: 1,
			hit_points: 10,
			max_hit_points: 10,
			status_effects: JSON.stringify([]),
			metadata: JSON.stringify({}),
			created_at: now,
			updated_at: now,
		});

		mockDb.stateData = {
			activeTurn: {
				type: 'player',
				entityId: 'char-123',
				turnNumber: 1,
				startedAt: now,
				movementUsed: 0,
				majorActionUsed: false,
				minorActionUsed: false,
				speed: 30,
			},
			initiativeOrder: [{ entityId: 'char-123', initiative: 15, type: 'player' as const }],
			players: [
				{
					playerId: 'player-123',
					characterId: 'char-123',
					name: 'Hero',
					joinedAt: now,
				},
			],
			characters: [
				{
					id: 'char-123',
					name: 'Hero',
					level: 1,
					race: 'Human',
					class: 'Fighter',
					trait: undefined,
					description: undefined,
					stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
					skills: [],
					inventory: [],
					equipped: {},
					health: 10,
					maxHealth: 10,
					actionPoints: 3,
					maxActionPoints: 3,
					statusEffects: [],
					preparedSpells: [],
				},
			],
		};

		const app = createApp();
		const res = await app.fetch(
			new Request('http://test/ABC123/map/tokens/token-hero', {
				method: 'DELETE',
			}),
			mockEnv,
		);

		expect(res.status).toBe(200);
		expect(mockDb.tokens.find(token => token.id === 'token-hero')).toBeUndefined();
		expect(mockDb.removedPlayers).toContainEqual({ gameId: mockDb.game.id, playerId: 'player-123' });
		expect((mockDb.stateData as any).characters?.find((c: any) => c.id === 'char-123')).toBeUndefined();
		expect((mockDb.stateData as any).players?.find((p: any) => p.characterId === 'char-123')).toBeUndefined();
		expect(((mockDb.stateData as any).initiativeOrder || [])).toEqual([]);
		expect((mockDb.stateData as any).activeTurn).toBeNull();
	});

	it('exposes NPC palette and placement', async () => {
		const app = createApp();
		const listRes = await app.fetch(new Request('http://test/ABC123/npcs'), mockEnv);
		expect(listRes.status).toBe(200);
		const list = await listRes.json<{ npcs: Array<{ slug: string }> }>();
		expect(list.npcs[0]?.slug).toBe('guard');

		const placeRes = await app.fetch(
			new Request('http://test/ABC123/npcs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ npcId: 'guard', x: 1, y: 0 }),
			}),
			mockEnv,
		);
		expect(placeRes.status).toBe(200);
		expect(mockDb.tokens.find(token => token.npc_id === 'npc-1')).toBeTruthy();
	});
});
