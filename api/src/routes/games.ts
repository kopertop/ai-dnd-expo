import type { Context } from 'hono';
import { Hono } from 'hono';

import { CharacterRow, Database, GameRow, MapRow, MapTokenRow, NpcInstanceRow, NpcRow } from '../../../shared/workers/db';
import { generateProceduralMap, MapGeneratorPreset } from '../../../shared/workers/map-generator';
import { generateInviteCode } from '../../../shared/workers/session-manager';
import type { CloudflareBindings } from '../env';

import { GameStateService } from '@/api/src/services/game-state';
import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { findSpellByName } from '@/constants/spells';
import { parseDiceNotation, rollDiceLocal } from '@/services/dice-roller';
import { Character } from '@/types/character';
import type {
	BasicAttackResult,
	CharacterActionResult,
	CombatTargetSummary,
	DiceRollSummary,
	SpellCastResult,
} from '@/types/combat';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { Quest } from '@/types/quest';
import type { SpellDefinition } from '@/types/spell';
import {
	calculateAC,
	calculateAttackBonus,
	calculatePassivePerception,
	calculateProficiencyBonus,
	getAbilityModifier,
	getAbilityScore,
	getSpellcastingAbilityModifier,
	isSkillProficient,
} from '@/utils/combat-utils';
import { getTerrainCost } from '@/utils/movement-calculator';
import { mapStateFromDb, npcFromDb } from '@/utils/schema-adapters';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

type GamesContext = { Bindings: CloudflareBindings; Variables: Variables };

interface CreateGameBody {
	questId?: string;
	quest?: Quest;
	world: string;
	startingArea: string;
	hostId?: string;
	hostEmail?: string;
	hostCharacter?: Character;
	currentMapId?: string;
}

interface JoinGameBody {
	inviteCode: string;
	characterId?: string;
	character?: Character;
	playerId?: string;
	playerEmail?: string;
}

const games = new Hono<GamesContext>();

const normalizePath = (path: string): string => (path.startsWith('/') ? path : `/${path}`);

// buildDurableRequest removed - no longer needed without Durable Object

