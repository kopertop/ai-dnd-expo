import { Database } from '../../../shared/workers/db';
import type { BasicAttackOptions, SpellCastOptions } from '../routes/games/types';

import { deserializeCharacter } from './games-utils';

import { findSpellByName } from '@/constants/spells';
import { parseDiceNotation, rollDiceLocal } from '@/services/dice-roller';
import { Character } from '@/types/character';
import type {
	BasicAttackResult,
	CombatTargetSummary,
	DiceRollSummary,
	SpellCastResult,
} from '@/types/combat';
import type { AttackTarget } from '@/types/games-api';
import type { SpellDefinition } from '@/types/spell';
import {
	calculateAC,
	calculateAttackBonus,
	calculateProficiencyBonus,
	getAbilityModifier,
	getAbilityScore,
	getSpellcastingAbilityModifier,
} from '@/utils/combat-utils';

/**
 * Roll a single die with the specified number of sides
 * @param sides - Number of sides on the die
 * @returns Random number between 1 and sides (inclusive)
 */
export const rollDie = (sides: number): number => Math.floor(Math.random() * sides) + 1;

/**
 * Format a modifier value as a string (e.g., "+5" or "-3")
 * @param modifier - Modifier value to format
 * @returns Formatted modifier string, empty string if zero
 */
export const formatModifierText = (modifier: number): string => {
	if (modifier === 0) {
		return '';
	}
	return modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
};

/**
 * Roll damage dice based on notation and modifiers
 * @param notation - Dice notation (e.g., "1d8+3")
 * @param abilityModifier - Ability modifier to add to damage
 * @param critical - Whether this is a critical hit (doubles dice)
 * @returns Dice roll summary with breakdown
 * @throws Error if dice notation is invalid
 */
