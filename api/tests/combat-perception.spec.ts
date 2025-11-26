import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import games from '../src/routes/games';
import type { ActivityLogRow, CharacterRow, GameRow } from '../../shared/workers/db';
import * as dbModule from '../../shared/workers/db';

type TestUser = { id: string; email: string; name?: string | null };

const mockEnv = { DATABASE: {} as any };
const INVITE_CODE = 'invite-test';

const hostUser: TestUser = { id: 'host-1', email: 'host@example.com', name: 'Host' };
const playerUser: TestUser = { id: 'player-1', email: 'player@example.com', name: 'Player' };

const createGameRow = (): GameRow => ({
	id: 'game-1',
	invite_code: INVITE_CODE,
	host_id: hostUser.id,
	host_email: hostUser.email,
	quest_id: 'quest-1',
	quest_data: JSON.stringify({ name: 'Quest' }),
	world: 'world',
	starting_area: 'village',
	status: 'active',
	current_map_id: null,
	created_at: Date.now(),
	updated_at: Date.now(),
});

const createCharacterRow = (overrides: Partial<CharacterRow>): CharacterRow => ({
	id: 'char-default',
	player_id: playerUser.id,
	player_email: playerUser.email,
	name: 'Adventurer',
	level: 4,
	race: 'Human',
	class: 'Fighter',
	description: null,
	stats: JSON.stringify({ STR: 16, DEX: 12, CON: 12, INT: 10, WIS: 16, CHA: 10 }),
	skills: JSON.stringify(['perception']),
	inventory: JSON.stringify([]),
	equipped: JSON.stringify({}),
	health: 20,
	max_health: 20,
	action_points: 3,
	max_action_points: 3,
	created_at: Date.now(),
	updated_at: Date.now(),
	...overrides,
});

class MockDatabase {
	public activityLogs: ActivityLogRow[] = [];

	constructor(
		private game: GameRow,
		private characters: Map<string, CharacterRow>,
	) {}

	async getGameByInviteCode(inviteCode: string) {
		return inviteCode === this.game.invite_code ? this.game : null;
	}

	async getCharacterById(id: string) {
		return this.characters.get(id) ?? null;
	}

	async updateCharacter(id: string, updates: Partial<CharacterRow>) {
		const existing = this.characters.get(id);
		if (!existing) {
			return;
		}
		this.characters.set(id, {
			...existing,
			...updates,
			updated_at: Date.now(),
		});
	}

	async saveActivityLog(entry: ActivityLogRow) {
		this.activityLogs.push(entry);
	}

	async getNpcInstanceByToken() {
		return null;
	}

	async getNpcById() {
		return null;
	}

	async saveNpcInstance() {
		// no-op for character-only tests
	}
}

const createApp = (user: 'host' | 'player' = 'player') => {
	const app = new Hono<{ Variables: { user: TestUser | null } }>();
	app.use('*', async (c, next) => {
		if (user === 'host') {
			c.set('user', hostUser);
		} else if (user === 'player') {
			c.set('user', playerUser);
		} else {
			c.set('user', null);
		}
		await next();
	});
	app.route('/', games);
	return app;
};

describe('combat & perception routes', () => {
	let mockDb: MockDatabase;

	beforeEach(() => {
		const attacker = createCharacterRow({ id: 'char-attacker' });
		const defender = createCharacterRow({
			id: 'char-target',
			player_id: 'other-player',
			player_email: 'other@example.com',
			name: 'Target Dummy',
			stats: JSON.stringify({ STR: 10, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 8 }),
			skills: JSON.stringify([]),
			health: 12,
			max_health: 12,
		});

		mockDb = new MockDatabase(createGameRow(), new Map([
			[attacker.id, attacker],
			[defender.id, defender],
		]));

		vi.spyOn(dbModule, 'Database').mockImplementation(() => mockDb as unknown as dbModule.Database);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('allows a player to roll an active perception check', async () => {
		const app = createApp('player');
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75); // yields d20 roll of 16

		const response = await app.fetch(
			new Request(`http://test/${INVITE_CODE}/characters/char-attacker/perception-check`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dc: 18 }),
			}),
			mockEnv as any,
		);

		randomSpy.mockRestore();

		expect(response.status).toBe(200);
		const body = await response.json<{
			mode: string;
			total: number;
			roll: number;
			modifier: number;
			success: boolean;
		}>();
		expect(body.mode).toBe('active');
		expect(body.roll).toBe(16);
		expect(body.modifier).toBeGreaterThan(0);
		expect(body.total).toBe(body.roll + body.modifier);
		expect(body.success).toBe(true);
		expect(mockDb.activityLogs).toHaveLength(1);
	});

	it('resolves a basic attack and applies damage to the target character', async () => {
		const app = createApp('host');
		const randomSpy = vi
			.spyOn(Math, 'random')
			.mockReturnValueOnce(0.4) // attack roll => 9 on the d20
			.mockReturnValueOnce(0.2); // damage roll => 2 on the d8

		const response = await app.fetch(
			new Request(`http://test/${INVITE_CODE}/characters/char-attacker/actions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actionType: 'basic_attack',
					targetId: 'char-target',
				}),
			}),
			mockEnv as any,
		);

		randomSpy.mockRestore();

		expect(response.status).toBe(200);
		const body = await response.json<{
			actionResult: {
				type: string;
				hit: boolean;
				damageDealt: number;
				target: { remainingHealth: number };
			};
			character: { actionPoints: number };
		}>();

		expect(body.actionResult.type).toBe('basic_attack');
		expect(body.actionResult.hit).toBe(true);
		expect(body.actionResult.damageDealt).toBeGreaterThan(0);
		expect(body.actionResult.target.remainingHealth).toBeLessThan(12);
		expect(body.character.actionPoints).toBe(2); // spent one AP
		expect(mockDb.activityLogs).toHaveLength(1);
	});
});

