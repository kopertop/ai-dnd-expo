import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Turns API', () => {
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
		const migrationFiles = await readdir(path.resolve(process.cwd(), 'api', 'migrations'));
		for (const migrationFile of migrationFiles) {
			await db.exec(await readFile(path.join(__dirname, '..', 'migrations', migrationFile), 'utf8'));
		}
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as CloudflareBindings);
	};

	describe('POST /api/games/:inviteCode/initiative/roll', () => {
		it('rolls initiative for all entities', async () => {
			// Create a game and start it
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

			// Start the game
			await fetchWithAuth(`http://localhost/api/games/${inviteCode}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			// Roll initiative
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/initiative/roll`, {
				method: 'POST',
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { initiativeOrder: unknown[] };
			expect(data).toHaveProperty('initiativeOrder');
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
