import type { Character } from '@/types/character';
import type { Npc } from '@/types/models';
import type { DamageType } from '@/types/spell';

export type { DamageType };

export const DAMAGE_TYPES: DamageType[] = [
	'fire',
	'radiant',
	'force',
	'cold',
	'lightning',
	'acid',
	'necrotic',
	'poison',
	'psychic',
	'thunder',
	'bludgeoning',
	'piercing',
	'slashing',
	'healing',
	'support',
];

// Interface for entities that can have resistances
export interface Resistances {
	weaknesses?: DamageType[];
	resistances?: DamageType[];
	immunities?: DamageType[];
}

/**
 * Extract resistances from a Character
 */
export function getCharacterResistances(character: Character): Resistances {
	return {
		weaknesses: character.weaknesses,
		resistances: character.resistances,
		immunities: character.immunities,
	};
}

/**
 * Extract resistances from an NPC (from metadata)
 */
export function getNpcResistances(npc: Npc): Resistances {
	try {
		const metadata = typeof npc.metadata === 'string' ? JSON.parse(npc.metadata) : npc.metadata;
		return {
			weaknesses: metadata.weaknesses,
			resistances: metadata.resistances,
			immunities: metadata.immunities,
		};
	} catch (e) {
		return {};
	}
}

/**
 * Extract resistances from an NPC token metadata
 */
export function getNpcTokenResistances(tokenMetadata: any): Resistances {
	return {
		weaknesses: tokenMetadata.weaknesses,
		resistances: tokenMetadata.resistances,
		immunities: tokenMetadata.immunities,
	};
}

/**
 * Check if a target has immunity to a damage type
 */
export function isImmunity(damageType: DamageType, resistances: Resistances): boolean {
	return resistances.immunities?.includes(damageType) ?? false;
}

/**
 * Check if a target has weakness to a damage type
 */
export function isWeakness(damageType: DamageType, resistances: Resistances): boolean {
	return resistances.weaknesses?.includes(damageType) ?? false;
}

/**
 * Check if a target has resistance to a damage type
 */
export function isResistance(damageType: DamageType, resistances: Resistances): boolean {
	return resistances.resistances?.includes(damageType) ?? false;
}

/**
 * Get damage multiplier for a damage type against a set of resistances
 * Immunity = 0
 * Weakness = 2
 * Resistance = 0.5
 * Default = 1
 *
 * Note: Immunity takes precedence over everything.
 * Weakness and Resistance cancel out?
 * 5E rules: "Resistance and then vulnerability are applied after all other modifiers to damage."
 * "Multiple instances of resistance or vulnerability that affect the same damage type count as only one instance."
 * If you have both resistance and vulnerability, they don't strictly cancel out in the multiplier sense of 1.
 * But usually: Damage / 2 * 2 = Damage. So effectively 1.
 * However, usually you don't have both. If you do, they cancel.
 */
export function getDamageMultiplier(damageType: DamageType, resistances: Resistances): number {
	if (isImmunity(damageType, resistances)) {
		return 0;
	}

	const weak = isWeakness(damageType, resistances);
	const resist = isResistance(damageType, resistances);

	if (weak && resist) {
		return 1;
	}
	if (weak) {
		return 2;
	}
	if (resist) {
		return 0.5;
	}
	return 1;
}





