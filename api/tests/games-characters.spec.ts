import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/api/tests/cloudflare-test-shim';
import type { CloudflareBindings } from '@/api/src/env';
import gameRoutes from '@/api/src/routes/games';
import * as dbModule from '@/db';

describe('Games Character Routes - Game-specific endpoints', () => {
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

	it('returns all characters in a game (host only)', async () => {
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

		// Create a character for the host
		const characterPayload = {
			id: 'char-1',
			name: 'Host Character',
			level: 1,
			race: 'Human',
			class: 'Fighter',
			stats: { STR: 14, DEX: 12, CON: 13, INT: 10, WIS: 11, CHA: 9 },
			skills: [],
			inventory: [],
			equipped: {
				helmet: null,
				chest: null,
				arms: null,
				legs: null,
				boots: null,
				mainHand: null,
				offHand: null,
				accessory: null,
			},
			health: 10,
			maxHealth: 10,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
			preparedSpells: [],
		};

		// Create character via the characters API
		const db = (env as CloudflareBindings).DATABASE;
		const { Database } = await import('@/db');
		const dbInstance = new Database(db);
		const { serializeCharacter } = await import('@/api/src/utils/games-utils');
		const serialized = serializeCharacter(characterPayload, hostUser.id, hostUser.email);
		await dbInstance.createCharacter(serialized);

		// Join the game with this character
		await fetchWithAuth(`http://localhost/api/games/${inviteCode}/join`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				inviteCode,
				characterId: 'char-1',
				playerId: hostUser.id,
				playerEmail: hostUser.email,
			}),
		});

		// Get all characters in the game (host only)
		const response = await fetchWithAuth(`http://localhost/api/games/${inviteCode}/characters`);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { characters: Array<{ id: string; name: string }> };
		expect(data.characters).toBeInstanceOf(Array);
		expect(data.characters.length).toBeGreaterThan(0);
		expect(data.characters.some(c => c.id === 'char-1')).toBe(true);
	});

	it('returns 403 when non-host tries to access game characters', async () => {
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

		// Try to access as a different user (non-host)
		const otherUser = { id: 'other-user', email: 'other@example.com', name: 'Other User' };
		const otherUserApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof otherUser | null } }>();
		otherUserApp.use('*', async (c, next) => {
			c.set('user', otherUser);
			await next();
		});
		otherUserApp.route('/api/games', gameRoutes);

		const response = await otherUserApp.fetch(
			new Request(`http://localhost/api/games/${inviteCode}/characters`),
			env as CloudflareBindings,
		);

		expect(response.status).toBe(403);
	});

	it('returns 404 when game does not exist', async () => {
		const response = await fetchWithAuth('http://localhost/api/games/non-existent-game/characters');
		expect(response.status).toBe(404);
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
