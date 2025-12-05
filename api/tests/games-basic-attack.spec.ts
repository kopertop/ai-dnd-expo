import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CloudflareBindings } from '@/api/src/env';
import characterRoutes from '@/api/src/routes/characters';
import gameRoutes from '@/api/src/routes/games';
import * as combatHelpers from '@/api/src/utils/combat-helpers';
import * as diceRoller from '@/services/dice-roller';

describe('Basic attack actions', () => {
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

	const createGame = async () => {
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
		return createData.inviteCode;
	};

	const createCharacter = async (id: string, overrides: Partial<import('@/types/character').Character> = {}) => {
		const baseCharacter = {
			id,
			name: id,
			level: 1,
			race: 'Human',
			class: 'Fighter',
			stats: { STR: 16, DEX: 10, CON: 12 },
			skills: [],
			inventory: [],
			equipped: {},
			health: 12,
			maxHealth: 12,
			actionPoints: 2,
			maxActionPoints: 2,
		};

		const charResponse = await fetchWithAuth('http://localhost/api/characters', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...baseCharacter, ...overrides }),
		});

		expect(charResponse.status).toBe(200);
	};

	const performBasicAttack = async (inviteCode: string, attackerId: string, body: Record<string, unknown>) => {
		return fetchWithAuth(`http://localhost/api/games/${inviteCode}/characters/${attackerId}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ actionType: 'basic_attack', ...body }),
		});
	};

	it('returns a critical hit with maximum damage on natural 20', async () => {
		const inviteCode = await createGame();
		await createCharacter('attacker', { stats: { STR: 16, DEX: 10 }, actionPoints: 2 });
		await createCharacter('target', { health: 12, maxHealth: 12, stats: { DEX: 10 } });

		const attackSpy = vi.spyOn(diceRoller, 'rollDiceLocal').mockImplementation((notation: string) => {
			expect(notation).toBe('1d20+5');
			return {
				total: 25,
				rolls: [20],
				modifier: 5,
				breakdown: '20 + 5 = 25',
			};
		});

		const response = await performBasicAttack(inviteCode, 'attacker', { targetId: 'target', params: { attackType: 'melee' } });
		expect(response.status).toBe(200);

		const data = (await response.json()) as { actionResult: import('@/types/combat').BasicAttackResult; character: { actionPoints: number } };
		const { actionResult } = data;

		expect(attackSpy).toHaveBeenCalled();
		expect(actionResult.attackRoll.natural).toBe(20);
		expect(actionResult.attackRoll.critical).toBe(true);
		expect(actionResult.hit).toBe(true);
		expect(actionResult.damageRoll?.critical).toBe(true);
		expect(actionResult.damageRoll?.rolls).toEqual([8]);
		expect(actionResult.damageDealt).toBe(11);
		expect(actionResult.target.remainingHealth).toBe(1);
		expect(data.character.actionPoints).toBe(1);
	});

	it('marks a natural 1 as fumble and applies no damage', async () => {
		const inviteCode = await createGame();
		await createCharacter('attacker2', { stats: { STR: 16, DEX: 10 }, actionPoints: 2 });
		await createCharacter('target2', { health: 10, maxHealth: 10, stats: { DEX: 10 } });

		const attackSpy = vi.spyOn(diceRoller, 'rollDiceLocal').mockImplementation((notation: string) => {
			expect(notation).toBe('1d20+5');
			return {
				total: 6,
				rolls: [1],
				modifier: 5,
				breakdown: '1 + 5 = 6',
			};
		});
		const damageSpy = vi.spyOn(combatHelpers, 'rollDamageDice');

		const response = await performBasicAttack(inviteCode, 'attacker2', { targetId: 'target2', params: { attackType: 'melee' } });
		expect(response.status).toBe(200);

		const data = (await response.json()) as { actionResult: import('@/types/combat').BasicAttackResult };
		const { actionResult } = data;

		expect(attackSpy).toHaveBeenCalled();
		expect(actionResult.attackRoll.fumble).toBe(true);
		expect(actionResult.hit).toBe(false);
		expect(actionResult.damageDealt).toBe(0);
		expect(actionResult.damageRoll).toBeUndefined();
		expect(actionResult.target.remainingHealth).toBe(10);
		expect(damageSpy).not.toHaveBeenCalled();
	});

	it('misses when roll total is below target AC', async () => {
		const inviteCode = await createGame();
		await createCharacter('attacker3', { stats: { STR: 10, DEX: 10 }, actionPoints: 2 });
		await createCharacter('target3', { health: 15, maxHealth: 15, stats: { DEX: 18 } });

		const attackSpy = vi.spyOn(diceRoller, 'rollDiceLocal').mockImplementation((notation: string) => {
			expect(notation).toBe('1d20+2');
			return {
				total: 12,
				rolls: [10],
				modifier: 2,
				breakdown: '10 + 2 = 12',
			};
		});

		const response = await performBasicAttack(inviteCode, 'attacker3', { targetId: 'target3', params: { attackType: 'melee' } });
		expect(response.status).toBe(200);

		const data = (await response.json()) as { actionResult: import('@/types/combat').BasicAttackResult };
		const { actionResult } = data;

		expect(attackSpy).toHaveBeenCalled();
		expect(actionResult.hit).toBe(false);
		expect(actionResult.damageDealt).toBe(0);
		expect(actionResult.damageRoll).toBeUndefined();
		expect(actionResult.target.remainingHealth).toBe(15);
	});

	it('rejects attacks when no action points are available', async () => {
		const inviteCode = await createGame();
		await createCharacter('low-ap-attacker', { actionPoints: 0, maxActionPoints: 1 });
		await createCharacter('dummy-target', { health: 8, maxHealth: 8 });

		const response = await performBasicAttack(inviteCode, 'low-ap-attacker', { targetId: 'dummy-target', params: { attackType: 'melee' } });
		expect(response.status).toBe(400);

		const data = (await response.json()) as { error?: string };
		expect(data.error).toBe('Not enough action points');
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM ${table.name}`);
		}
		vi.restoreAllMocks();
	});
});
