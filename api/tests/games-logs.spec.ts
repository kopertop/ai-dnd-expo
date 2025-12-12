import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyMigrations } from './apply-migrations';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Logs API', () => {
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

		// Run migrations on the D1 database
		const db = (env as CloudflareBindings).DATABASE;
		await applyMigrations(db);
		// Mock Database to use the real D1 database from Cloudflare Workers
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as CloudflareBindings);
	};

	describe('GET /api/games/:inviteCode/log', () => {
		it('returns activity logs for a game', async () => {
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

			// Get logs
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/log`, {
				method: 'GET',
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { logs: unknown[] };
			expect(data).toHaveProperty('logs');
			expect(Array.isArray(data.logs)).toBe(true);
		});
	});

	describe('POST /api/games/:inviteCode/log', () => {
		it('creates an activity log entry', async () => {
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

			// Create log
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/log`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'test',
					description: 'Test log entry',
					data: { test: true },
				}),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { id: string; success: boolean };
			expect(data).toHaveProperty('id');
			expect(data.success).toBe(true);
		});
	});

	describe('DELETE /api/games/:inviteCode/log', () => {
		it('clears all activity logs', async () => {
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

			// Clear logs
			const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/log`, {
				method: 'DELETE',
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as { success: boolean };
			expect(data.success).toBe(true);
		});
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite_%" AND name NOT LIKE "_%"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