const jsonWithStatus = <T>(_: Context<GamesContext>, payload: T, status: number) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const createId = (prefix: string) => {
	if (globalThis.crypto?.randomUUID) {
		return `${prefix}_${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}_${Math.random().toString(36).slice(2)}`;
};

type CharacterAttackTarget = {
	type: 'character';
	row: CharacterRow;
	character: Character;
	armorClass: number;
};

type NpcAttackTarget = {
	type: 'npc';
	instance: NpcInstanceRow;
	npcDefinition?: NpcRow | null;
	armorClass: number;
};

type AttackTarget = CharacterAttackTarget | NpcAttackTarget;

const rollDie = (sides: number): number => Math.floor(Math.random() * sides) + 1;

const formatModifierText = (modifier: number): string => {
	if (modifier === 0) {
		return '';
	}
	return modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
};

const rollDamageDice = (notation: string, abilityModifier: number, critical: boolean): DiceRollSummary => {
	const parsed = parseDiceNotation(notation);
	if (!parsed) {
		throw new Error(`Invalid damage dice: ${notation}`);
	}

	const totalDice = critical ? parsed.numDice * 2 : parsed.numDice;
	const rolls = Array.from({ length: totalDice }, () => rollDie(parsed.dieSize));
	const modifier = parsed.modifier + abilityModifier;
	const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

	return {
		notation,
		rolls,
		modifier,
		total,
		breakdown: `${rolls.join(' + ')}${formatModifierText(modifier)} = ${total}`,
		critical,
	};
};

const resolveAttackTarget = async (db: Database, targetId: string): Promise<AttackTarget | null> => {
	const characterRow = await db.getCharacterById(targetId);
	if (characterRow) {
		const character = deserializeCharacter(characterRow);
		return {
			type: 'character',
			row: characterRow,
			character,
			armorClass: calculateAC(character),
		};
	}

	const npcInstance = await db.getNpcInstanceByToken(targetId);
	if (npcInstance) {
		const npcDefinition = await db.getNpcById(npcInstance.npc_id);
		const armorClass = npcDefinition?.base_armor_class ?? 12;
		return {
			type: 'npc',
			instance: npcInstance,
			npcDefinition,
			armorClass,
		};
	}

	return null;
};

const applyDamageToTarget = async (db: Database, target: AttackTarget, damage: number): Promise<number> => {
	if (damage <= 0) {
		return target.type === 'character' ? target.row.health : target.instance.current_health;
	}

	if (target.type === 'character') {
		const remainingHealth = Math.max(0, target.row.health - damage);
		await db.updateCharacter(target.row.id, { health: remainingHealth });
		return remainingHealth;
	}

	const remainingHealth = Math.max(0, target.instance.current_health - damage);
	await db.saveNpcInstance({
		...target.instance,
		current_health: remainingHealth,
		metadata: target.instance.metadata,
		status_effects: target.instance.status_effects,
	});
	return remainingHealth;
};

type BasicAttackOptions = {
	db: Database;
	attacker: Character;
	targetId?: string;
	params?: Record<string, unknown>;
};

type SpellCastOptions = {
	db: Database;
	attacker: Character;
	spellName?: string;
	targetId?: string;
	params?: Record<string, unknown>;
};

const getAttackStyle = (params?: Record<string, unknown>): 'melee' | 'ranged' => {
	const requested = typeof params?.attackType === 'string' ? params.attackType.toLowerCase() : 'melee';
	return requested === 'ranged' ? 'ranged' : 'melee';
};

const getDamageDice = (attackStyle: 'melee' | 'ranged', customDice?: unknown): string => {
	if (typeof customDice === 'string' && customDice.trim().length > 0) {
		return customDice.trim();
	}
	return attackStyle === 'ranged' ? '1d6' : '1d8';
};

const handleBasicAttack = async ({
	db,
	attacker,
	targetId,
	params,
}: BasicAttackOptions): Promise<{ result: BasicAttackResult } | { error: string; status?: number }> => {
	if (!targetId) {
		return { error: 'Target is required', status: 400 };
	}

	const target = await resolveAttackTarget(db, targetId);
	if (!target) {
		return { error: 'Target not found', status: 404 };
	}

	const attackStyle = getAttackStyle(params);
	const attackBonus = calculateAttackBonus(attacker, attackStyle);
	const attackNotation = `1d20${attackBonus >= 0 ? `+${attackBonus}` : attackBonus}`;
	const attackRoll = rollDiceLocal(attackNotation);
	const naturalRoll = attackRoll.rolls[0] ?? 0;
	const critical = naturalRoll === 20;
	const fumble = naturalRoll === 1;
	const hit =
		critical || (!fumble && attackRoll.total >= target.armorClass);

	let damageRoll: DiceRollSummary | undefined;
	let damageDealt = 0;
	let remainingHealth =
		target.type === 'character' ? target.row.health : target.instance.current_health;

	if (hit) {
		const abilityKey = attackStyle === 'ranged' ? 'DEX' : 'STR';
		const abilityModifier = getAbilityModifier(getAbilityScore(attacker, abilityKey));
		const damageDice = getDamageDice(attackStyle, params?.damageDice);
		damageRoll = rollDamageDice(damageDice, abilityModifier, critical);
		damageDealt = Math.max(0, damageRoll.total);
		remainingHealth = await applyDamageToTarget(db, target, damageDealt);
	}

	const result: BasicAttackResult = {
		type: 'basic_attack',
		attackStyle,
		target: {
			type: target.type,
			id: target.type === 'character' ? target.row.id : target.instance.token_id,
			name: target.type === 'character' ? target.character.name : target.instance.name,
			armorClass: target.armorClass,
			remainingHealth,
			maxHealth: target.type === 'character' ? target.row.max_health : target.instance.max_health,
		},
		attackRoll: {
			notation: attackNotation,
			rolls: attackRoll.rolls,
			modifier: attackRoll.modifier,
			total: attackRoll.total,
			breakdown: attackRoll.breakdown,
			targetAC: target.armorClass,
			natural: naturalRoll,
			critical,
			fumble,
		},
		hit,
		damageRoll,
		damageDealt,
	};

	return { result };
};

const getSpellAttackBonus = (attacker: Character, spell: SpellDefinition): number => {
	if (spell.attackAbilityOverride) {
		const abilityScore = getAbilityScore(attacker, spell.attackAbilityOverride);
		return getAbilityModifier(abilityScore) + calculateProficiencyBonus(attacker.level);
	}
	return calculateAttackBonus(attacker, 'spell');
};

const getSpellDamageModifier = (attacker: Character, spell: SpellDefinition): number => {
	if (!spell.damageAbility) {
		return 0;
	}
	if (spell.damageAbility === 'spellcasting') {
		return getSpellcastingAbilityModifier(attacker);
	}
	return getAbilityModifier(getAbilityScore(attacker, spell.damageAbility));
};

const buildTargetSummary = (target?: AttackTarget | null): CombatTargetSummary | undefined => {
	if (!target) {
		return undefined;
	}
	return {
		type: target.type,
		id: target.type === 'character' ? target.row.id : target.instance.token_id,
		name: target.type === 'character' ? target.character.name : target.instance.name,
		armorClass: target.armorClass,
		remainingHealth: target.type === 'character' ? target.row.health : target.instance.current_health,
		maxHealth: target.type === 'character' ? target.row.max_health : target.instance.max_health,
	};
};

const handleSpellCast = async ({
	db,
	attacker,
	spellName,
	targetId,
	params,
}: SpellCastOptions): Promise<{ result: SpellCastResult } | { error: string; status?: number }> => {
	if (!spellName) {
		return { error: 'spellName is required', status: 400 };
	}

	const spell = findSpellByName(spellName);
	if (!spell) {
		return { error: 'Spell not found', status: 404 };
	}

	if ((spell.attackType === 'attack' || spell.attackType === 'auto-hit') && !spell.damageDice) {
		return { error: 'Spell has no damage dice configured', status: 400 };
	}

	let target: AttackTarget | null = null;
	const needsTarget = spell.attackType === 'attack' || spell.attackType === 'auto-hit';
	if (needsTarget) {
		if (!targetId) {
			return { error: 'Target is required', status: 400 };
		}
		target = await resolveAttackTarget(db, targetId);
		if (!target) {
			return { error: 'Target not found', status: 404 };
		}
	}

	const result: SpellCastResult = {
		type: 'spell',
		spellId: spell.id,
		spellName: spell.name,
		attackType: spell.attackType,
		target: buildTargetSummary(target),
	};

	switch (spell.attackType) {
		case 'attack': {
			if (!spell.damageDice || !target) {
				return { error: 'Spell configuration incomplete', status: 400 };
			}

			const attackBonus = getSpellAttackBonus(attacker, spell);
			const attackNotation = `1d20${attackBonus >= 0 ? `+${attackBonus}` : attackBonus}`;
			const attackRoll = rollDiceLocal(attackNotation);
			const naturalRoll = attackRoll.rolls[0] ?? 0;
			const critical = naturalRoll === 20;
			const fumble = naturalRoll === 1;
			const hit = critical || (!fumble && attackRoll.total >= target.armorClass);

			result.attackRoll = {
				notation: attackNotation,
				rolls: attackRoll.rolls,
				modifier: attackRoll.modifier,
				total: attackRoll.total,
				breakdown: attackRoll.breakdown,
				targetAC: target.armorClass,
				natural: naturalRoll,
				critical,
				fumble,
			};
			result.hit = hit;

			if (hit) {
				const damageModifier = getSpellDamageModifier(attacker, spell);
				const damageDice =
					typeof params?.damageDice === 'string' && params.damageDice.trim().length
						? params.damageDice.trim()
						: spell.damageDice;
				if (!damageDice) {
					return { error: 'Spell damage dice missing', status: 400 };
				}

				const damageRoll = rollDamageDice(damageDice, damageModifier, critical);
				const damageDealt = Math.max(0, damageRoll.total);
				const remainingHealth = await applyDamageToTarget(db, target, damageDealt);

				result.damageRoll = damageRoll;
				result.damageDealt = damageDealt;
				if (result.target) {
					result.target.remainingHealth = remainingHealth;
				};
			}
			break;
		}

		case 'auto-hit': {
			if (!spell.damageDice || !target) {
				return { error: 'Spell configuration incomplete', status: 400 };
			}
			const damageModifier = getSpellDamageModifier(attacker, spell);
			const damageDice =
				typeof params?.damageDice === 'string' && params.damageDice.trim().length
					? params.damageDice.trim()
					: spell.damageDice;
			const damageRoll = rollDamageDice(damageDice, damageModifier, false);
			const damageDealt = Math.max(0, damageRoll.total);
			const remainingHealth = await applyDamageToTarget(db, target, damageDealt);

			result.hit = true;
			result.damageRoll = damageRoll;
			result.damageDealt = damageDealt;
			if (result.target) {
				result.target.remainingHealth = remainingHealth;
			}
			break;
		}

		case 'save':
			return { error: 'Saving throw spells are not supported yet', status: 400 };

		case 'support':
			return { error: 'Support spells are not supported yet', status: 400 };

		default:
			return { error: 'Unsupported spell type', status: 400 };
	}

	return { result };
};

const isHostUser = (game: GameRow, user: Variables['user']) => {
	if (!user) {
		return false;
	}

	if (game.host_id && game.host_id === user.id) {
		return true;
	}

	if (game.host_email && user.email && game.host_email === user.email) {
		return true;
	}

	return false;
};

const resolveMapRow = async (db: Database, game: GameRow): Promise<MapRow> => {
	if (game.current_map_id) {
		const existing = await db.getMapById(game.current_map_id);
		if (existing) {
			return existing;
		}
	}

	const maps = await db.listMaps();
	if (!maps.length) {
		throw new Error('No maps available');
	}

	const fallback = maps[0];
	await db.updateGameMap(game.id, fallback.id);
	return fallback;
};

const buildMapState = async (db: Database, game: GameRow) => {
	const mapRow = await resolveMapRow(db, game);
	const [tiles, tokens] = await Promise.all([
		db.getMapTiles(mapRow.id),
		db.listMapTokensForGame(game.id),
	]);
	return mapStateFromDb(mapRow, { tiles, tokens });
};

const slugifyName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'npc';

const npcInstanceToResponse = (instance: NpcInstanceRow) => ({
	id: instance.id,
	tokenId: instance.token_id,
	npcId: instance.npc_id,
	name: instance.name,
	disposition: instance.disposition,
	currentHealth: instance.current_health,
	maxHealth: instance.max_health,
	statusEffects: JSON.parse(instance.status_effects || '[]'),
	isFriendly: Boolean(instance.is_friendly),
	metadata: JSON.parse(instance.metadata || '{}'),
	updatedAt: instance.updated_at,
});

const createCustomNpcDefinition = async (
	db: Database,
	hostId: string,
	custom: {
		name: string;
		role: string;
		alignment: string;
		disposition: string;
		description?: string;
		maxHealth?: number;
		armorClass?: number;
		challengeRating?: number;
		color?: string;
	},
) => {
	const slug = `${slugifyName(custom.name)}_${hostId.slice(0, 6)}`;
	const npcId = `npc_${slug}_${Date.now()}`;
	const now = Date.now();
	await db.saveNpcDefinition({
		id: npcId,
		slug,
		name: custom.name,
		role: custom.role || 'custom',
		alignment: custom.alignment || 'neutral',
		disposition: custom.disposition || 'neutral',
		description: custom.description ?? null,
		base_health: custom.maxHealth ?? 10,
		base_armor_class: custom.armorClass ?? 12,
		challenge_rating: custom.challengeRating ?? 1,
		archetype: 'custom',
		default_actions: JSON.stringify(['attack']),
		stats: JSON.stringify({}),
		abilities: JSON.stringify([]),
		loot_table: JSON.stringify([]),
		metadata: JSON.stringify({ color: custom.color ?? '#3B2F1B', createdBy: hostId }),
		created_at: now,
		updated_at: now,
	});

	const created = await db.getNpcBySlug(slug);
	if (!created) {
		throw new Error('Failed to create NPC definition');
	}
	return created;
};

const serializeCharacter = (
	character: Character,
	playerId: string,
	playerEmail?: string | null,
) => ({
	id: character.id,
	player_id: playerId,
	player_email: playerEmail || null,
	name: character.name,
	level: character.level,
	race: character.race,
	class: character.class,
	description: character.description || null,
	trait: character.trait || null,
	stats: JSON.stringify(character.stats),
	skills: JSON.stringify(character.skills || []),
	inventory: JSON.stringify(character.inventory || []),
	equipped: JSON.stringify(character.equipped || {}),
	health: character.health,
	max_health: character.maxHealth,
	action_points: character.actionPoints,
	max_action_points: character.maxActionPoints,
});

const deserializeCharacter = (row: CharacterRow): Character => ({
	id: row.id,
	level: row.level,
	race: row.race,
	name: row.name,
	class: row.class,
	description: row.description || undefined,
	trait: row.trait || undefined,
	stats: JSON.parse(row.stats),
	skills: JSON.parse(row.skills || '[]'),
	inventory: JSON.parse(row.inventory || '[]'),
	equipped: JSON.parse(row.equipped || '{}'),
	health: row.health,
	maxHealth: row.max_health,
	actionPoints: row.action_points,
	maxActionPoints: row.max_action_points,
});

const parseQuestData = (questJson: string): Quest => {
	try {
		const parsed = JSON.parse(questJson);
		return {
			...parsed,
			objectives: parsed.objectives ?? [],
			createdAt: parsed.createdAt ?? Date.now(),
		} as Quest;
	} catch (error) {
		console.error('Failed to parse quest data:', error);
		throw error;
	}
};

const toGameSummary = (game: GameRow) => ({
	id: game.id,
	inviteCode: game.invite_code,
	status: game.status,
	hostId: game.host_id,
	hostEmail: game.host_email,
	world: game.world,
	startingArea: game.starting_area,
	quest: parseQuestData(game.quest_data),
	currentMapId: game.current_map_id,
	createdAt: game.created_at,
	updatedAt: game.updated_at,
});

games.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = (await c.req.json()) as CreateGameBody;
	const { questId, quest, world, startingArea, hostId, hostEmail, hostCharacter, currentMapId } = body;
	const resolvedHostId = hostId ?? user.id;
	const resolvedHostEmail = hostEmail ?? user.email ?? undefined;

	if (!resolvedHostId) {
		return c.json({ error: 'Host identity is required' }, 400);
	}

	if (!questId && !quest) {
		return c.json({ error: 'Quest ID or quest data is required' }, 400);
	}

	const db = new Database(c.env.DATABASE);

	let questData: Quest | null = quest ?? null;
	if (!questData && questId) {
		const questString = await c.env.QUESTS.get(questId);
		if (!questString) {
			return c.json({ error: 'Quest not found. Please provide quest data in the request body.' }, 404);
		}
		questData = JSON.parse(questString);
	}

	if (!questData) {
		return c.json({ error: 'Quest data is required' }, 400);
	}

	const inviteCode = generateInviteCode();
	const gameId = createId('game');
	const persistedQuest = {
		...questData,
		objectives: questData.objectives ?? [],
		createdAt: questData.createdAt ?? Date.now(),
		createdBy: questData.createdBy ?? (resolvedHostEmail || user.email || 'host'),
	};

	await db.createGame({
		id: gameId,
		invite_code: inviteCode,
		host_id: resolvedHostId,
		host_email: resolvedHostEmail || user.email || null,
		quest_id: persistedQuest.id,
		quest_data: JSON.stringify(persistedQuest),
		world,
		starting_area: startingArea,
		status: 'waiting',
		current_map_id: currentMapId || null,
	});

	if (hostCharacter) {
		const serializedCharacter = serializeCharacter(
			hostCharacter,
			resolvedHostId,
			resolvedHostEmail || user.email || null,
		);

		const existingCharacter = await db.getCharacterById(hostCharacter.id);
		if (existingCharacter) {
			await db.updateCharacter(hostCharacter.id, serializedCharacter);
		} else {
			await db.createCharacter(serializedCharacter);
		}

		await db.addPlayerToGame({
			game_id: gameId,
			player_id: resolvedHostId,
			player_email: resolvedHostEmail || user.email || null,
			character_id: hostCharacter.id,
			character_name: hostCharacter.name,
			joined_at: Date.now(),
		});

	}

	// Return the game state
	const gameStateService = new GameStateService(db);
	const game = await db.getGameByInviteCode(inviteCode);
	if (!game) {
		return c.json({ error: 'Failed to load game' }, 500);
	}
	const state = await gameStateService.getState(game);
	return c.json(state);
});

