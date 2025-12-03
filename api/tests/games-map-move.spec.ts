import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	CharacterRow,
	GamePlayerRow,
	GameRow,
	GameStateRow,
	MapRow,
	MapTileRow,
	MapTokenRow,
} from '../../shared/workers/db';
import * as dbModule from '../../shared/workers/db';
import games from '../src/routes/games';

const mockEnv = { DATABASE: {} as any };

const hostUser = { id: 'host-1', email: 'host@example.com' };
const playerUser = { id: 'player-1', email: 'player@example.com' };

const createApp = (currentUser: { id: string; email: string }) => {
	const app = new Hono();
	app.use('*', async (c, next) => {
		(c as any).set('user', currentUser);
		await next();
	});
	app.route('/', games);
	return app;
};

class MockMovementDatabase {
	public game: GameRow = {
		id: 'game-1',
		invite_code: 'ABC123',
		host_id: hostUser.id,
		host_email: hostUser.email,
		quest_id: 'quest-1',
		quest_data: JSON.stringify({}),
		world: 'World',
		starting_area: 'Town',
		status: 'active',
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
			width: 5,
			height: 5,
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

	public tiles: MapTileRow[] = [];

	public tokens: MapTokenRow[] = [
		{
			id: 'token-1',
			game_id: 'game-1',
			map_id: 'map-1',
			character_id: 'char-1',
			npc_id: null,
			token_type: 'player',
			label: 'Hero',
			x: 0,
			y: 0,
			facing: 0,
			color: '#123',
			status: 'idle',
			is_visible: 1,
			hit_points: null,
			max_hit_points: null,
			status_effects: JSON.stringify([]),
			metadata: JSON.stringify({}),
			created_at: Date.now(),
			updated_at: Date.now(),
		},
	];

	public players: GamePlayerRow[] = [
		{
			id: 'gp-1',
			game_id: 'game-1',
			player_id: playerUser.id,
			player_email: playerUser.email,
			character_id: 'char-1',
			character_name: 'Hero',
			joined_at: Date.now(),
		},
	];

	public characters: CharacterRow[] = [
		{
			id: 'char-1',
			player_id: playerUser.id,
			player_email: playerUser.email,
			name: 'Hero',
			level: 1,
			race: 'Human',
			class: 'Fighter',
			description: null,
			trait: null,
			icon: null,
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
		},
	];

	private gameStateRow: GameStateRow;

	constructor() {
		const now = Date.now();
		this.gameStateRow = {
			game_id: this.game.id,
			state_data: JSON.stringify({
				status: 'active',
				activeTurn: {
					type: 'player',
					entityId: 'char-1',
					turnNumber: 1,
					startedAt: now,
					movementUsed: 0,
					majorActionUsed: false,
					minorActionUsed: false,
					speed: 3,
				},
				players: this.players.map(p => ({
					characterId: p.character_id,
					playerId: p.player_id,
					name: p.character_name,
					joinedAt: p.joined_at,
				})),
				characters: this.characters.map(char => ({
					id: char.id,
					level: char.level,
					race: char.race,
					name: char.name,
					class: char.class,
					description: char.description || undefined,
					trait: char.trait || undefined,
					stats: JSON.parse(char.stats),
					skills: JSON.parse(char.skills),
					inventory: JSON.parse(char.inventory),
					equipped: JSON.parse(char.equipped),
					health: char.health,
					maxHealth: char.max_health,
					actionPoints: char.action_points,
					maxActionPoints: char.max_action_points,
					statusEffects: JSON.parse(char.status_effects || '[]'),
					preparedSpells: char.prepared_spells ? JSON.parse(char.prepared_spells) : [],
				})),
			}),
			map_state: JSON.stringify({}),
			log_entries: JSON.stringify([]),
			state_version: 1,
			updated_at: now,
		};
	}

	setTurnState({ speed, movementUsed }: { speed: number; movementUsed: number }) {
		const parsed = JSON.parse(this.gameStateRow.state_data);
		this.gameStateRow = {
			...this.gameStateRow,
			state_data: JSON.stringify({
				...parsed,
				activeTurn: {
					...parsed.activeTurn,
					speed,
					movementUsed,
				},
			}),
		};
	}

	getGameByInviteCode(inviteCode: string) {
		return inviteCode === this.game.invite_code ? this.game : null;
	}

	getMapById(id: string) {
		return this.maps.find(map => map.id === id) ?? null;
	}

	listMaps() {
		return this.maps;
	}

	getMapTiles(mapId: string) {
		return this.tiles.filter(tile => tile.map_id === mapId);
	}

	listMapTokensForGame(gameId: string) {
		return this.tokens.filter(token => token.game_id === gameId);
	}

	updateMapToken(tokenId: string, updates: Partial<MapTokenRow>) {
		const idx = this.tokens.findIndex(token => token.id === tokenId);
		if (idx === -1) return;
		this.tokens[idx] = {
			...this.tokens[idx],
			...updates,
			updated_at: Date.now(),
		};
	}

	getGamePlayers(gameId: string) {
		return this.players.filter(player => player.game_id === gameId);
	}

	getCharacterById(characterId: string) {
		return this.characters.find(char => char.id === characterId) ?? null;
	}

	getGameState(gameId: string) {
		return this.gameStateRow?.game_id === gameId ? this.gameStateRow : null;
	}

	updateGameState(gameId: string, updates: Partial<{ state_data: string; map_state: string; log_entries: string }>) {
		if (gameId !== this.game.id) return;
		this.gameStateRow = {
			...this.gameStateRow,
			state_data: updates.state_data ?? this.gameStateRow.state_data,
			map_state: updates.map_state ?? this.gameStateRow.map_state,
			log_entries: updates.log_entries ?? this.gameStateRow.log_entries,
			state_version: this.gameStateRow.state_version + 1,
			updated_at: Date.now(),
		};
	}

	updateGameStatus(gameId: string, status: GameRow['status']) {
		if (gameId === this.game.id) {
			this.game = { ...this.game, status };
		}
	}
}

describe('games map movement validation', () => {
	let mockDb: MockMovementDatabase;
	let app: ReturnType<typeof createApp>;
	let currentUser = playerUser;

	beforeEach(() => {
		mockDb = new MockMovementDatabase();
		currentUser = playerUser;
		vi.spyOn(dbModule as any, 'Database').mockImplementation(() => mockDb as unknown as dbModule.Database);
		app = createApp(currentUser);
	});

	it('allows movement within remaining speed and updates movementUsed', async () => {
		mockDb.setTurnState({ speed: 4, movementUsed: 1 });

		const res = await app.fetch(
			new Request('http://test/ABC123/map/move', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tokenId: 'token-1', x: 0, y: 2 }),
			}),
			mockEnv,
		);

		expect(res.status).toBe(200);
		const body = await res.json() as { cost: number; gameState: { activeTurn?: { movementUsed?: number } } };
		expect(body.cost).toBe(2);
		expect(mockDb.tokens[0]?.y).toBe(2);
		expect(body.gameState.activeTurn?.movementUsed).toBe(3); // 1 used + 2 cost
	});

	it('rejects movement that exceeds remaining speed', async () => {
		mockDb.setTurnState({ speed: 1, movementUsed: 0 });

		const res = await app.fetch(
			new Request('http://test/ABC123/map/move', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tokenId: 'token-1', x: 0, y: 4 }),
			}),
			mockEnv,
		);

		expect(res.status).toBe(403);
		const error = await res.json() as { error?: string };
		expect(error.error).toContain('Not enough movement');
		expect(mockDb.tokens[0]?.y).toBe(0);

		const stateData = JSON.parse((mockDb as any).gameStateRow.state_data);
		expect(stateData.activeTurn.movementUsed).toBe(0);
	});
});
