import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyMigrations } from './apply-migrations';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';

vi.mock('partyserver', async (importOriginal) => {
	const actual = await importOriginal<typeof import('partyserver')>();
	return {
		...actual,
		getServerByName: vi.fn().mockReturnValue({
			fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))),
		}),
	};
});

describe('DM dice roll API', () => {
	let user: { id: string; email: string; name?: string | null };
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof user | null } }>;

	beforeEach(async () => {
		user = { id: 'host-1', email: 'host@example.com', name: 'Host' };
		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof user | null } }>();
		testApp.use('*', async (c, next) => {
			c.set('user', user);
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

	const createGame = async () => {
		const quest = {
			id: 'quest-1',
			title: 'Quest',
			description: 'desc',
			objectives: [],
			createdAt: Date.now(),
			createdBy: user.email,
		};
		const createResponse = await fetchWithAuth('http://localhost/api/games', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				quest,
				world: 'Test',
				startingArea: 'Area',
				hostId: user.id,
				hostEmail: user.email,
			}),
		});
		const data = (await createResponse.json()) as { inviteCode: string };
		return data.inviteCode;
	};

	it('allows host to roll dice and appends message with diceRoll', async () => {
		const inviteCode = await createGame();
		const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/dice/dm-roll`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ numDice: 2, dieSize: 6, modifier: 1, label: 'Test Roll' }),
		});
		expect(response.status).toBe(200);
		const result = (await response.json()) as { rolls: number[]; total: number; notation: string };
		expect(result.notation).toBe('2d6+1');
		expect(Array.isArray(result.rolls)).toBe(true);

		const stateResponse = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/state`);
		expect(stateResponse.status).toBe(200);
		const state = (await stateResponse.json()) as { messages?: Array<{ diceRoll?: unknown }> };
		expect(state.messages?.some(m => m.diceRoll)).toBe(true);
	});

	it('forbids non-host users', async () => {
		const inviteCode = await createGame();
		user = { id: 'player-1', email: 'player@example.com', name: 'Player' };
		const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/dice/dm-roll`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ numDice: 1, dieSize: 20 }),
		});
		expect(response.status).toBe(403);
	});

	afterEach(async () => {
		// Wait a bit for pending IO
		await new Promise(resolve => setTimeout(resolve, 1000));
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite_%" AND name NOT LIKE "_%"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