games.get('/me', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = new Database(c.env.DATABASE);
	const hostedGames = await db.getGamesHostedByUser(user.id, user.email);
	const memberships = await db.getGameMembershipsForPlayer(user.id, user.email);

	const joinedSummariesMap = new Map<string, ReturnType<typeof toGameSummary> & {
		characterId?: string;
		characterName?: string;
		joinedAt?: number;
	}>();

	for (const membership of memberships) {
		const existing = joinedSummariesMap.get(membership.game_id);
		if (existing) {
			continue;
		}

		const game = await db.getGameById(membership.game_id);
		if (!game) {
			continue;
		}

		joinedSummariesMap.set(membership.game_id, {
			...toGameSummary(game),
			characterId: membership.character_id,
			characterName: membership.character_name,
			joinedAt: membership.joined_at,
		});
	}

	return c.json({
		hostedGames: hostedGames.map(toGameSummary),
		joinedGames: Array.from(joinedSummariesMap.values()),
	});
});

games.get('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = new Database(c.env.DATABASE);
	const characterRows = await db.getCharactersByPlayerIdentity(user.id, user.email);

	// Use map to de-duplicate characters that match both ID and email
	const deduped = new Map<string, Character>();
	for (const row of characterRows) {
		deduped.set(row.id, deserializeCharacter(row));
	}

	return c.json({ characters: Array.from(deduped.values()) });
});

games.post('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const payload = (await c.req.json()) as Character;
	const characterId = payload.id || createId('char');
	const db = new Database(c.env.DATABASE);
	const serialized = serializeCharacter(
		{ ...payload, id: characterId },
		user.id,
		user.email,
	);
	await db.createCharacter(serialized);
	const saved = await db.getCharacterById(characterId);
	return c.json({ character: saved ? deserializeCharacter(saved) : payload });
});

games.put('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const updates = (await c.req.json()) as Partial<Character>;
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const serializedUpdate = serializeCharacter(
		{ ...deserializeCharacter(existing), ...updates, id: characterId },
		existing.player_id || user.id,
		existing.player_email || user.email,
	);
	await db.updateCharacter(characterId, serializedUpdate);
	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : updates });
});

games.delete('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await db.deleteCharacter(characterId);
	return c.json({ ok: true });
});

games.patch('/:inviteCode/stop', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden - Only the host can stop this game' }, 403);
	}

	// Change game status back to 'waiting' to allow lobby access
	await db.updateGameStatus(game.id, 'waiting');

	return c.json({ ok: true, message: 'Game stopped successfully' });
});

games.delete('/:inviteCode', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden - Only the host can delete this game' }, 403);
	}

	// Delete the game and all related data
	await db.deleteGame(game.id);

	// Note: Durable Objects are automatically garbage collected after inactivity
	// We don't need to explicitly delete the Durable Object

	return c.json({ ok: true, message: 'Game deleted successfully' });
});

games.get('/:inviteCode', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	try {
		const gameStateService = new GameStateService(db);
		const sessionData = await gameStateService.getState(game);

		// Add currentMapId, world, and startingArea from database (in case session doesn't have them)
		// Create response object with additional properties
		const response = {
			...sessionData,
			currentMapId: game.current_map_id,
			// Use gameWorld from state, fallback to database world
			gameWorld: sessionData.gameWorld || game.world,
			// Ensure startingArea is set
			startingArea: sessionData.startingArea || game.starting_area,
		};

		return c.json(response);
	} catch (error) {
		console.error('Failed to fetch game state:', error);
		return c.json({ error: 'Failed to fetch game state', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

games.post('/:inviteCode/join', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const body = (await c.req.json()) as JoinGameBody;
	const { character } = body;
	const playerId = body.playerId || user.id;
	const playerEmail = body.playerEmail || user.email || null;

	if (!character) {
		return c.json({ error: 'Character data is required' }, 400);
	}

	if (!playerId) {
		return c.json({ error: 'Player identity is required' }, 400);
	}

	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const serializedCharacter = serializeCharacter(character, playerId, playerEmail);
	const existingCharacter = await db.getCharacterById(character.id);

	if (existingCharacter) {
		await db.updateCharacter(character.id, serializedCharacter);
	} else {
		await db.createCharacter(serializedCharacter);
	}

	const existingMemberships = await db.getGamePlayers(game.id);
	const existingPlayer = existingMemberships.find(player => player.player_id === playerId);
	if (existingPlayer) {
		await db.removePlayerFromGame(game.id, playerId);
	}

	await db.addPlayerToGame({
		game_id: game.id,
		player_id: playerId,
		player_email: playerEmail,
		character_id: character.id,
		character_name: character.name,
		joined_at: Date.now(),
	});

	// Return the game state
	const gameStateService = new GameStateService(db);
	const state = await gameStateService.getState(game);
	return c.json(state);
});

games.get('/:inviteCode/state', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	console.log(`[State] Fetching game state for invite code: "${inviteCode}" (length: ${inviteCode.length})`);

	const db = new Database(c.env.DATABASE);

	// getGameByInviteCode now handles case-insensitive fallback internally
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		console.log(`[State] Game not found for invite code: "${inviteCode}"`);
		return c.json({ error: 'Game not found' }, 404);
	}

	console.log(`[State] Found game ${game.id} for invite code ${inviteCode}, building state...`);

	try {
		const gameStateService = new GameStateService(db);
		const state = await gameStateService.getState(game);
		console.log(`[State] Successfully built game state for ${inviteCode}`);
		return c.json(state);
	} catch (error) {
		console.error(`[State] Failed to fetch game state for ${inviteCode}:`, error);
		return c.json({ error: 'Failed to fetch game state', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

games.get('/:inviteCode/map', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	try {
		// Clean up duplicate tokens before building map state
		const mapRow = await resolveMapRow(db, game);
		const mapState = await buildMapState(db, game);
		return c.json(mapState);
	} catch (error) {
		console.error('Failed to build map state:', error);
		return c.json({ error: 'Failed to load map' }, 500);
	}
});

games.patch('/:inviteCode/map', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	let payload: { id?: string; mapId?: string };
	try {
		const rawBody = await c.req.text();
		console.log(`[SwitchMap] Raw request body: ${rawBody}, type: ${typeof rawBody}`);

		if (!rawBody || rawBody.trim() === '') {
			return c.json({ error: 'Request body is required' }, 400);
		}

		// Check if body is already a string representation of an object
		if (rawBody === '[object Object]') {
			console.error('[SwitchMap] Received [object Object] - body was not properly stringified');
			return c.json({ error: 'Invalid request body format. Expected JSON object.' }, 400);
		}

		// Try to parse as JSON
		try {
			payload = JSON.parse(rawBody) as { id?: string; mapId?: string };
		} catch (parseError) {
			// If parsing fails, try to extract mapId from the raw body if it's a simple string
			console.warn('[SwitchMap] Failed to parse as JSON, trying alternative parsing:', parseError);
			// If the body is just a mapId string, wrap it
			if (rawBody && !rawBody.includes('{') && !rawBody.includes('[')) {
				payload = { mapId: rawBody.trim() };
			} else {
				throw parseError;
			}
		}
		console.log('[SwitchMap] Parsed payload:', payload);
	} catch (error) {
		console.error('[SwitchMap] Failed to parse request body:', error);
		return c.json({ error: 'Invalid JSON in request body' }, 400);
	}

	// Support both 'id' and 'mapId' for backward compatibility
	const mapId = payload?.mapId || payload?.id;

	if (mapId && mapId !== game.current_map_id) {
		// Verify the map exists
		const map = await db.getMapById(mapId);
		if (!map) {
			return c.json({ error: 'Map not found' }, 404);
		}

		await db.updateGameMap(game.id, mapId);
		game.current_map_id = mapId;
	}

	try {
		const mapState = await buildMapState(db, game);
		return c.json(mapState);
	} catch (error) {
		console.error('Failed to update map state:', error);
		return c.json({ error: 'Failed to update map' }, 500);
	}
});

games.post('/:inviteCode/map/generate', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		preset?: MapGeneratorPreset;
		width?: number;
		height?: number;
		seed?: string;
		name?: string;
		slug?: string;
	};

	const generated = generateProceduralMap({
		preset: payload.preset,
		width: payload.width,
		height: payload.height,
		seed: payload.seed,
		name: payload.name,
		slug: payload.slug,
	});

	await db.saveMap({
		...generated.map,
		created_at: Date.now(),
		updated_at: Date.now(),
	});
	await db.replaceMapTiles(generated.map.id, generated.tiles);
	await db.updateGameMap(game.id, generated.map.id);
	game.current_map_id = generated.map.id;

	const mapState = await buildMapState(db, game);
	return c.json(mapState);
});

games.post('/:inviteCode/map/terrain', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		tiles: Array<{
			x: number;
			y: number;
			terrainType: string;
			elevation?: number;
			isBlocked?: boolean;
			hasFog?: boolean;
			featureType?: string | null;
			metadata?: Record<string, unknown>;
		}>;
	};

	if (!Array.isArray(payload.tiles) || payload.tiles.length === 0) {
		return c.json({ error: 'No tiles provided' }, 400);
	}

	const mapRow = await resolveMapRow(db, game);
	await db.upsertMapTiles(
		mapRow.id,
		payload.tiles.map(tile => ({
			x: tile.x,
			y: tile.y,
			terrain_type: tile.terrainType,
			elevation: tile.elevation ?? 0,
			is_blocked: tile.isBlocked ? 1 : 0,
			has_fog: tile.hasFog ? 1 : 0,
			feature_type: tile.featureType ?? null,
			metadata: JSON.stringify(tile.metadata ?? {}),
		})),
	);

	const mapState = await buildMapState(db, game);
	return c.json(mapState);
});