export const rollDamageDice = (
	notation: string,
	abilityModifier: number,
	critical: boolean,
	options?: { criticalMode?: 'double' | 'max' },
): DiceRollSummary => {
	const parsed = parseDiceNotation(notation);
	if (!parsed) {
		throw new Error(`Invalid damage dice: ${notation}`);
	}

	const criticalMode = options?.criticalMode ?? 'double';
	const baseDice = parsed.numDice;
	const totalDice = critical && criticalMode === 'double' ? baseDice * 2 : baseDice;

	let rolls: number[];
	if (critical && criticalMode === 'max') {
		// Max damage: treat each die as rolling its maximum value
		rolls = Array.from({ length: baseDice }, () => parsed.dieSize);
	} else {
		rolls = Array.from({ length: totalDice }, () => rollDie(parsed.dieSize));
	}

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

/**
 * Resolve an attack target by ID (character or NPC token)
 * @param db - Database instance
 * @param targetId - ID of the target (character ID or token ID)
 * @returns Attack target object or null if not found
 */
export const resolveAttackTarget = async (db: Database, targetId: string): Promise<AttackTarget | null> => {
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

	// Check if targetId is an NPC token
	const npcToken = await db.getMapTokenById(targetId);
	if (npcToken && npcToken.token_type === 'npc' && npcToken.npc_id) {
		const npcDefinition = await db.getNpcById(npcToken.npc_id);
		const armorClass = npcDefinition?.base_armor_class ?? 12;
		return {
			type: 'npc',
			token: npcToken,
			npcDefinition,
			armorClass,
		};
	}

	return null;
};

/**
 * Apply damage to a target (character or NPC token)
 * @param db - Database instance
 * @param target - Attack target to damage
 * @param damage - Amount of damage to apply
 * @returns Remaining health after damage
 */
export const applyDamageToTarget = async (db: Database, target: AttackTarget, damage: number): Promise<number> => {
	if (damage <= 0) {
		return target.type === 'character' ? target.row.health : (target.token.hit_points ?? target.token.max_hit_points ?? 0);
	}

	if (target.type === 'character') {
		const remainingHealth = Math.max(0, target.row.health - damage);
		await db.updateCharacter(target.row.id, { health: remainingHealth });
		return remainingHealth;
	}

	const currentHealth = target.token.hit_points ?? target.token.max_hit_points ?? 0;
	const remainingHealth = Math.max(0, currentHealth - damage);
	await db.updateMapToken(target.token.id, {
		hit_points: remainingHealth,
	});
	return remainingHealth;
};

/**
 * Get attack style from parameters (melee or ranged)
 * @param params - Request parameters
 * @returns Attack style ('melee' or 'ranged')
 */
export const getAttackStyle = (params?: Record<string, unknown>): 'melee' | 'ranged' => {
	const requested = typeof params?.attackType === 'string' ? params.attackType.toLowerCase() : 'melee';
	return requested === 'ranged' ? 'ranged' : 'melee';
};

/**
 * Get damage dice notation based on attack style and custom dice
 * @param attackStyle - Attack style ('melee' or 'ranged')
 * @param customDice - Optional custom dice notation override
 * @returns Damage dice notation string
 */
export const getDamageDice = (attackStyle: 'melee' | 'ranged', customDice?: unknown): string => {
	if (typeof customDice === 'string' && customDice.trim().length > 0) {
		return customDice.trim();
	}
	return attackStyle === 'ranged' ? '1d6' : '1d8';
};

/**
 * Calculate spell attack bonus for a character
 * @param attacker - Character casting the spell
 * @param spell - Spell definition
 * @returns Attack bonus value
 */
export const getSpellAttackBonus = (attacker: Character, spell: SpellDefinition): number => {
	if (spell.attackAbilityOverride) {
		const abilityScore = getAbilityScore(attacker, spell.attackAbilityOverride);
		return getAbilityModifier(abilityScore) + calculateProficiencyBonus(attacker.level);
	}
	return calculateAttackBonus(attacker, 'spell');
};

/**
 * Calculate spell damage modifier for a character
 * @param attacker - Character casting the spell
 * @param spell - Spell definition
 * @returns Damage modifier value
 */
export const getSpellDamageModifier = (attacker: Character, spell: SpellDefinition): number => {
	if (!spell.damageAbility) {
		return 0;
	}
	if (spell.damageAbility === 'spellcasting') {
		return getSpellcastingAbilityModifier(attacker);
	}
	return getAbilityModifier(getAbilityScore(attacker, spell.damageAbility));
};

/**
 * Build a combat target summary from an attack target
 * @param target - Attack target (character or NPC)
 * @returns Combat target summary or undefined if target is null
 */
export const buildTargetSummary = (target?: AttackTarget | null): CombatTargetSummary | undefined => {
	if (!target) {
		return undefined;
	}
	return {
		type: target.type,
		id: target.type === 'character' ? target.row.id : target.token.id,
		name: target.type === 'character' ? target.character.name : (target.token.label || 'Unknown'),
		armorClass: target.armorClass,
		remainingHealth: target.type === 'character' ? target.row.health : (target.token.hit_points ?? target.token.max_hit_points ?? 0),
		maxHealth: target.type === 'character' ? target.row.max_health : (target.token.max_hit_points ?? 0),
	};
};

/**
 * Handle a basic attack action
 * @param options - Basic attack options
 * @returns Attack result or error response
 */
export const handleBasicAttack = async ({
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
	const hit = critical || (!fumble && attackRoll.total >= target.armorClass);

	let damageRoll: DiceRollSummary | undefined;
	let damageDealt = 0;
	let remainingHealth =
		target.type === 'character' ? target.row.health : (target.token.hit_points ?? target.token.max_hit_points ?? 0);

	if (hit) {
		const abilityKey = attackStyle === 'ranged' ? 'DEX' : 'STR';
		const abilityModifier = getAbilityModifier(getAbilityScore(attacker, abilityKey));
		const damageDice = getDamageDice(attackStyle, params?.damageDice);
		const criticalMode = critical ? { criticalMode: 'max' as const } : undefined;
		damageRoll = rollDamageDice(damageDice, abilityModifier, critical, criticalMode);
		damageDealt = Math.max(0, damageRoll.total);
		remainingHealth = await applyDamageToTarget(db, target, damageDealt);
	}

	const result: BasicAttackResult = {
		type: 'basic_attack',
		attackStyle,
		target: {
			type: target.type,
			id: target.type === 'character' ? target.row.id : target.token.id,
			name: target.type === 'character' ? target.character.name : (target.token.label || 'Unknown'),
			armorClass: target.armorClass,
			remainingHealth,
			maxHealth: target.type === 'character' ? target.row.max_health : (target.token.max_hit_points ?? 0),
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

/**
 * Handle a spell cast action
 * @param options - Spell cast options
 * @returns Spell cast result or error response
 */
export const handleSpellCast = async ({
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
				}
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
