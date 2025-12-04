import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import characterRoutes from '@/api/src/routes/characters';
import * as dbModule from '@/shared/workers/db';

describe('Characters API', () => {
	let testUser: { id: string; email: string; name?: string | null };
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof testUser | null } }>;

	beforeEach(async () => {
		testUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof testUser | null } }>();
		testApp.use('*', async (c, next) => {
			c.set('user', testUser);
			await next();
		});
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

	it('creates a character with the exact payload format and verifies trait is saved', async () => {
		const payload = {
			id: 'character-1764462473180-3c7rtuto0',
			level: 1,
			race: 'Elf',
			name: 'Slick',
			class: 'Ranger',
			trait: 'Celestial Blood',
			icon: '🏹',
			description: '# Dockside Orphan\nThe bustling docks were your home, and the streets your school. You learned to survive by your wits and your speed.\nYou became an expert pickpocket and master of shadows.\n\n# Artifact Embedded\nWhile exploring a ruin, you accidentally tripped over a switch and fell on top of an ancient artifact. The artifact became embedded next to your heart, and could not be removed. Sometimes it triggers randomly with unpredictable effects.\n\n# Your goal\nAs a child, your childhood friend was attacked and eaten by a large creature. You\'ve been searching for it ever since to take out your revenge.',
			stats: { STR: 9, DEX: 15, CON: 12, INT: 10, WIS: 15, CHA: 10 },
			skills: ['acrobatics', 'stealth', 'thievery', 'endurance'],
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
		};

		const response = await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { character: { id: string; name: string; race: string; class: string; trait?: string } };
		expect(data.character.id).toBe(payload.id);
		expect(data.character.name).toBe(payload.name);
		expect(data.character.race).toBe(payload.race);
		expect(data.character.class).toBe(payload.class);
		expect(data.character.trait).toBe(payload.trait);

		// Verify trait is persisted in the database by fetching the character again
		const listResponse = await fetchWithAuth('http://localhost/api/characters');
		const listData = (await listResponse.json()) as { characters: Array<{ id: string; trait?: string }> };
		const savedCharacter = listData.characters.find(c => c.id === payload.id);
		expect(savedCharacter).toBeDefined();
		expect(savedCharacter?.trait).toBe(payload.trait);
	});

	it('creates a character without trait and verifies it defaults to empty string', async () => {
		const payload = {
			id: 'char-no-trait',
			level: 1,
			race: 'Human',
			name: 'No Trait Hero',
			class: 'Fighter',
			stats: { STR: 14 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 10,
			maxHealth: 10,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
		};

		const response = await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { character: { id: string; name: string; trait?: string } };
		expect(data.character.id).toBe(payload.id);
		expect(data.character.name).toBe(payload.name);
		// Trait should be empty string (or undefined if not returned, but should be empty string in DB)
		expect(data.character.trait === '' || data.character.trait === undefined).toBe(true);

		// Verify trait is persisted as empty string in the database
		const listResponse = await fetchWithAuth('http://localhost/api/characters');
		const listData = (await listResponse.json()) as { characters: Array<{ id: string; trait?: string }> };
		const savedCharacter = listData.characters.find(c => c.id === payload.id);
		expect(savedCharacter).toBeDefined();
		// Trait should be empty string when not provided
		if (savedCharacter?.trait !== undefined) {
			expect(savedCharacter.trait).toBe('');
		}

		// Also verify directly from database that trait is not null
		const db = (env as CloudflareBindings).DATABASE;
		const dbResult = await db.prepare('SELECT trait FROM characters WHERE id = ?').bind(payload.id).first<{ trait: string }>();
		expect(dbResult).toBeDefined();
		expect(dbResult?.trait).toBe('');
	});

	it('lists user characters', async () => {
		// Create a character first
		const createPayload = {
			id: 'char-1',
			name: 'Test Hero',
			level: 1,
			race: 'Human',
			class: 'Fighter',
			stats: { STR: 14 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 10,
			maxHealth: 10,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
		};

		await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createPayload),
		});

		// List characters
		const response = await fetchWithAuth('http://localhost/api/characters');
		expect(response.status).toBe(200);
		const data = (await response.json()) as { characters: Array<{ id: string; name: string }> };
		expect(data.characters).toBeInstanceOf(Array);
		expect(data.characters.length).toBeGreaterThan(0);
		expect(data.characters.some(c => c.id === 'char-1')).toBe(true);
	});

	it('updates a character', async () => {
		// Create a character first
		const createPayload = {
			id: 'char-2',
			name: 'Original Name',
			level: 1,
			race: 'Elf',
			class: 'Wizard',
			stats: { INT: 16 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 8,
			maxHealth: 8,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
		};

		await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createPayload),
		});

		// Update the character
		const updateResponse = await fetchWithAuth('http://localhost/api/characters/char-2', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Updated Name', level: 2 }),
		});

		expect(updateResponse.status).toBe(200);
		const updateData = (await updateResponse.json()) as { character: { name: string; level: number } };
		expect(updateData.character.name).toBe('Updated Name');
		expect(updateData.character.level).toBe(2);
	});

	it('deletes a character', async () => {
		// Create a character first
		const createPayload = {
			id: 'char-3',
			name: 'To Be Deleted',
			level: 1,
			race: 'Human',
			class: 'Rogue',
			stats: { DEX: 15 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 8,
			maxHealth: 8,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
		};

		await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createPayload),
		});

		// Delete the character
		const deleteResponse = await fetchWithAuth('http://localhost/api/characters/char-3', {
			method: 'DELETE',
		});

		expect(deleteResponse.status).toBe(200);
		const deleteData = (await deleteResponse.json()) as { ok: boolean };
		expect(deleteData.ok).toBe(true);

		// Verify it's gone
		const listResponse = await fetchWithAuth('http://localhost/api/characters');
		const listData = (await listResponse.json()) as { characters: Array<{ id: string }> };
		expect(listData.characters.some(c => c.id === 'char-3')).toBe(false);
	});

	it('returns 401 when not authenticated', async () => {
		const unauthenticatedApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: null } }>();
		unauthenticatedApp.use('*', async (c, next) => {
			c.set('user', null);
			await next();
		});
		unauthenticatedApp.route('/api/characters', characterRoutes);

		const response = await unauthenticatedApp.fetch(
			new Request('http://localhost/api/characters'),
			env as CloudflareBindings,
		);

		expect(response.status).toBe(401);
	});

	it('returns 403 when trying to update another user\'s character', async () => {
		// Create a character as testUser
		const createPayload = {
			id: 'char-4',
			name: 'My Character',
			level: 1,
			race: 'Human',
			class: 'Fighter',
			stats: { STR: 14 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 10,
			maxHealth: 10,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
		};

		await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createPayload),
		});

		// Try to update as a different user
		const otherUser = { id: 'other-user', email: 'other@example.com', name: 'Other User' };
		const otherUserApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof otherUser | null } }>();
		otherUserApp.use('*', async (c, next) => {
			c.set('user', otherUser);
			await next();
		});
		otherUserApp.route('/api/characters', characterRoutes);

		const response = await otherUserApp.fetch(
			new Request('http://localhost/api/characters/char-4', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Hacked Name' }),
			}),
			env as CloudflareBindings,
		);

		expect(response.status).toBe(403);
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
	});
});