games.get('/:inviteCode/map/tokens', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const memberships = await db.getGamePlayers(game.id);
	const characters = await Promise.all(
		memberships.map(async membership => {
			const row = await db.getCharacterById(membership.character_id);
			return row ? deserializeCharacter(row) : null;
		}),
	);

	return c.json({ characters: characters.filter((character): character is Character => Boolean(character)) });
});

games.post('/:inviteCode/map/tokens', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const isHost = isHostUser(game, user);
	const body = (await c.req.json()) as {
		id?: string;
		mapId?: string;
		tokenType?: string;
		label?: string;
		x: number;
		y: number;
		color?: string;
		characterId?: string;
		npcId?: string;
		elementType?: string;
		metadata?: Record<string, unknown>;
		overrideValidation?: boolean;
	};

	const gameStateService = new GameStateService(db);
	let latestGameState: MultiplayerGameState | null = null;

	// Permission check: Host can move any token, players can only move their own character during their turn
	if (!isHost) {
		// For players: must be moving their own character token during their turn
		if (body.tokenType === 'player' && body.characterId) {
			// Check if this is the player's own character
			const characterRow = await db.getCharacterById(body.characterId);
			if (!characterRow || characterRow.player_id !== user.id) {
				return c.json({ error: 'Forbidden: Not your character' }, 403);
			}

			// Check if it's currently this character's turn
			const gameState = await gameStateService.getState(game);
			latestGameState = gameState;
			const isPlayerTurn = (
				gameState.activeTurn?.type === 'player' &&
				gameState.activeTurn.entityId === body.characterId &&
				!gameState.pausedTurn
			);

			if (!isPlayerTurn) {
				// Log the mismatch for debugging
				console.log('[Token Save] Turn check failed:', {
					activeTurnType: gameState.activeTurn?.type,
					activeTurnEntityId: gameState.activeTurn?.entityId,
					requestCharacterId: body.characterId,
					pausedTurn: gameState.pausedTurn,
					isPlayerTurn,
					entityIdMatch: gameState.activeTurn?.entityId === body.characterId,
				});

				// If the turn type is player but entityId doesn't match, it might be a different player's turn
				// If there's no active turn, allow the move (game might not have started turns yet)
				if (!gameState.activeTurn) {
					console.warn('[Token Save] No active turn in game state, allowing move');
					// Allow the move if there's no active turn (game might not have started)
				} else {
					return c.json({
						error: 'Forbidden: Not your turn',
						details: {
							activeTurnType: gameState.activeTurn?.type,
							activeTurnEntityId: gameState.activeTurn?.entityId,
							requestCharacterId: body.characterId,
							pausedTurn: gameState.pausedTurn,
						},
					}, 403);
				}
			}
		} else if (body.tokenType === 'npc') {
			// Players cannot move NPC tokens
			return c.json({ error: 'Forbidden: Cannot move NPC tokens' }, 403);
		} else if (body.tokenType === 'element') {
			// Players cannot place elements
			return c.json({ error: 'Forbidden: Only DM can place elements' }, 403);
		} else {
			// Unknown token type or missing characterId
			return c.json({ error: 'Forbidden' }, 403);
		}
	}

	const mapRow = await resolveMapRow(db, game);
	const parsedMapState = mapStateFromDb(mapRow);

	// Validate element types if tokenType is 'element'
	if (body.tokenType === 'element') {
		const validElementTypes = ['fire', 'water', 'chest', 'barrel', 'rock', 'tree', 'bush', 'rubble'];
		if (!body.elementType || !validElementTypes.includes(body.elementType)) {
			return c.json(
				{
					error: `Invalid element type. Must be one of: ${validElementTypes.join(', ')}`,
				},
				400,
			);
		}
	}

	// Check if a token already exists for this character (to prevent duplicates)
	let existingTokenId: string | null = null;
	if (body.characterId && body.tokenType !== 'element') {
		const existingTokens = await db.listMapTokensForGame(game.id);
		const existingToken = existingTokens.find(
			token => token.character_id === body.characterId && token.token_type === 'player',
		);
		if (existingToken) {
			existingTokenId = existingToken.id;
		}
	}

	// Use existing token ID if found, otherwise create new one
	const tokenId = body.id || existingTokenId || createId('token');

	// If token already exists, fetch it to preserve existing foreign key references
	let existingToken: MapTokenRow | null = null;
	if (tokenId) {
		const allTokens = await db.listMapTokensForGame(game.id);
		existingToken = allTokens.find(t => t.id === tokenId) || null;
	}

	// Build metadata for elements
	const metadata = body.metadata || {};
	if (body.tokenType === 'element' && body.elementType) {
		metadata.elementType = body.elementType;
	}

	let playerMoveCost: number | null = null;
	if (!isHost && body.tokenType === 'player' && body.characterId) {
		const path = (metadata.path as Array<{ x: number; y: number }> | undefined);
		if (!path || path.length < 2) {
			return c.json({ error: 'Movement path missing' }, 400);
		}

		let cost = 0;
		for (let i = 1; i < path.length; i++) {
			const step = path[i];
			const cell = parsedMapState.terrain?.[step.y]?.[step.x];
			const stepCost = getTerrainCost(cell);
			if (!Number.isFinite(stepCost)) {
				cost = Number.POSITIVE_INFINITY;
				break;
			}
			cost += stepCost;
		}

		if (!Number.isFinite(cost)) {
			return c.json({ error: 'Forbidden: Path crosses invalid terrain' }, 403);
		}

		playerMoveCost = cost;

		if (latestGameState?.activeTurn?.entityId === body.characterId) {
			const speed = latestGameState.activeTurn.speed ?? DEFAULT_RACE_SPEED;
			const used = latestGameState.activeTurn.movementUsed ?? 0;
			if (used + cost > speed + 1e-6) {
				return c.json({ error: 'Forbidden: Not enough movement remaining' }, 403);
			}
		}
	}

	// Preserve existing foreign key references when updating a token
	// Only override if explicitly provided in the request
	const characterId = body.tokenType === 'element'
		? null
		: (body.characterId !== undefined ? body.characterId : existingToken?.character_id || null);

	const npcId = body.tokenType === 'element'
		? null
		: (body.npcId !== undefined ? body.npcId : existingToken?.npc_id || null);

	// Preserve other existing values if not provided
	const tokenType = body.tokenType || existingToken?.token_type || 'player';
	const label = body.label !== undefined
		? (body.label || (body.tokenType === 'element' ? body.elementType || null : null))
		: existingToken?.label || null;
	const color = body.color !== undefined ? body.color : existingToken?.color || null;
	const hitPoints = existingToken?.hit_points ?? null;
	const maxHitPoints = existingToken?.max_hit_points ?? null;
	const status = existingToken?.status || 'idle';
	const facing = existingToken?.facing ?? 0;

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: body.mapId || mapRow.id,
		character_id: characterId,
		npc_id: npcId,
		token_type: tokenType,
		label,
		x: body.x,
		y: body.y,
		facing,
		color,
		status,
		is_visible: 1,
		hit_points: hitPoints,
		max_hit_points: maxHitPoints,
		metadata: JSON.stringify(metadata),
	});

	// Auto-roll initiative for player and NPC tokens (not elements)
	if (body.tokenType !== 'element' && game.status === 'active') {
		try {
			const gameStateService = new GameStateService(db);
			let dex: number | undefined;
			let entityId: string;
			let entityType: 'player' | 'npc' | undefined;

			if (body.tokenType === 'player' && body.characterId) {
				// Player character
				const characterRow = await db.getCharacterById(body.characterId);
				if (characterRow) {
					const character = deserializeCharacter(characterRow);
					dex = character.stats?.DEX;
					entityId = body.characterId;
					entityType = 'player';
				} else {
					// Character not found, skip initiative
					entityId = '';
					entityType = undefined;
				}
			} else if (body.tokenType === 'npc' && body.npcId) {
				// NPC token - use tokenId as entityId
				entityId = tokenId;
				entityType = 'npc';
				// Get NPC definition to find DEX
				const npcDef = await db.getNpcById(body.npcId);
				if (npcDef) {
					const stats = JSON.parse(npcDef.stats || '{}');
					dex = stats.DEX;
				}
			} else if (body.tokenType === 'npc' && !body.npcId) {
				// NPC token without npcId - might be from token metadata, use tokenId
				entityId = tokenId;
				entityType = 'npc';
				// Try to get NPC from token's npc_id if available
				const savedToken = (await db.listMapTokensForGame(game.id)).find(t => t.id === tokenId);
				if (savedToken?.npc_id) {
					const npcDef = await db.getNpcById(savedToken.npc_id);
					if (npcDef) {
						const stats = JSON.parse(npcDef.stats || '{}');
						dex = stats.DEX;
					}
				}
			} else {
				// Unknown token type, skip
				entityId = '';
				entityType = undefined;
			}

			// Add to initiative order if we have a valid entity
			if (entityId && entityType !== undefined) {
				await gameStateService.addToInitiativeOrder(game, {
					entityId,
					type: entityType,
					dex,
				});
				console.log(`[Auto-Initiative] Added ${entityType} ${entityId} to initiative order`);
			}
		} catch (error) {
			console.error('Failed to auto-roll initiative for token:', error);
			// Don't fail the token placement if initiative fails
		}
	}

	if (
		!isHost &&
		body.tokenType === 'player' &&
		body.characterId &&
		playerMoveCost !== null &&
		latestGameState?.activeTurn?.entityId === body.characterId
	) {
		const speed = latestGameState.activeTurn.speed ?? DEFAULT_RACE_SPEED;
		const used = latestGameState.activeTurn.movementUsed ?? 0;
		const updatedMovement = Math.min(speed, used + playerMoveCost);
		try {
			const gameStateService = new GameStateService(db);
			await gameStateService.updateTurn(game, {
				movementUsed: updatedMovement,
				actorEntityId: body.characterId,
			});
		} catch (error) {
			console.error('Failed to update movement usage after token save', error);
		}
	}

	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.delete('/:inviteCode/map/tokens/:tokenId', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const tokenId = c.req.param('tokenId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Get token info before deleting to determine entityId for initiative removal
	const tokens = await db.listMapTokensForGame(game.id);
	const tokenToDelete = tokens.find(t => t.id === tokenId);

	// Remove from initiative order if game is active
	if (game.status === 'active' && tokenToDelete) {
		try {
			const gameStateService = new GameStateService(db);
			let entityId: string | null = null;

			if (tokenToDelete.token_type === 'player' && tokenToDelete.character_id) {
				// Player token - use character_id as entityId
				entityId = tokenToDelete.character_id;
			} else if (tokenToDelete.token_type === 'npc') {
				// NPC token - use tokenId as entityId
				entityId = tokenId;
			}

			if (entityId) {
				await gameStateService.removeFromInitiativeOrder(game, entityId);
				console.log(`[Auto-Initiative] Removed ${tokenToDelete.token_type} ${entityId} from initiative order`);
			}
		} catch (error) {
			console.error('Failed to remove entity from initiative order:', error);
			// Don't fail the token deletion if initiative removal fails
		}
	}

	await db.deleteMapToken(tokenId);
	await db.deleteNpcInstanceByToken(tokenId);
	const mapState = await buildMapState(db, game);
	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/npcs', async (c) => {
	const db = new Database(c.env.DATABASE);
	const npcRows = await db.listNpcDefinitions();
	return c.json({ npcs: npcRows.map(npcFromDb) });
});

