import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games NPCs API', () => {
	let hostUser: { id: string; email: string; name?: string | null };
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof hostUser | null } }>;

	beforeEach(async () => {
		hostUser = { id: 'host-123', email: 'host@example.com', name: 'Host User' };

		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof hostUser | null } }>();
		testApp.use('*', async (c, next) => {
			c.set('user', hostUser);
			await next();
		});
		testApp.route('/api/games', gameRoutes);

		const db = (env as CloudflareBindings).DATABASE;
		const migrationFiles = await readdir(path.join(__dirname, '..', 'migrations'));
		for (const migrationFile of migrationFiles) {
			await db.exec(await readFile(path.join(__dirname, '..', 'migrations', migrationFile), 'utf8'));
		}
		vi.spyOn(dbModule, 'Database').mockImplementation(() => {
			return new dbModule.Database((env as CloudflareBindings).DATABASE) as unknown as dbModule.Database;
		});
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as CloudflareBindings);
	};

	describe('GET /api/games/:inviteCode/npcs', () => {
		it('lists NPC definitions', async () => {
			// Create a game first
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth('http://localhost/api/games', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					quest,
					world: 'Test World',
					startingArea: 'Test Area',
					hostId: hostUser.id,
					hostEmail: hostUser.email,
				}),
			});

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Seed an NPC
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
					JSON.stringify({ DEX: 12 }),
					JSON.stringify(['Shield']),
					JSON.stringify([]),
					JSON.stringify({ color: '#222' }),
					Date.now(),
					Date.now(),
				)
				.run();

			// List NPCs
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/npcs`, {
				method: 'GET',
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { npcs: Array<{ slug: string }> };
			expect(data.npcs).toBeInstanceOf(Array);
			expect(data.npcs.length).toBeGreaterThan(0);
		});
	});

	describe('POST /api/games/:inviteCode/npcs', () => {
		it('places an NPC on the map', async () => {
			// Create a game and generate a map
			const quest = {
				id: 'quest-1',
				title: 'Test Quest',
				description: 'A test quest',
				objectives: [],
				createdAt: Date.now(),
				createdBy: hostUser.email,
			};

			const createResponse = await fetchWithAuth('http://localhost/api/games', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					quest,
					world: 'Test World',
					startingArea: 'Test Area',
					hostId: hostUser.id,
					hostEmail: hostUser.email,
				}),
			});

			const createData = (await createResponse.json()) as { inviteCode: string };
			const inviteCode = createData.inviteCode;

			// Generate a map
			await fetchWithAuth(`http://localhost/api/games/${inviteCode}/map/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					preset: 'forest',
					width: 10,
					height: 10,
				}),
			});

			// Seed an NPC
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
					JSON.stringify({ DEX: 12 }),
					JSON.stringify(['Shield']),
					JSON.stringify([]),
					JSON.stringify({ color: '#222' }),
					Date.now(),
					Date.now(),
				)
				.run();

			// Place NPC
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/npcs`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					npcId: 'guard',
					x: 5,
					y: 5,
					label: 'Guard at Gate',
				}),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { tokens: Array<{ npcId: string }> };
			expect(data.tokens).toBeInstanceOf(Array);
			expect(data.tokens.length).toBeGreaterThan(0);
		});
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});


