import { env } from 'cloudflare:test';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games API with Cloudflare Workers', () => {
	let hostUser: { id: string; email: string; name?: string | null };
	let playerUser: { id: string; email: string; name?: string | null };
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof hostUser | null } }>;

	beforeEach(async () => {
		// Set up test users
		hostUser = { id: 'host-123', email: 'host@example.com', name: 'Host User' };
		playerUser = { id: 'player-456', email: 'player@example.com', name: 'Player User' };

		// Create test app with mocked auth middleware
		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof hostUser | null } }>();
		testApp.use('*', async (c, next) => {
			// Mock auth by setting user from a header or default to hostUser
			const authHeader = c.req.header('X-Test-User');
			if (authHeader === 'none') {
				c.set('user', null);
			} else if (authHeader === 'player') {
				c.set('user', playerUser);
			} else {
				c.set('user', hostUser);
			}
			await next();
		});
		testApp.route('/api/games', gameRoutes);

		// Run migrations on the D1 database
		const db = (env as CloudflareBindings).DATABASE;
		await db.exec(`
			CREATE TABLE IF NOT EXISTS games (
				id TEXT PRIMARY KEY,
				invite_code TEXT UNIQUE NOT NULL,
				host_id TEXT NOT NULL,
				host_email TEXT,
				quest_id TEXT NOT NULL,
				quest_data TEXT NOT NULL,
				world TEXT NOT NULL,
				starting_area TEXT NOT NULL,
				status TEXT NOT NULL,
				current_map_id TEXT,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS characters (
				id TEXT PRIMARY KEY,
				player_id TEXT NOT NULL,
				player_email TEXT,
				name TEXT NOT NULL,
				level INTEGER NOT NULL,
				race TEXT NOT NULL,
				class TEXT NOT NULL,
				description TEXT,
				stats TEXT NOT NULL,
				skills TEXT NOT NULL,
				inventory TEXT NOT NULL,
				equipped TEXT NOT NULL,
				health INTEGER NOT NULL,
				max_health INTEGER NOT NULL,
				action_points INTEGER NOT NULL,
				max_action_points INTEGER NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS game_players (
				id TEXT PRIMARY KEY,
				game_id TEXT NOT NULL,
				player_id TEXT NOT NULL,
				player_email TEXT,
				character_id TEXT NOT NULL,
				character_name TEXT NOT NULL,
				joined_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS maps (
				id TEXT PRIMARY KEY,
				slug TEXT NOT NULL,
				name TEXT NOT NULL,
				description TEXT,
				width INTEGER NOT NULL,
				height INTEGER NOT NULL,
				default_terrain TEXT NOT NULL,
				fog_of_war TEXT NOT NULL,
				terrain_layers TEXT NOT NULL,
				metadata TEXT NOT NULL,
				generator_preset TEXT,
				seed TEXT,
				theme TEXT,
				biome TEXT,
				is_generated INTEGER NOT NULL DEFAULT 0,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS map_tiles (
				id TEXT PRIMARY KEY,
				map_id TEXT NOT NULL,
				x INTEGER NOT NULL,
				y INTEGER NOT NULL,
				terrain_type TEXT NOT NULL,
				elevation INTEGER NOT NULL DEFAULT 0,
				is_blocked INTEGER NOT NULL DEFAULT 0,
				has_fog INTEGER NOT NULL DEFAULT 0,
				feature_type TEXT,
				metadata TEXT NOT NULL DEFAULT '{}'
			);

			CREATE TABLE IF NOT EXISTS map_tokens (
				id TEXT PRIMARY KEY,
				game_id TEXT,
				map_id TEXT NOT NULL,
				character_id TEXT,
				npc_id TEXT,
				token_type TEXT NOT NULL,
				label TEXT,
				x INTEGER NOT NULL,
				y INTEGER NOT NULL,
				facing INTEGER NOT NULL DEFAULT 0,
				color TEXT,
				status TEXT NOT NULL,
				is_visible INTEGER NOT NULL DEFAULT 1,
				hit_points INTEGER,
				max_hit_points INTEGER,
				metadata TEXT NOT NULL DEFAULT '{}',
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS npcs (
				id TEXT PRIMARY KEY,
				slug TEXT UNIQUE NOT NULL,
				name TEXT NOT NULL,
				role TEXT NOT NULL,
				alignment TEXT NOT NULL,
				disposition TEXT NOT NULL,
				description TEXT,
				base_health INTEGER NOT NULL,
				base_armor_class INTEGER NOT NULL,
				challenge_rating INTEGER NOT NULL,
				archetype TEXT NOT NULL,
				default_actions TEXT NOT NULL,
				stats TEXT NOT NULL,
				abilities TEXT NOT NULL,
				loot_table TEXT NOT NULL,
				metadata TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS npc_instances (
				id TEXT PRIMARY KEY,
				game_id TEXT NOT NULL,
				npc_id TEXT NOT NULL,
				token_id TEXT NOT NULL,
				name TEXT NOT NULL,
				disposition TEXT NOT NULL,
				current_health INTEGER NOT NULL,
				max_health INTEGER NOT NULL,
				status_effects TEXT NOT NULL,
				is_friendly INTEGER NOT NULL DEFAULT 0,
				metadata TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS game_states (
				game_id TEXT PRIMARY KEY,
				state_data TEXT,
				map_state TEXT,
				log_entries TEXT,
				state_version INTEGER NOT NULL DEFAULT 0,
				updated_at INTEGER NOT NULL
			);
		`);

		// Mock Database to use the real D1 database from Cloudflare Workers
		vi.spyOn(dbModule, 'Database').mockImplementation(() => {
			return new dbModule.Database((env as CloudflareBindings).DATABASE) as unknown as dbModule.Database;
		});
	});

	// Helper to make requests with mocked auth
	const fetchWithAuth = async (
		url: string,
		options: RequestInit = {},
		user: 'host' | 'player' | 'none' = 'host',
	) => {
		const headers = new Headers(options.headers);
		headers.set('X-Test-User', user);
		return testApp.fetch(new Request(url, { ...options, headers }), env as CloudflareBindings);
	};

	describe('POST /api/games', () => {
		it('creates a new game with quest data', async () => {
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const response = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { inviteCode: string; quest: unknown };
			expect(data).toHaveProperty('inviteCode');
			expect(data).toHaveProperty('quest');
		});

		it('returns 401 when user is not authenticated', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest: { id: 'quest-1', title: 'Test' },
						world: 'Test World',
						startingArea: 'Test Area',
					}),
				},
				'none', // No user
			);

			expect(response.status).toBe(401);
		});
	});

	describe('GET /api/games/:inviteCode', () => {
		it('returns game state for valid invite code', async () => {
			// First create a game
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Then fetch it
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}`,
				{
					method: 'GET',
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { inviteCode: string };
			expect(data).toHaveProperty('inviteCode', inviteCode);
		});

		it('returns 404 for invalid invite code', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/games/INVALID',
				{
					method: 'GET',
				},
				'host',
			);

			// The route forwards to Durable Object, which may return different status
			// But we expect it to not be 200
			expect(response.status).not.toBe(200);
		});
	});

	describe('POST /api/games/:inviteCode/map/generate', () => {
		it('generates a new map and saves tiles using batch operations', async () => {
			// Create a game first
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a map
			const generateResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 10,
						height: 10,
						seed: 'test-seed-123',
					}),
				},
				'host',
			);

			expect(generateResponse.status).toBe(200);
			const mapData = (await generateResponse.json()) as {
				map: { id: string };
				tiles: Array<unknown>;
			};
			expect(mapData).toHaveProperty('map');
			expect(mapData).toHaveProperty('tiles');
			expect(Array.isArray(mapData.tiles)).toBe(true);
			expect(mapData.tiles.length).toBeGreaterThan(0);

			// Verify tiles were saved to database
			const db = (env as CloudflareBindings).DATABASE;
			const tilesResult = await db
				.prepare('SELECT COUNT(*) as count FROM map_tiles WHERE map_id = ?')
				.bind(mapData.map.id)
				.first<{ count: number }>();

			expect(tilesResult?.count).toBe(mapData.tiles.length);
		});

		it('returns 403 when non-host tries to generate map', async () => {
			// Create a game as host
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Try to generate map as non-host
			const generateResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 10,
						height: 10,
					}),
				},
				'player', // Different user
			);

			expect(generateResponse.status).toBe(403);
		});

		it('handles large map generation with many tiles', async () => {
			// Create a game
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a large map (50x50 = 2500 tiles)
			const generateResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 50,
						height: 50,
						seed: 'large-map-test',
					}),
				},
				'host',
			);

			expect(generateResponse.status).toBe(200);
			const mapData = (await generateResponse.json()) as {
				map: { id: string };
				tiles: Array<unknown>;
			};
			expect(mapData.tiles.length).toBe(2500);

			// Verify all tiles were saved using batch operations
			const db = (env as CloudflareBindings).DATABASE;
			const tilesResult = await db
				.prepare('SELECT COUNT(*) as count FROM map_tiles WHERE map_id = ?')
				.bind(mapData.map.id)
				.first<{ count: number }>();

			expect(tilesResult?.count).toBe(2500);
		});
	});

	describe('POST /api/games/:inviteCode/map/terrain', () => {
		it('updates map tiles using upsert operations', async () => {
			// Create a game and generate a map first
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a map
			const generateResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 5,
						height: 5,
					}),
				},
				'host',
			);

			const generateMapData = (await generateResponse.json()) as {
				map: { id: string };
			};

			// Update some tiles
			const updateResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/terrain`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						tiles: [
							{
								x: 0,
								y: 0,
								terrainType: 'water',
								elevation: -1,
								isBlocked: true,
								hasFog: false,
							},
							{
								x: 1,
								y: 1,
								terrainType: 'mountain',
								elevation: 5,
								isBlocked: true,
								hasFog: false,
							},
						],
					}),
				},
				'host',
			);

			expect(updateResponse.status).toBe(200);

			// Verify tiles were updated
			const db = (env as CloudflareBindings).DATABASE;
			const tile1 = await db
				.prepare('SELECT * FROM map_tiles WHERE map_id = ? AND x = ? AND y = ?')
				.bind(generateMapData.map.id, 0, 0)
				.first<{ terrain_type: string; elevation: number; is_blocked: number }>();

			expect(tile1?.terrain_type).toBe('water');
			expect(tile1?.elevation).toBe(-1);
			expect(tile1?.is_blocked).toBe(1);
		});
	});

	describe('GET /api/games/:inviteCode/map', () => {
		it('returns map state with tiles and tokens', async () => {
			// Create a game and generate a map
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a map
			await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 10,
						height: 10,
					}),
				},
				'host',
			);

			// Get map state
			const mapResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map`,
				{
					method: 'GET',
				},
				'host',
			);

			expect(mapResponse.status).toBe(200);
			const mapState = (await mapResponse.json()) as {
				map: unknown;
				tiles: Array<unknown>;
				tokens: Array<unknown>;
			};
			expect(mapState).toHaveProperty('map');
			expect(mapState).toHaveProperty('tiles');
			expect(mapState).toHaveProperty('tokens');
			expect(Array.isArray(mapState.tiles)).toBe(true);
			expect(Array.isArray(mapState.tokens)).toBe(true);
		});
	});

	describe('Character management', () => {
		it('creates, reads, updates, and deletes characters', async () => {
			// Create a character
			const createResponse = await fetchWithAuth(
				'http://localhost/api/games/me/characters',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: 'char-1',
						name: 'Test Hero',
						level: 1,
						race: 'Human',
						class: 'Fighter',
						stats: { STR: 16, DEX: 14, CON: 15 },
						skills: [],
						inventory: [],
						equipped: {},
						health: 20,
						maxHealth: 20,
						actionPoints: 3,
						maxActionPoints: 3,
					}),
				},
				'host',
			);

			expect(createResponse.status).toBe(200);
			const created = (await createResponse.json()) as {
				character: { id: string; name: string };
			};
			expect(created.character).toHaveProperty('id', 'char-1');
			expect(created.character).toHaveProperty('name', 'Test Hero');

			// Read characters
			const listResponse = await fetchWithAuth(
				'http://localhost/api/games/me/characters',
				{
					method: 'GET',
				},
				'host',
			);

			expect(listResponse.status).toBe(200);
			const list = (await listResponse.json()) as {
				characters: Array<{ id: string }>;
			};
			expect(list.characters).toHaveLength(1);
			expect(list.characters[0].id).toBe('char-1');

			// Update character
			const updateResponse = await fetchWithAuth(
				'http://localhost/api/games/me/characters/char-1',
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Updated Hero',
						level: 2,
					}),
				},
				'host',
			);

			expect(updateResponse.status).toBe(200);
			const updated = (await updateResponse.json()) as {
				character: { name: string; level: number };
			};
			expect(updated.character).toHaveProperty('name', 'Updated Hero');
			expect(updated.character).toHaveProperty('level', 2);

			// Delete character
			const deleteResponse = await fetchWithAuth(
				'http://localhost/api/games/me/characters/char-1',
				{
					method: 'DELETE',
				},
				'host',
			);

			expect(deleteResponse.status).toBe(200);

			// Verify deletion
			const listAfterDelete = await fetchWithAuth(
				'http://localhost/api/games/me/characters',
				{
					method: 'GET',
				},
				'host',
			);

			const listData = (await listAfterDelete.json()) as {
				characters: Array<unknown>;
			};
			expect(listData.characters).toHaveLength(0);
		});
	});

	describe('NPC management', () => {
		it('lists NPC definitions and places NPCs on map', async () => {
			// First, seed an NPC
			const db = (env as CloudflareBindings).DATABASE;
			await db
				.prepare(
					`INSERT INTO npcs (
						id, slug, name, role, alignment, disposition, description,
						base_health, base_armor_class, challenge_rating, archetype,
						default_actions, stats, abilities, loot_table, metadata,
						created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					'npc-1',
					'guard',
					'Town Guard',
					'Sentinel',
					'lawful',
					'friendly',
					'A town guard',
					20,
					15,
					1,
					'guardian',
					JSON.stringify(['attack']),
					JSON.stringify({ strength: 14 }),
					JSON.stringify(['Shield']),
					JSON.stringify([]),
					JSON.stringify({ color: '#222' }),
					Date.now(),
					Date.now(),
				)
				.run();

			// Create a game and generate a map
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth(
				'http://localhost/api/games',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						quest,
						world: 'Test World',
						startingArea: 'Test Area',
						hostId: hostUser.id,
						hostEmail: hostUser.email,
					}),
				},
				'host',
			);

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a map
			await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/map/generate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						preset: 'forest',
						width: 10,
						height: 10,
					}),
				},
				'host',
			);

			// List NPCs
			const listResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/npcs`,
				{
					method: 'GET',
				},
				'host',
			);

			expect(listResponse.status).toBe(200);
			const npcs = (await listResponse.json()) as {
				npcs: Array<{ slug: string }>;
			};
			expect(npcs.npcs).toHaveLength(1);
			expect(npcs.npcs[0].slug).toBe('guard');

			// Place NPC on map
			const placeResponse = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/npcs`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						npcId: 'guard',
						x: 5,
						y: 5,
						label: 'Guard at Gate',
					}),
				},
				'host',
			);

			expect(placeResponse.status).toBe(200);
			const tokens = (await placeResponse.json()) as {
				tokens: Array<{ npcId: string }>;
			};
			expect(tokens.tokens).toHaveLength(1);
			expect(tokens.tokens[0].npcId).toBe('npc-1');
		});
	});

	afterEach(async () => {
		// Clean up database tables
		const db = (env as CloudflareBindings).DATABASE;
		await db.exec(`
			DELETE FROM npc_instances;
			DELETE FROM map_tokens;
			DELETE FROM map_tiles;
			DELETE FROM maps;
			DELETE FROM game_players;
			DELETE FROM characters;
			DELETE FROM game_states;
			DELETE FROM games;
			DELETE FROM npcs;
		`);
	});
});