games.get('/:inviteCode/npcs/:npcId', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const npcId = c.req.param('npcId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const npc = await db.getNpcById(npcId);
	if (!npc) {
		return c.json({ error: 'NPC not found' }, 404);
	}

	return c.json(npcFromDb(npc));
});

/**
 * Add an NPC to the game
 * POST /api/games/:inviteCode/npcs
 * @param inviteCode - The invite code for the game
 * @param payload - The payload for the NPC
 * @returns The tokens on the map
 * @throws 401 if the user is not authorized
 * @throws 404 if the game is not found
 * @throws 403 if the user is not the host
 * @throws 500 if the NPC is not found
 */
games.post('/:inviteCode/npcs', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json()) as {
		npcId?: string;
		x: number;
		y: number;
		label?: string;
		maxHealth?: number; // DM override for health
		actionPoints?: number; // DM override for action points
		customNpc?: {
			name: string;
			role: string;
			alignment: string;
			disposition: string;
			description?: string;
			maxHealth?: number;
			armorClass?: number;
			color?: string;
		};
	};

	let npc =
		payload.npcId
			? await db.getNpcBySlug(payload.npcId)
			: null;

	if (!npc && payload.customNpc) {
		try {
			npc = await createCustomNpcDefinition(db, user.id, payload.customNpc);
		} catch (error) {
			console.error('Failed to create custom NPC', error);
			return c.json({ error: 'Failed to create NPC' }, 500);
		}
	}

	if (!npc) {
		return c.json({ error: 'NPC not found' }, 404);
	}

	const mapRow = await resolveMapRow(db, game);
	const npcMetadata = JSON.parse(npc.metadata || '{}');
	const tokenId = createId('npc');

	// Generate unique label if not provided - count existing NPCs with same base name
	let uniqueLabel = payload.label;
	if (!uniqueLabel) {
		const existingTokens = await db.listMapTokensForGame(game.id);
		const baseName = npc.name;
		const existingNpcsOfType = existingTokens.filter(
			token => token.token_type === 'npc' &&
			(token.label === baseName || token.label?.startsWith(`${baseName} `)),
		);
		const count = existingNpcsOfType.length;
		uniqueLabel = count > 0 ? `${baseName} ${count + 1}` : baseName;
	}

	// Use DM override if provided, otherwise default to 10/10 for health, 3/3 for AP
	const maxHealth = payload.maxHealth ?? npc.base_health ?? 10;
	const currentHealth = maxHealth;
	const actionPoints = payload.actionPoints ?? 3;
	const maxActionPoints = 3;

	// Store action points in metadata
	const tokenMetadata = {
		...(JSON.parse(npc.metadata || '{}')),
		actionPoints,
		maxActionPoints,
	};

	await db.saveMapToken({
		id: tokenId,
		game_id: game.id,
		map_id: mapRow.id,
		character_id: null,
		npc_id: npc.id,
		token_type: 'npc',
		label: uniqueLabel,
		x: payload.x,
		y: payload.y,
		facing: 0,
		color: npcMetadata.color || '#3B2F1B',
		status: npc.disposition,
		is_visible: 1,
		hit_points: currentHealth,
		max_hit_points: maxHealth,
		metadata: JSON.stringify(tokenMetadata),
	});

	await db.saveNpcInstance({
		id: createId('npci'),
		game_id: game.id,
		npc_id: npc.id,
		token_id: tokenId,
		name: uniqueLabel,
		disposition: npc.disposition,
		current_health: currentHealth,
		max_health: maxHealth,
		status_effects: JSON.stringify([]),
		is_friendly: npc.disposition === 'hostile' ? 0 : 1,
		metadata: JSON.stringify({
			color: npcMetadata.color || payload.customNpc?.color || '#3B2F1B',
			role: npc.role,
			actionPoints,
			maxActionPoints,
		}),
	});

	// Auto-roll initiative for NPC if game is active
	if (game.status === 'active') {
		try {
			const gameStateService = new GameStateService(db);
			// Get DEX from NPC definition
			const stats = JSON.parse(npc.stats || '{}');
			const dex = stats.DEX;

			// For NPCs, entityId is the tokenId
			await gameStateService.addToInitiativeOrder(game, {
				entityId: tokenId,
				type: 'npc',
				dex,
			});
			console.log(`[Auto-Initiative] Added NPC ${uniqueLabel} (token ${tokenId}) to initiative order`);
		} catch (error) {
			console.error('Failed to auto-roll initiative for NPC:', error);
			// Don't fail the NPC placement if initiative fails
		}
	}

	const mapState = await buildMapState(db, game);

	// Update the game state's map state so /state returns fresh data
	try {
		const gameStateService = new GameStateService(db);
		const currentState = await gameStateService.getState(game);
		const updatedState: MultiplayerGameState = {
			...currentState,
			mapState,
			lastUpdated: Date.now(),
		};
		await gameStateService['saveState'](game.id, updatedState);
		console.log(`[NPC] Updated game state map state for game ${inviteCode}`);
	} catch (error) {
		// Don't fail the request if game state update fails - database is source of truth
		console.error('[NPC] Failed to update game state map state:', error);
	}

	return c.json({ tokens: mapState.tokens });
});

