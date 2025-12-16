import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/api/tests/cloudflare-test-shim';
import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Core API', () => {
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
		const db = (env as unknown as CloudflareBindings).DATABASE;
		// Execute all migration files in order
		const migrationFiles = await readdir(path.resolve(process.cwd(), 'api', 'migrations'));
		for (const migrationFile of migrationFiles) {
			await db.exec(await readFile(path.join(__dirname, '..', 'migrations', migrationFile), 'utf8'));
		}
		// Mock Database to use the real D1 database from Cloudflare Workers
	});

	// Helper to make requests with mocked auth
	const fetchWithAuth = async (
		url: string,
		options: RequestInit = {},
		user: 'host' | 'player' | 'none' = 'host',
	) => {
		const headers = new Headers(options.headers);
		headers.set('X-Test-User', user);
		return testApp.fetch(new Request(url, { ...options, headers }), env as unknown as CloudflareBindings);
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

	describe('GET /api/games/me', () => {
		it('returns hosted and joined games for authenticated user', async () => {
			// First create a game
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			await fetchWithAuth(
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

			// Then fetch user's games
			const response = await fetchWithAuth(
				'http://localhost/api/games/me',
				{
					method: 'GET',
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { hostedGames: unknown[]; joinedGames: unknown[] };
			expect(data).toHaveProperty('hostedGames');
			expect(data).toHaveProperty('joinedGames');
			expect(Array.isArray(data.hostedGames)).toBe(true);
			expect(Array.isArray(data.joinedGames)).toBe(true);
		});

		it('returns 401 when user is not authenticated', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/games/me',
				{
					method: 'GET',
				},
				'none',
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

			expect(response.status).toBe(404);
		});
	});

	describe('POST /api/games/:inviteCode/join', () => {
		it('allows a player to join a game', async () => {
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

			// Join the game
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/join`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						character: {
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
						},
					}),
				},
				'player',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { inviteCode: string };
			expect(data).toHaveProperty('inviteCode', inviteCode);
		});
	});

	describe('POST /api/games/:inviteCode/start', () => {
		it('allows host to start a game', async () => {
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

			// Start the game
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/start`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { status: string };
			expect(data.status).toBe('active');
		});

		it('returns 403 when non-host tries to start game', async () => {
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

			// Try to start as non-host
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/start`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				'player',
			);

			expect(response.status).toBe(403);
		});
	});

	describe('PATCH /api/games/:inviteCode/stop', () => {
		it('allows host to stop a game', async () => {
			// Create and start a game
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

			await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/start`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				'host',
			);

			// Stop the game
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}/stop`,
				{
					method: 'PATCH',
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { ok: boolean };
			expect(data.ok).toBe(true);
		});
	});

	describe('DELETE /api/games/:inviteCode', () => {
		it('allows host to delete a game', async () => {
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

			// Delete the game
			const response = await fetchWithAuth(
				`http://localhost/api/games/${inviteCode}`,
				{
					method: 'DELETE',
				},
				'host',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { ok: boolean };
			expect(data.ok).toBe(true);
		});
	});

	afterEach(async () => {
		// Clean up database tables
		const db = (env as unknown as CloudflareBindings).DATABASE;
		// Cleanup all tables
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
