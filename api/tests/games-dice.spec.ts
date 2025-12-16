import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/api/tests/cloudflare-test-shim';
import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Dice API', () => {
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

		const db = (env as unknown as CloudflareBindings).DATABASE;
		const migrationFiles = await readdir(path.resolve(process.cwd(), 'api', 'migrations'));
		for (const migrationFile of migrationFiles) {
			await db.exec(await readFile(path.join(__dirname, '..', 'migrations', migrationFile), 'utf8'));
		}
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as unknown as CloudflareBindings);
	};

	describe('POST /api/games/:inviteCode/dice/roll', () => {
		it('rolls dice with notation', async () => {
			// Create a game
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

			// Roll dice
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/dice/roll`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notation: '1d20+5',
					purpose: 'test roll',
				}),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { total: number; rolls: number[] };
			expect(data).toHaveProperty('total');
			expect(data).toHaveProperty('rolls');
			expect(Array.isArray(data.rolls)).toBe(true);
		});
	});

	afterEach(async () => {
		const db = (env as unknown as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
