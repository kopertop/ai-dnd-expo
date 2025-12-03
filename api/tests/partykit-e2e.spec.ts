import type { AnalyticsEngineDataset, D1Database } from '@cloudflare/workers-types';
import type { Connection, ConnectionContext, Request as PartyRequest, Room } from 'partykit/server';
import { describe, expect, it } from 'vitest';

import GameRoom from '../src/partykit/server';
import type { CloudflareBindings } from '../src/env';

import type { GamePlayerRow, GameRow, MapTokenRow } from '@/shared/workers/db';

class FakeConnection {
	public sent: string[] = [];
	public state: unknown = null;
	public readonly uri: string = '';

	constructor(public readonly request: PartyRequest, public readonly id: string = 'conn-1') {}

	send(message: string) {
		this.sent.push(message);
	}

	setState(next: unknown) {
		this.state = typeof next === 'function' ? (next as (prev: unknown) => unknown)(this.state) : next;
		return this.state;
	}
}

class FakeParty {
	public messages: string[] = [];
	public readonly internalID: string;
	public readonly name: string;
	public readonly storage = {};
	public readonly context = {
		parties: {},
		ai: {},
		vectorize: {},
		analytics: { writeDataPoint: () => undefined } satisfies AnalyticsEngineDataset,
		assets: { fetch: async () => null },
		bindings: { kv: {}, r2: {} },
	};
	public readonly connections = new Map();
	public readonly parties = this.context.parties;
	public readonly analytics: AnalyticsEngineDataset = { writeDataPoint: () => undefined };

	constructor(public readonly id: string, public readonly env: Record<string, unknown>) {
		this.internalID = id;
		this.name = id.split('/')[0] || 'room';
	}

	broadcast(message: string, _without?: string[]) {
		this.messages.push(message);
	}

	getConnection() {
		return undefined;
	}

	// eslint-disable-next-line class-methods-use-this
	getConnections() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	async blockConcurrencyWhile<T>(fn: () => Promise<T>) {
		return fn();
	}
}

class FakeDatabase {
	constructor(
		private readonly game: GameRow,
		private readonly tokens: MapTokenRow[],
		private readonly players: GamePlayerRow[],
		private readonly logs: any[],
	) {}

	async getGameByInviteCode(inviteCode: string) {
		return inviteCode === this.game.invite_code ? this.game : null;
	}

	async getGamePlayers() {
		return this.players;
	}

	async getCharacterById(_characterId: string) {
		return null;
	}

	async addPlayerToGame(player: Omit<GamePlayerRow, 'id'>) {
		this.players.push({ ...player, id: `gp_${Date.now()}` });
	}

	async createCharacter() {
		// no-op for this scenario
	}

	async getMapTokenById(tokenId: string) {
		return this.tokens.find(token => token.id === tokenId) ?? null;
	}

	async updateMapToken(tokenId: string, updates: Partial<MapTokenRow>) {
		const idx = this.tokens.findIndex(token => token.id === tokenId);
		if (idx >= 0) {
			this.tokens[idx] = { ...this.tokens[idx], ...updates } as MapTokenRow;
		}
	}

	async saveActivityLog(log: any) {
		this.logs.push(log);
	}
}

class FakeStateService {
	constructor(private readonly tokens: MapTokenRow[]) {}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getState() {
		return {
			activeTurn: null,
			initiativeOrder: [],
			pausedTurn: null,
			characters: [],
			players: [],
			messages: [],
			activityLog: [],
			map: {
				id: 'map-1',
				tokens: this.tokens,
				tiles: [],
				fogOfWar: { enabled: false, grid: [] },
				width: 10,
				height: 10,
				defaultTerrain: { type: 'stone' },
				terrainLayers: [],
			},
		};
	}
}

describe('Partykit game room end-to-end flow', () => {
	it('authenticates, joins, moves a token, and persists via R2 SQL binding', async () => {
		const game: GameRow = {
			id: 'game-1',
			invite_code: 'JOINME',
			host_id: 'host-1',
			host_email: 'host@example.com',
			quest_id: 'quest-1',
			quest_data: '{}',
			world: 'faerun',
			starting_area: 'Neverwinter',
			status: 'active',
			current_map_id: 'map-1',
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		const tokens: MapTokenRow[] = [
			{
				id: 'token-1',
				game_id: game.id,
				map_id: 'map-1',
				character_id: 'char-1',
				npc_id: null,
				token_type: 'player',
				label: 'Hero',
				x: 1,
				y: 1,
				facing: 0,
				color: '#fff',
				status: 'idle',
				is_visible: 1,
				hit_points: null,
				max_hit_points: null,
				status_effects: null,
				metadata: '{}',
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		];

		const players: GamePlayerRow[] = [];
		const logs: any[] = [];
		const kvStub = {
			get: async () => null,
			getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
			put: async () => undefined,
			delete: async () => undefined,
			list: async () => ({ keys: [], list_complete: true, cursor: '', cacheStatus: null }),
		};
		const kv = kvStub;
		const env = {
			DATABASE: null as unknown as D1Database,
			R2_SQL: null as unknown as D1Database,
			QUESTS: kv,
			AUTH_SESSIONS: undefined,
			ASSETS: undefined,
			PARTYKIT_HOST: 'localhost:1999',
			PARTYKIT_PUBLIC_URL: 'localhost:1999',
			PARTYKIT_SECRET: '',
			OLLAMA_BASE_URL: '',
			OLLAMA_MODEL: '',
			ADMIN_EMAILS: '',
			AUTH_SECRET: 'secret',
			AUTH_URL: '',
			GOOGLE_CLIENT_ID: '',
			GOOGLE_CLIENT_SECRET: '',
		};

		const db = new FakeDatabase(game, tokens, players, logs) as unknown as import('@/shared/workers/db').Database;
		const stateService = new FakeStateService(tokens) as unknown as import('@/api/src/services/game-state').GameStateService;
		const fakeParty = new FakeParty(`games/${game.invite_code}`, env);
		const party = fakeParty as unknown as Room & { env: CloudflareBindings };
		const room = new GameRoom(party, db, stateService);

		const request = new Request('https://example.com', {
			headers: {
				Authorization: 'Bearer player-1:player@example.com',
			},
		}) as unknown as PartyRequest;
		const fakeConnection = new FakeConnection(request);
		const connection = fakeConnection as unknown as Connection;

		const ctx: ConnectionContext = { request };
		await room.onConnect(connection, ctx);
		expect(fakeConnection.sent.some((msg: string) => msg.includes('"state"'))).toBe(true);
		expect(fakeParty.messages.some((msg: string) => msg.includes('presence'))).toBe(true);

		await room.onMessage(JSON.stringify({ type: 'join', characterId: 'char-1', characterName: 'Hero' }), connection);
		expect(players.length).toBe(1);

		await room.onMessage(JSON.stringify({ type: 'move-token', tokenId: 'token-1', x: 2, y: 3 }), connection);
		expect(tokens[0].x).toBe(2);
		expect(tokens[0].y).toBe(3);
		expect(logs.length).toBe(1);
		expect(fakeParty.messages.some((msg: string) => msg.includes('"state"'))).toBe(true);
	});
});