games.get('/:inviteCode/npc-instances', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const instances = await db.listNpcInstances(game.id);
	return c.json({ instances: instances.map(npcInstanceToResponse) });
});

games.patch('/:inviteCode/npcs/:tokenId', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const tokenId = c.req.param('tokenId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		currentHealth?: number;
		maxHealth?: number;
		actionPoints?: number;
		maxActionPoints?: number;
		statusEffects?: string[];
		isFriendly?: boolean;
		metadata?: Record<string, unknown>;
		name?: string;
	};

	const instance = await db.getNpcInstanceByToken(tokenId);
	if (!instance) {
		return c.json({ error: 'NPC instance not found' }, 404);
	}

	const maxHealth = typeof payload.maxHealth === 'number' ? payload.maxHealth : instance.max_health;
	const currentHealth =
		typeof payload.currentHealth === 'number'
			? Math.max(0, Math.min(maxHealth, payload.currentHealth))
			: instance.current_health;

	const instanceMetadata = JSON.parse(instance.metadata || '{}');
	const actionPoints = typeof payload.actionPoints === 'number' ? payload.actionPoints : (instanceMetadata.actionPoints ?? 3);
	const maxActionPoints = typeof payload.maxActionPoints === 'number' ? payload.maxActionPoints : (instanceMetadata.maxActionPoints ?? 3);

	await db.saveNpcInstance({
		...instance,
		name: payload.name ?? instance.name,
		current_health: currentHealth,
		max_health: maxHealth,
		status_effects: JSON.stringify(payload.statusEffects ?? JSON.parse(instance.status_effects || '[]')),
		is_friendly:
			typeof payload.isFriendly === 'boolean'
				? (payload.isFriendly ? 1 : 0)
				: instance.is_friendly,
		metadata: JSON.stringify({
			...instanceMetadata,
			actionPoints,
			maxActionPoints,
			...(payload.metadata ?? {}),
		}),
	});

	// Also update the token's hit points and metadata
	const tokens = await db.listMapTokensForGame(game.id);
	const token = tokens.find(t => t.id === tokenId);
	if (token) {
		const tokenMetadata = JSON.parse(token.metadata || '{}');
		await db.saveMapToken({
			...token,
			hit_points: currentHealth,
			max_hit_points: maxHealth,
			metadata: JSON.stringify({
				...tokenMetadata,
				actionPoints,
				maxActionPoints,
			}),
		});
	}

	const refreshed = await db.getNpcInstanceByToken(tokenId);
	return c.json({ instance: refreshed ? npcInstanceToResponse(refreshed) : null });
});

