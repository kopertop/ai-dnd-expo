import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import characterRoutes from '@/api/src/routes/characters';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Combat API', () => {
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
		testApp.route('/api/characters', characterRoutes);

		const db = (env as CloudflareBindings).DATABASE;
		const migrationFiles = await readdir(path.resolve(process.cwd(), 'api', 'migrations'));
		for (const migrationFile of migrationFiles) {
			await db.exec(await readFile(path.join(__dirname, '..', 'migrations', migrationFile), 'utf8'));
		}
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as CloudflareBindings);
	};

	describe('POST /api/games/:inviteCode/characters/:characterId/:action', () => {
		it('applies damage to a character', async () => {
			// Create a game and character
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

			// Create a character
			const charResponse = await fetchWithAuth('http://localhost/api/characters', {
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
			});

			expect(charResponse.status).toBe(200);

			// Apply damage
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/characters/char-1/damage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: 5 }),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { character: { health: number } };
			expect(data.character).toBeDefined();
			expect(data.character.health).toBe(15);
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
