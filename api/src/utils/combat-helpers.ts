import { Database } from '../../../shared/workers/db';
import type { BasicAttackOptions, SpellCastOptions } from '../routes/games/types';

import { deserializeCharacter } from './games-utils';

import {
	DamageType,
	getCharacterResistances,
	getDamageMultiplier,
	getNpcResistances,
	getNpcTokenResistances,
} from '@/constants/damage-types';
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
	calculateSpellSaveDC,
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
 * Calculate damage applying resistances/weaknesses/immunities
 * @param baseDamage - Raw damage amount
 * @param damageType - Type of damage
 * @param target - Target to apply damage to
 * @returns Final damage amount and multiplier applied
 */
export const calculateDamageWithResistances = (
	baseDamage: number,
	damageType: DamageType,
	target: AttackTarget,
): { damage: number; multiplier: number } => {
	let resistances;
	if (target.type === 'character') {
		resistances = getCharacterResistances(target.character);
	} else if (target.type === 'npc') {
		// Prefer token metadata if available, otherwise definition
		if (target.token.metadata) {
			const tokenMeta =
				typeof target.token.metadata === 'string'
					? JSON.parse(target.token.metadata)
					: target.token.metadata;
			resistances = getNpcTokenResistances(tokenMeta);
		} else if (target.npcDefinition) {
			resistances = getNpcResistances(target.npcDefinition as any);
		} else {
			resistances = {};
		}
	} else {
		resistances = {};
	}

	const multiplier = getDamageMultiplier(damageType, resistances);
	const damage = Math.floor(baseDamage * multiplier);
	return { damage, multiplier };
};

/**
 * Apply damage to a target (character or NPC token)
 * @param db - Database instance
 * @param target - Attack target to damage
 * @param damage - Amount of damage to apply
 * @param damageType - Optional type of damage for resistance calculation
 * @returns Remaining health after damage
 */