games.post('/:inviteCode/characters/:characterId/:action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const characterId = c.req.param('characterId');
	const action = c.req.param('action');
	const body = (await c.req.json().catch(() => ({}))) as { amount?: number };
	const amount = typeof body.amount === 'number' ? body.amount : 0;

	// Check if this is a player character or an NPC token
	let characterRow = await db.getCharacterById(characterId);
	let npcInstance = null;
	let isNPC = false;

	if (!characterRow) {
		// Try to find as NPC token
		const npcTokens = await db.listMapTokensForGame(game.id);
		const npcToken = npcTokens.find(t => t.id === characterId);
		if (npcToken) {
			npcInstance = await db.getNpcInstanceByToken(npcToken.id);
			if (npcInstance) {
				isNPC = true;
				console.log(`[Damage/Heal] Found NPC instance for token ${characterId}`);
			}
		}
	}

	if (!characterRow && !npcInstance) {
		return c.json({ error: 'Character or NPC not found' }, 404);
	}

	let currentHealth: number;
	let maxHealth: number;
	let nextHealth: number;

	if (isNPC && npcInstance) {
		// Handle NPC instance
		const instanceMetadata = JSON.parse(npcInstance.metadata || '{}');
		currentHealth = typeof npcInstance.current_health === 'number' ? npcInstance.current_health : (npcInstance.max_health || 10);
		maxHealth = typeof npcInstance.max_health === 'number' ? npcInstance.max_health : 10;

		console.log(`[Damage/Heal] NPC ${characterId}: currentHealth=${currentHealth}, maxHealth=${maxHealth}, amount=${amount}, action=${action}`);

		if (action === 'damage') {
			const damageAmount = Math.max(0, amount);
			nextHealth = Math.max(0, currentHealth - damageAmount);
			console.log(`[Damage] NPC Calculation: ${currentHealth} - ${damageAmount} = ${currentHealth - damageAmount}, clamped to ${nextHealth}`);
			await db.saveNpcInstance({
				...npcInstance,
				current_health: nextHealth,
			});
		} else if (action === 'heal') {
			nextHealth = Math.min(maxHealth, currentHealth + Math.max(0, amount));
			console.log(`[Heal] NPC Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.saveNpcInstance({
				...npcInstance,
				current_health: nextHealth,
			});
		} else {
			return c.json({ error: 'Unsupported action' }, 400);
		}
	} else if (characterRow) {
		// Handle player character
		// Log raw database values for debugging
		console.log(`[Damage/Heal] Raw DB values for ${characterId}:`, {
			health: characterRow.health,
			healthType: typeof characterRow.health,
			max_health: characterRow.max_health,
			max_healthType: typeof characterRow.max_health,
		});

		// Ensure health values are valid numbers
		currentHealth =
			characterRow.health !== null && characterRow.health !== undefined && typeof characterRow.health === 'number'
				? characterRow.health
				: (characterRow.max_health && typeof characterRow.max_health === 'number' ? characterRow.max_health : 10);
		maxHealth = typeof characterRow.max_health === 'number' ? characterRow.max_health : 10;

		console.log(`[Damage/Heal] Character ${characterId}: currentHealth=${currentHealth}, maxHealth=${maxHealth}, amount=${amount}, action=${action}`);

		if (action === 'damage') {
			const damageAmount = Math.max(0, amount);
			nextHealth = Math.max(0, currentHealth - damageAmount);
			console.log(`[Damage] Calculation: ${currentHealth} - ${damageAmount} = ${currentHealth - damageAmount}, clamped to ${nextHealth}`);
			console.log(`[Damage] Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.updateCharacter(characterId, { health: nextHealth });
		} else if (action === 'heal') {
			nextHealth = Math.min(maxHealth, currentHealth + Math.max(0, amount));
			console.log(`[Heal] Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.updateCharacter(characterId, { health: nextHealth });
		} else {
			return c.json({ error: 'Unsupported action' }, 400);
		}
	} else {
		return c.json({ error: 'Character or NPC not found' }, 404);
	}

	// Also update the character in the game state
	try {
		const gameStateService = new GameStateService(db);
		await gameStateService.updateCharacter(game, characterId, { health: nextHealth });
		console.log(`[Damage/Heal] Updated ${isNPC ? 'NPC' : 'character'} ${characterId} in game state`);
	} catch (error) {
		console.error('[Damage/Heal] Failed to update game state:', error);
		// Don't fail the request if game state update fails - database is source of truth
	}

	// Return updated character or NPC data
	if (isNPC && npcInstance) {
		const updated = await db.getNpcInstanceByToken(characterId);
		if (updated) {
			console.log(`[Damage/Heal] Verification - Updated NPC health: ${updated.current_health}/${updated.max_health}`);
			console.log(`[Damage/Heal] Expected health: ${nextHealth}, Actual DB health: ${updated.current_health}`);
			if (updated.current_health !== nextHealth) {
				console.error(`[Damage/Heal] MISMATCH! Expected ${nextHealth} but got ${updated.current_health}`);
			}
		}
		// Return NPC instance data in a format similar to character
		return c.json({
			character: updated ? {
				id: updated.id,
				health: updated.current_health,
				maxHealth: updated.max_health,
			} : null,
		});
	} else {
		const updated = await db.getCharacterById(characterId);
		if (updated) {
			console.log(`[Damage/Heal] Verification - Updated character health: ${updated.health}/${updated.max_health}`);
			console.log(`[Damage/Heal] Expected health: ${nextHealth}, Actual DB health: ${updated.health}`);
			if (updated.health !== nextHealth) {
				console.error(`[Damage/Heal] MISMATCH! Expected ${nextHealth} but got ${updated.health}`);
			}
		}
		return c.json({ character: updated ? deserializeCharacter(updated) : null });
	}
});

games.post('/:inviteCode/characters/:characterId/actions', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// DM can cast for any character, players can only cast for themselves
	const characterId = c.req.param('characterId');
	const isHost = isHostUser(game, user);

	if (!isHost) {
		// Check if this is the player's own character
		const characterRow = await db.getCharacterById(characterId);
		if (!characterRow || characterRow.player_id !== user.id) {
			return c.json({ error: 'Forbidden' }, 403);
		}
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		actionType: 'cast_spell' | 'basic_attack' | 'use_item' | 'heal_potion';
		spellName?: string;
		targetId?: string;
		itemId?: string;
		params?: Record<string, unknown>;
	};

	if (!body.actionType) {
		return c.json({ error: 'actionType is required' }, 400);
	}

	const characterRow = await db.getCharacterById(characterId);
	if (!characterRow) {
		return c.json({ error: 'Character not found' }, 404);
	}

	const character = deserializeCharacter(characterRow);

	// Validate action points
	const actionPointCost = body.actionType === 'cast_spell' ? 2 : body.actionType === 'basic_attack' ? 1 : 1;
	if (character.actionPoints < actionPointCost) {
		return c.json({ error: 'Not enough action points' }, 400);
	}

	let actionResult: CharacterActionResult | null = null;

	switch (body.actionType) {
		case 'basic_attack': {
			const outcome = await handleBasicAttack({
				db,
				attacker: character,
				targetId: body.targetId,
				params: body.params,
			});

			if ('error' in outcome) {
				return c.json({ error: outcome.error }, (outcome.status ?? 400) as 400 | 404);
			}

			actionResult = outcome.result;
			break;
		}

		case 'cast_spell': {
			const outcome = await handleSpellCast({
				db,
				attacker: character,
				spellName: body.spellName,
				targetId: body.targetId,
				params: body.params,
			});

			if ('error' in outcome) {
				return c.json({ error: outcome.error }, (outcome.status ?? 400) as 400 | 404);
			}

			actionResult = outcome.result;
			break;
		}

		default:
			break;
	}

	const updatedActionPoints = character.actionPoints - actionPointCost;
	await db.updateCharacter(characterId, { action_points: updatedActionPoints });

	try {
		let description: string;
		if (actionResult?.type === 'basic_attack') {
			description = `${character.name} ${actionResult.hit ? 'hits' : 'misses'} ${actionResult.target.name}`;
		} else if (actionResult?.type === 'spell') {
			const spellOutcome =
				typeof actionResult.hit === 'boolean'
					? actionResult.hit
						? 'succeeds'
						: 'fails'
					: 'casts';
			description = `${character.name} casts ${actionResult.spellName} (${spellOutcome})`;
		} else {
			description = `${character.name} performed ${body.actionType}${body.spellName ? `: ${body.spellName}` : ''}`;
		}

		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'action',
			timestamp: Date.now(),
			description,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				characterId,
				actionType: body.actionType,
				spellName: body.spellName,
				targetId: body.targetId,
				itemId: body.itemId,
				params: body.params,
				result: actionResult,
			}),
		});
	} catch (error) {
		console.error('Failed to log action:', error);
	}

	const updated = await db.getCharacterById(characterId);
	return c.json({
		character: updated ? deserializeCharacter(updated) : null,
		actionPerformed: body.actionType,
		actionResult,
	});
});

games.post('/:inviteCode/characters/:characterId/perception-check', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const characterId = c.req.param('characterId');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const body = (await c.req.json().catch(() => ({}))) as { dc?: number; passive?: boolean };
	const dc = typeof body.dc === 'number' && Number.isFinite(body.dc) ? body.dc : undefined;

	const characterRow = await db.getCharacterById(characterId);
	if (!characterRow) {
		return c.json({ error: 'Character not found' }, 404);
	}

	const isHost = isHostUser(game, user);
	if (!isHost && characterRow.player_id !== user.id) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const character = deserializeCharacter(characterRow);
	const mode: 'passive' | 'active' = body.passive ? 'passive' : 'active';

	if (mode === 'passive') {
		const total = calculatePassivePerception(character);
		const responsePayload = {
			characterId,
			mode,
			total,
			dc,
			success: typeof dc === 'number' ? total >= dc : undefined,
		};
		return c.json(responsePayload);
	}

	const wisScore = getAbilityScore(character, 'WIS');
	const wisModifier = getAbilityModifier(wisScore);
	const proficiencyBonus = isSkillProficient(character, 'perception')
		? calculateProficiencyBonus(character.level)
		: 0;
	const modifier = wisModifier + proficiencyBonus;
	const roll = Math.floor(Math.random() * 20) + 1;
	const total = roll + modifier;
	const breakdownParts = [`${roll}`];
	if (modifier !== 0) {
		breakdownParts.push(modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`);
	}
	const breakdown = `${breakdownParts.join(' ')} = ${total}`;

	const payload = {
		characterId,
		mode,
		roll,
		modifier,
		total,
		breakdown,
		dc,
		success: typeof dc === 'number' ? total >= dc : undefined,
	};

	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${character.name} rolled a Perception check (${total})${dc ? ` vs DC ${dc}` : ''}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				...payload,
				purpose: 'perception',
			}),
		});
	} catch (error) {
		console.error('Failed to log perception check:', error);
	}

	return c.json(payload);
});

// forwardJsonRequest removed - no longer needed without Durable Object

games.post('/:inviteCode/action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	// Action endpoint - placeholder for future implementation
	return c.json({ ok: true });
});

games.post('/:inviteCode/dm-action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	// DM action endpoint - placeholder for future implementation
	return c.json({ ok: true });
});

games.post('/:inviteCode/start', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	try {
		const payload = (await c.req.json().catch(() => ({}))) as { gameState?: Partial<MultiplayerGameState> };
		const gameStateService = new GameStateService(db);
		const state = await gameStateService.startGame(game, payload);
		return c.json(state);
	} catch (error) {
		console.error('Failed to start game:', error);
		return c.json({ error: 'Failed to start game', details: error instanceof Error ? error.message : String(error) }, 500);
	}
});

