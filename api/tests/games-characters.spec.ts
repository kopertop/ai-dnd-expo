import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import games from '../src/routes/games';
import type { CharacterRow } from '../../shared/workers/db';
import * as dbModule from '../../shared/workers/db';

type MockUser = { id: string; email: string };

class MockCharacterDatabase {
	private records = new Map<string, CharacterRow>();

	constructor(initial: CharacterRow[] = []) {
		initial.forEach(record => this.records.set(record.id, record));
	}

	async getCharactersByPlayerIdentity(playerId?: string, playerEmail?: string | null) {
		return Array.from(this.records.values()).filter(
			character => character.player_id === playerId || character.player_email === playerEmail,
		);
	}

	async createCharacter(character: CharacterRow) {
		this.records.set(character.id, character);
	}

	async updateCharacter(id: string, updates: Partial<CharacterRow>) {
		const existing = this.records.get(id);
		if (!existing) return;
		this.records.set(id, { ...existing, ...updates });
	}

	async getCharacterById(id: string) {
		return this.records.get(id) ?? null;
	}

	async deleteCharacter(id: string) {
		this.records.delete(id);
	}
}

const mockEnv = { DATABASE: {} as any };

const createApp = (user?: MockUser) => {
	const app = new Hono();
	if (user) {
		app.use('*', async (c, next) => {
			(c as any).set('user', user);
			await next();
		});
	}
	app.route('/', games);
	return app;
};

describe('games character routes', () => {
	const mockUser: MockUser = { id: 'user-1', email: 'user@example.com' };
	let mockDb: MockCharacterDatabase;

	beforeEach(() => {
		mockDb = new MockCharacterDatabase([
			{
				id: 'char-1',
				player_id: 'user-1',
				player_email: 'user@example.com',
				name: 'Hero',
				level: 2,
				race: 'Human',
				class: 'Fighter',
				description: null,
				stats: JSON.stringify({ STR: 14 }),
				skills: JSON.stringify([]),
				inventory: JSON.stringify([]),
				equipped: JSON.stringify({}),
				health: 15,
				max_health: 15,
				action_points: 3,
				max_action_points: 3,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		]);

		vi.spyOn(dbModule, 'Database').mockImplementation(() => mockDb as unknown as dbModule.Database);
	});

	it('returns characters for the authenticated user', async () => {
		const app = createApp(mockUser);
		const res = await app.fetch(new Request('http://test/me/characters'), mockEnv);
		expect(res.status).toBe(200);
		const body = await res.json<{ characters: Array<{ id: string }> }>();
		expect(body.characters).toHaveLength(1);
		expect(body.characters[0].id).toBe('char-1');
	});

	it('creates a new character via POST', async () => {
		const app = createApp(mockUser);
		const res = await app.fetch(
			new Request('http://test/me/characters', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: 'char-2',
					name: 'Mage',
					level: 1,
					race: 'Elf',
					class: 'Wizard',
					description: '',
					stats: { INT: 16 },
					skills: [],
					inventory: [],
					equipped: {},
					health: 8,
					maxHealth: 8,
					actionPoints: 3,
					maxActionPoints: 3,
				}),
			}),
			mockEnv,
		);

		expect(res.status).toBe(200);
		const created = await res.json<{ character: { id: string } }>();
		expect(created.character.id).toBe('char-2');
		const list = await app.fetch(new Request('http://test/me/characters'), mockEnv);
		const data = await list.json<{ characters: Array<{ id: string }> }>();
		expect(data.characters).toHaveLength(2);
	});

	it('updates an existing character', async () => {
		const app = createApp(mockUser);
		const res = await app.fetch(
			new Request('http://test/me/characters/char-1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Veteran Hero' }),
			}),
			mockEnv,
		);
		expect(res.status).toBe(200);
		const body = await res.json<{ character: { name: string } }>();
		expect(body.character.name).toBe('Veteran Hero');
	});

	it('deletes a character owned by the user', async () => {
		const app = createApp(mockUser);
		const res = await app.fetch(
			new Request('http://test/me/characters/char-1', {
				method: 'DELETE',
			}),
			mockEnv,
		);

		expect(res.status).toBe(200);
		const list = await app.fetch(new Request('http://test/me/characters'), mockEnv);
		const body = await list.json<{ characters: Array<{ id: string }> }>();
		expect(body.characters).toHaveLength(0);
	});
});