export const applyDamageToTarget = async (
	db: Database,
	target: AttackTarget,
	damage: number,
	damageType?: DamageType,
): Promise<number> => {
	let finalDamage = damage;

	if (damageType) {
		const result = calculateDamageWithResistances(damage, damageType, target);
		finalDamage = result.damage;
	}

	if (finalDamage <= 0) {
		return target.type === 'character'
			? target.row.health
			: target.token.hit_points ?? target.token.max_hit_points ?? 0;
	}

	if (target.type === 'character') {
		const remainingHealth = Math.max(0, target.row.health - finalDamage);
		await db.updateCharacter(target.row.id, { health: remainingHealth });
		return remainingHealth;
	}

	const currentHealth = target.token.hit_points ?? target.token.max_hit_points ?? 0;
	const remainingHealth = Math.max(0, currentHealth - finalDamage);
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
 * @param attacker - Character performing the attack
 * @param attackStyle - Attack style ('melee' or 'ranged')
 * @param customDice - Optional custom dice notation override
 * @returns Damage dice notation string
 */
export const getDamageDice = (attacker: Character, attackStyle: 'melee' | 'ranged', customDice?: unknown): string => {
	if (typeof customDice === 'string' && customDice.trim().length > 0) {
		return customDice.trim();
	}

	// Check for equipped weapon
	// Cast to any to safely access inventory/equipped
	const charAny = attacker as any;
	if (charAny.equipped && Array.isArray(charAny.inventory)) {
		const weaponId = charAny.equipped.mainHand;
		if (weaponId) {
			const weapon = charAny.inventory.find((i: any) => i.id === weaponId);
			if (weapon && weapon.damageDice) {
				return weapon.damageDice;
			}
		}
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
 * Roll a saving throw for a target
 * @param target - Target to roll save for
 * @param ability - Ability to roll save for (e.g. 'DEX', 'WIS')
 * @returns Save roll result
 */
const rollSave = (target: AttackTarget, ability: string): { total: number; roll: number; modifier: number } => {
	// Normalize ability string to StatKey (e.g. "dexterity" -> "DEX")
	const statKey = ability.toUpperCase().substring(0, 3) as any;

	let modifier = 0;
	if (target.type === 'character') {
		modifier = getAbilityModifier(getAbilityScore(target.character, statKey));
	} else if (target.type === 'npc') {
		const stats =
			typeof target.npcDefinition?.stats === 'string'
				? JSON.parse(target.npcDefinition.stats)
				: target.npcDefinition?.stats || {};
		modifier = getAbilityModifier(getAbilityScore({ stats }, statKey));
	}

	const roll = rollDie(20);
	return { total: roll + modifier, roll, modifier };
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

	// Check if target is unconscious (0 HP)
	const currentHealth =
		target.type === 'character'
			? target.row.health
			: target.token.hit_points ?? target.token.max_hit_points ?? 0;
	if (currentHealth <= 0) {
		return { error: 'Target is unconscious and cannot be attacked', status: 400 };
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
		target.type === 'character'
			? target.row.health
			: target.token.hit_points ?? target.token.max_hit_points ?? 0;
	let damageType: DamageType = 'bludgeoning'; // Default
	let damageMultiplier: number | undefined;

	if (hit) {
		const abilityKey = attackStyle === 'ranged' ? 'DEX' : 'STR';
		const abilityModifier = getAbilityModifier(getAbilityScore(attacker, abilityKey));
		const damageDice = getDamageDice(attacker, attackStyle, params?.damageDice);
		const criticalMode = critical ? { criticalMode: 'max' as const } : undefined;

		// Determine damage type
		if (attackStyle === 'ranged') {
			damageType = 'piercing';
		}

		// Check equipped weapon for damage type override
		const equipped = attacker.equipped || {};
		const weaponId = equipped.mainHand || equipped.offHand;
		if (weaponId) {
			const weapon = attacker.inventory.find(i => i.id === weaponId);
			if (weapon && weapon.metadata && typeof weapon.metadata === 'object' && 'damageType' in weapon.metadata) {
				const meta = weapon.metadata as any;
				if (meta.damageType) {
					damageType = meta.damageType as DamageType;
				}
			}
		}

		damageRoll = rollDamageDice(damageDice, abilityModifier, critical, criticalMode);
		const rawDamage = Math.max(0, damageRoll.total);
		const resistanceResult = calculateDamageWithResistances(rawDamage, damageType, target);
		damageDealt = resistanceResult.damage;
		damageMultiplier = resistanceResult.multiplier;

		remainingHealth = await applyDamageToTarget(db, target, damageDealt);
	}

	const result: BasicAttackResult = {
		type: 'basic_attack',
		attackStyle,
		target: {
			type: target.type,
			id: target.type === 'character' ? target.row.id : target.token.id,
			name: target.type === 'character' ? target.character.name : target.token.label || 'Unknown',
			armorClass: target.armorClass,
			remainingHealth,
			maxHealth:
				target.type === 'character' ? target.row.max_health : target.token.max_hit_points ?? 0,
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
		damageType,
		damageMultiplier,
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
	const needsTarget = spell.attackType === 'attack' || spell.attackType === 'auto-hit' || spell.attackType === 'save' || spell.attackType === 'support';
	if (needsTarget && targetId) {
		target = await resolveAttackTarget(db, targetId);
		if (!target) {
			return { error: 'Target not found', status: 404 };
		}

		// Check if target is unconscious (0 HP)
		const currentHealth = target.type === 'character' ? target.row.health : (target.token.hit_points ?? target.token.max_hit_points ?? 0);
		if (currentHealth <= 0) {
			// Allow healing spells and specific resurrection spells
			const isHealing = spell.damageType === 'healing';
			const isResurrection = ['revivify', 'raise dead', 'resurrection', 'true resurrection', 'reincarnate', 'spare the dying'].includes(spell.name.toLowerCase());

			if (!isHealing && !isResurrection) {
				return { error: 'Target is unconscious and cannot be targeted by this spell', status: 400 };
			}
		}
	}

	// Extract damage type, defaulting to 'force' for magical damage if not specified
	const damageType: DamageType = spell.damageType ?? 'force';

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
				const rawDamage = Math.max(0, damageRoll.total);

				// Calculate resistances/vulnerabilities/immunities
				const resistanceResult = calculateDamageWithResistances(rawDamage, damageType, target);
				const damageDealt = resistanceResult.damage;

				const remainingHealth = await applyDamageToTarget(db, target, damageDealt);

				result.damageRoll = damageRoll;
				result.damageDealt = damageDealt;
				result.damageType = damageType;
				result.damageMultiplier = resistanceResult.multiplier;
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
			const rawDamage = Math.max(0, damageRoll.total);

			// Calculate resistances/vulnerabilities/immunities
			const resistanceResult = calculateDamageWithResistances(rawDamage, damageType, target);
			const damageDealt = resistanceResult.damage;

			const remainingHealth = await applyDamageToTarget(db, target, damageDealt);

			result.hit = true;
			result.damageRoll = damageRoll;
			result.damageDealt = damageDealt;
			result.damageType = damageType;
			result.damageMultiplier = resistanceResult.multiplier;
			if (result.target) {
				result.target.remainingHealth = remainingHealth;
			}
			break;
		}

		case 'save': {
			if (!spell.saveAbility || !target) {
				return { error: 'Spell configuration incomplete', status: 400 };
			}

			const saveDC = calculateSpellSaveDC(attacker);
			const saveRoll = rollSave(target, spell.saveAbility);
			const success = saveRoll.total >= saveDC;

			result.saveDC = saveDC;
			result.saveRoll = {
				notation: '1d20',
				rolls: [saveRoll.roll],
				modifier: saveRoll.modifier,
				total: saveRoll.total,
				breakdown: `${saveRoll.roll}${formatModifierText(saveRoll.modifier)} = ${saveRoll.total}`,
				natural: saveRoll.roll,
			};
			result.saveResult = success ? 'success' : 'fail';
			result.hit = !success; // Fail save = Hit

			if (spell.damageDice) {
				const damageModifier = getSpellDamageModifier(attacker, spell);
				const damageDice =
					typeof params?.damageDice === 'string' && params.damageDice.trim().length
						? params.damageDice.trim()
						: spell.damageDice;

				const damageRoll = rollDamageDice(damageDice, damageModifier, false);
				const rawDamage = Math.max(0, damageRoll.total);

				// Apply resistances/vulnerabilities/immunities to base damage first
				const resistanceResult = calculateDamageWithResistances(rawDamage, damageType, target);
				let damageDealt = resistanceResult.damage;

				if (success) {
					// Half damage on save success (after resistances are applied)
					damageDealt = Math.floor(damageDealt / 2);
				}

				const remainingHealth = await applyDamageToTarget(db, target, damageDealt);

				result.damageRoll = damageRoll;
				result.damageDealt = damageDealt;
				result.damageType = damageType;
				result.damageMultiplier = resistanceResult.multiplier;
				if (result.target) {
					result.target.remainingHealth = remainingHealth;
				}
			}
			break;
		}

		case 'support': {
			// Handle healing
			if (spell.damageType === 'healing' && spell.damageDice && target) {
				const damageModifier = getSpellDamageModifier(attacker, spell);
				const damageDice =
					typeof params?.damageDice === 'string' && params.damageDice.trim().length
						? params.damageDice.trim()
						: spell.damageDice;

				const healRoll = rollDamageDice(damageDice, damageModifier, false);
				const healAmount = Math.max(0, healRoll.total);

				// Apply healing (clamp to max health)
				const currentHealth =
					target.type === 'character'
						? target.row.health
						: target.token.hit_points ?? target.token.max_hit_points ?? 0;
				const maxHealth =
					target.type === 'character'
						? target.row.max_health
						: target.token.max_hit_points ?? 0;
				const nextHealth = Math.min(maxHealth, currentHealth + healAmount);

				if (target.type === 'character') {
					await db.updateCharacter(target.row.id, { health: nextHealth });
				} else {
					await db.updateMapToken(target.token.id, { hit_points: nextHealth });
				}

				result.hit = true;
				result.damageRoll = healRoll;
				result.damageDealt = healAmount;
				if (result.target) {
					result.target.remainingHealth = nextHealth;
				}
			}
			// Fallback for other support spells (no effect yet)
			break;
		}

		default:
			return { error: 'Unsupported spell type', status: 400 };
	}

	return { result };
};