games.post('/:inviteCode/initiative/roll', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Get all characters in the game
	const memberships = await db.getGamePlayers(game.id);
	const characters = await Promise.all(
		memberships.map(async membership => {
			const row = await db.getCharacterById(membership.character_id);
			return row ? deserializeCharacter(row) : null;
		}),
	);
	const validCharacters = characters.filter((c): c is Character => Boolean(c));

	// Restore all player characters to full health and action points when starting encounter
	for (const character of validCharacters) {
		await db.updateCharacter(character.id, {
			health: character.maxHealth,
			action_points: character.maxActionPoints,
		});
		console.log(`[Initiative] Restored character ${character.id} to full health (${character.maxHealth}) and AP (${character.maxActionPoints})`);
	}

	// Get all NPC instances on the map
	const npcInstances = await db.listNpcInstances(game.id);
	const npcTokens = await db.listMapTokensForGame(game.id);

	// Fetch NPC definitions for all NPCs on the map
	const npcs = await Promise.all(
		npcInstances.map(async instance => {
			const token = npcTokens.find(t => t.id === instance.token_id);
			if (!token) return null;

			// Get npc_id from either the token or the instance
			const npcId = token.npc_id || instance.npc_id;
			if (!npcId) return null;

			// Fetch the actual NPC definition from the database
			const npcDef = await db.getNpcById(npcId);
			if (!npcDef) return null;

			// Get stats from the NPC definition (stats field is JSON string)
			const stats = JSON.parse(npcDef.stats || '{}');
			if (!stats.DEX) {
				stats.DEX = 10; // Default DEX if not set
			}

			return {
				id: instance.id,
				entityId: token.id,
				stats,
			};
		}),
	);

	const validNpcs = npcs.filter((n): n is { id: string; entityId: string; stats: { DEX: number } } => Boolean(n));

	// Restore all NPC instances to full health and action points when starting encounter
	for (const npcInstance of npcInstances) {
		const instanceMetadata = JSON.parse(npcInstance.metadata || '{}');
		const maxHealth = npcInstance.max_health || 10;
		const maxActionPoints = instanceMetadata.maxActionPoints || 3;

		await db.saveNpcInstance({
			...npcInstance,
			current_health: maxHealth,
			metadata: JSON.stringify({
				...instanceMetadata,
				actionPoints: maxActionPoints,
				maxActionPoints,
			}),
		});
		console.log(`[Initiative] Restored NPC instance ${npcInstance.id} to full health (${maxHealth}) and AP (${maxActionPoints})`);
	}

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.rollInitiative(
		game,
		validCharacters.map(c => ({ id: c.id, stats: c.stats })),
		validNpcs,
	);

	// Log detailed initiative roll to database
	try {
		if (gameState.initiativeOrder && gameState.initiativeOrder.length > 0) {
			// Get NPC tokens for name lookup
			const npcTokens = await db.listMapTokensForGame(game.id);

			// Build detailed initiative roll descriptions
			const rollDetails = gameState.initiativeOrder.map((entry, index) => {
				let name = 'Unknown';
				let rollInfo = '';

				if (entry.type === 'player') {
					const character = validCharacters.find(c => c.id === entry.entityId);
					name = character?.name || 'Unknown';
					// Get roll details from the entry if available (roll and dexMod)
					const roll = entry.roll;
					const dexMod = entry.dexMod;
					if (roll !== undefined && dexMod !== undefined) {
						rollInfo = ` (d20: ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative})`;
					} else {
						rollInfo = ` (Total: ${entry.initiative})`;
					}
				} else {
					// NPC
					const token = npcTokens.find(t => t.id === entry.entityId);
					name = token?.label || 'Unknown NPC';
					const roll = entry.roll;
					const dexMod = entry.dexMod;
					if (roll !== undefined && dexMod !== undefined) {
						rollInfo = ` (d20: ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative})`;
					} else {
						rollInfo = ` (Total: ${entry.initiative})`;
					}
				}

				return `${index + 1}. ${name}: ${entry.initiative}${rollInfo}`;
			});

			const firstEntity = gameState.initiativeOrder[0];
			let firstName = 'Unknown';
			if (firstEntity.type === 'player') {
				const character = validCharacters.find(c => c.id === firstEntity.entityId);
				firstName = character?.name || 'Unknown';
			} else {
				const token = npcTokens.find(t => t.id === firstEntity.entityId);
				firstName = token?.label || 'Unknown NPC';
			}

			await db.saveActivityLog({
				id: createId('log'),
				game_id: game.id,
				invite_code: inviteCode,
				type: 'initiative_roll',
				timestamp: Date.now(),
				description: `Initiative rolled. ${firstName} goes first.`,
				actor_id: user.id,
				actor_name: user.name || user.email || null,
				data: JSON.stringify({
					initiativeOrder: gameState.initiativeOrder,
					rollDetails: rollDetails,
					activeTurn: gameState.activeTurn,
				}),
			});

			// Also log individual rolls for each character
			for (const entry of gameState.initiativeOrder) {
				let name = 'Unknown';
				if (entry.type === 'player') {
					const character = validCharacters.find(c => c.id === entry.entityId);
					name = character?.name || 'Unknown';
				} else {
					const token = npcTokens.find(t => t.id === entry.entityId);
					name = token?.label || 'Unknown NPC';
				}

				const roll = entry.roll;
				const dexMod = entry.dexMod;
				const rollDescription = roll !== undefined && dexMod !== undefined
					? `${name} rolled ${roll}${dexMod >= 0 ? '+' : ''}${dexMod} = ${entry.initiative} for initiative`
					: `${name} has initiative ${entry.initiative}`;

				await db.saveActivityLog({
					id: createId('log'),
					game_id: game.id,
					invite_code: inviteCode,
					type: 'initiative_roll_individual',
					timestamp: Date.now(),
					description: rollDescription,
					actor_id: user.id,
					actor_name: user.name || user.email || null,
					data: JSON.stringify({
						entityId: entry.entityId,
						entityType: entry.type,
						initiative: entry.initiative,
						roll: roll,
						dexMod: dexMod,
					}),
				});
			}
		}
	} catch (error) {
		console.error('Failed to log initiative roll:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

games.post('/:inviteCode/turn/interrupt', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.interruptTurn(game, game.host_id);
	return c.json(gameState);
});

games.post('/:inviteCode/turn/resume', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.resumeTurn(game);
	return c.json(gameState);
});

games.post('/:inviteCode/turn/update', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const isHost = isHostUser(game, user);
	const players = await db.getGamePlayers(game.id);
	const membership = players.find(p => p.player_id === user.id);

	if (!isHost && !membership) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		movementUsed?: number;
		majorActionUsed?: boolean;
		minorActionUsed?: boolean;
		actorEntityId?: string;
	};

	const payload = {
		movementUsed: body.movementUsed,
		majorActionUsed: body.majorActionUsed,
		minorActionUsed: body.minorActionUsed,
		// Don't restrict actor for host - trust the host's intent to update the active turn
		actorEntityId: isHost ? undefined : membership?.character_id,
	};

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.updateTurn(game, payload);
	return c.json(gameState);
});

games.post('/:inviteCode/turn/end', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const gameStateService = new GameStateService(db);

	// Get current game state BEFORE ending the turn to capture the turn that's ending
	const previousGameState = await gameStateService.getState(game);
	const previousTurn = previousGameState.activeTurn ?? null;
	const previousCharacters = previousGameState.characters ?? [];

	const gameState = await gameStateService.endTurn(game);

	// Log turn end to database using the PREVIOUS turn (the one that just ended)
	try {
		// Use previousTurn (the turn that ended) instead of gameState.activeTurn (the new turn)
		const endedTurn = previousTurn;
		const characterName = previousCharacters.find(c => c.id === endedTurn?.entityId)?.name || 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_end',
			timestamp: Date.now(),
			description: `${characterName} ended their turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: endedTurn?.entityId,
				entityType: endedTurn?.type,
				turnNumber: endedTurn?.turnNumber,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn end:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

games.post('/:inviteCode/turn/start', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		turnType: 'player' | 'npc' | 'dm';
		entityId: string;
	};

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.startTurn(game, body.turnType, body.entityId);

	// Log turn start to database
	try {
		const characterName = body.turnType === 'player'
			? gameState.characters.find(c => c.id === body.entityId)?.name
			: gameState.initiativeOrder?.find(e => e.entityId === body.entityId)
				? 'NPC'
				: 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_start',
			timestamp: Date.now(),
			description: `${characterName || 'Character'} started their turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: body.entityId,
				entityType: body.turnType,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn start:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

games.post('/:inviteCode/turn/next', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const gameStateService = new GameStateService(db);
	const gameState = await gameStateService.endTurn(game);

	// Log turn skip to database
	try {
		const currentTurn = gameState.activeTurn;
		const characterName = gameState.characters.find(c => c.id === currentTurn?.entityId)?.name || 'Unknown';
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'turn_skip',
			timestamp: Date.now(),
			description: `DM skipped to ${characterName}'s turn`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				entityId: currentTurn?.entityId,
				entityType: currentTurn?.type,
				turnNumber: currentTurn?.turnNumber,
			}),
		});
	} catch (error) {
		console.error('Failed to log turn skip:', error);
		// Continue anyway
	}

	return c.json(gameState);
});

games.post('/:inviteCode/dice/roll', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		notation: string;
		advantage?: boolean;
		disadvantage?: boolean;
		purpose?: string;
	};

	const gameStateService = new GameStateService(db);
	const rollResult = gameStateService.rollDice(body.notation, body.advantage, body.disadvantage);

	// Log dice roll to database
	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${user.name || 'Player'} rolled ${body.notation}${body.purpose ? ` for ${body.purpose}` : ''}: ${rollResult.total}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				notation: body.notation,
				purpose: body.purpose,
				total: rollResult.total,
				rolls: rollResult.rolls,
				breakdown: rollResult.breakdown,
				advantage: body.advantage,
				disadvantage: body.disadvantage,
			}),
		});
	} catch (error) {
		console.error('Failed to log dice roll:', error);
		// Continue anyway
	}

	return jsonWithStatus(c, rollResult, 200);
});

games.get('/:inviteCode/ws', async (c) => {
	// WebSocket support not yet implemented
	return c.json({ error: 'WebSocket support is not yet implemented' }, 501);
});

// Activity log routes
games.get('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const limit = parseInt(c.req.query('limit') || '100', 10);
	const offset = parseInt(c.req.query('offset') || '0', 10);

	const logs = await db.getActivityLogs(inviteCode, limit, offset);
	return c.json({ logs });
});

games.post('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json()) as {
		type: string;
		description: string;
		data?: Record<string, unknown>;
		actorId?: string;
		actorName?: string;
	};

	if (!body.type || !body.description) {
		return c.json({ error: 'type and description are required' }, 400);
	}

	const logId = createId('log');
	await db.saveActivityLog({
		id: logId,
		game_id: game.id,
		invite_code: inviteCode,
		type: body.type,
		timestamp: Date.now(),
		description: body.description,
		actor_id: body.actorId || user.id,
		actor_name: body.actorName || user.name || user.email || null,
		data: body.data ? JSON.stringify(body.data) : null,
	});

	return c.json({ id: logId, success: true });
});

games.delete('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Only host can clear activity logs
	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Delete all activity logs for this game
	await db.deleteActivityLogs(game.id);

	return c.json({ success: true });
});

export default games;


