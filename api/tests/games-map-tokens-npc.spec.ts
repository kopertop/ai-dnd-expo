import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyMigrations } from './apply-migrations';

import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/shared/workers/db';

describe('Games Map Tokens - NPC Placement', () => {
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

	it('places an NPC token with the exact payload format', async () => {
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

		expect(createResponse.status).toBe(200);
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

		// Create the NPC definition that matches the payload
		const db = (env as CloudflareBindings).DATABASE;
		const npcId = 'npc_cbff11e2-8ab5-4397-a226-62913587058f';
		const npcSlug = 'goblin-raider';

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
				npcId,
				npcSlug,
				'Goblin Raider',
				'Raider',
				'chaotic',
				'hostile',
				'A goblin raider',
				20,
				15,
				1,
				'raider',
				JSON.stringify(['attack']),
				JSON.stringify({ STR: 8, DEX: 14, CON: 10 }),
				JSON.stringify([]),
				JSON.stringify([]),
				JSON.stringify({ color: '#3B2F1B' }),
				Date.now(),
				Date.now(),
			)
			.run();

		// Use the exact payload from the user
		const payload = {
			id: 'npc_cbff11e2-8ab5-4397-a226-62913587058f',
			tokenType: 'npc',
			x: 7,
			y: 3,
			label: 'Goblin Raider 2',
			color: '#3B2F1B',
			metadata: {
				tags: ['hostile', 'underground'],
				actionPoints: 3,
				maxActionPoints: 3,
				path: [
					{ x: 9, y: 5 },
					{ x: 8, y: 5 },
					{ x: 7, y: 5 },
					{ x: 7, y: 4 },
					{ x: 7, y: 3 },
				],
			},
			npcId: 'npc_cbff11e2-8ab5-4397-a226-62913587058f',
			overrideValidation: true,
		};

		const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/map/tokens`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { tokens: Array<{ id: string; npcId: string }> };
		expect(data.tokens).toBeInstanceOf(Array);
		expect(data.tokens.length).toBeGreaterThan(0);

		// Verify the token was created with the correct NPC reference
		const npcToken = data.tokens.find(t => t.id === payload.id || t.npcId === npcId);
		expect(npcToken).toBeDefined();
	});

	it('returns 404 when NPC does not exist', async () => {
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

		// Try to place an NPC that doesn't exist
		const payload = {
			id: 'token-1',
			tokenType: 'npc',
			x: 5,
			y: 5,
			label: 'Non-existent NPC',
			npcId: 'non-existent-npc-id',
		};

		const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/map/tokens`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(404);
		const error = (await response.json()) as { error: string };
		expect(error.error).toContain('not found');
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite_%" AND name NOT LIKE "_%"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
