import { SpellDefinition } from '@/types/spell';
import type { StatKey } from '@/types/stats';

const spell = (definition: SpellDefinition): SpellDefinition => definition;

export const SPELL_DEFINITIONS: Record<string, SpellDefinition> = {
	'magic-missile': spell({
		id: 'magic-missile',
		name: 'Magic Missile',
		level: 1,
		actionPoints: 2,
		description: 'Launch darts of force that automatically strike the target.',
		classes: ['wizard', 'sorcerer'],
		attackType: 'auto-hit',
		damageDice: '3d4+3',
		damageType: 'force',
		range: 120,
	}),
	firebolt: spell({
		id: 'firebolt',
		name: 'Firebolt',
		level: 0,
		actionPoints: 1,
		description: 'Hurl a mote of fire at a creature you can see.',
		classes: ['wizard', 'sorcerer'],
		attackType: 'attack',
		damageDice: '1d10',
		damageType: 'fire',
		range: 120,
	}),
	fireball: spell({
		id: 'fireball',
		name: 'Fireball',
		level: 3,
		actionPoints: 3,
		description: 'A bright streak erupts and blossoms into a fiery explosion.',
		classes: ['wizard', 'sorcerer'],
		attackType: 'save',
		damageDice: '8d6',
		damageType: 'fire',
		range: 150,
		saveAbility: 'DEX',
	}),
	'sacred-flame': spell({
		id: 'sacred-flame',
		name: 'Sacred Flame',
		level: 0,
		actionPoints: 1,
		description: 'Radiant fire descends on a creature you can see.',
		classes: ['cleric'],
		attackType: 'attack',
		damageDice: '1d8',
		damageType: 'radiant',
		range: 60,
	}),
	'cure-wounds': spell({
		id: 'cure-wounds',
		name: 'Cure Wounds',
		level: 1,
		actionPoints: 2,
		description: 'A creature you touch regains 1d8 + spellcasting modifier hit points.',
		classes: ['cleric', 'paladin', 'bard', 'druid', 'artificer'],
		attackType: 'support',
		damageDice: '1d8',
		damageType: 'healing',
		range: 5,
	}),
	shield: spell({
		id: 'shield',
		name: 'Shield',
		level: 1,
		actionPoints: 2,
		description: 'A shimmering barrier grants +5 AC until the start of your next turn.',
		classes: ['wizard', 'sorcerer', 'artificer'],
		attackType: 'support',
		range: 0,
	}),
	bless: spell({
		id: 'bless',
		name: 'Bless',
		level: 1,
		actionPoints: 2,
		description: 'Bless up to three creatures, granting +1d4 to attack rolls and saves.',
		classes: ['cleric', 'paladin'],
		attackType: 'support',
		range: 30,
	}),
};

const normalizeClass = (className?: string): string => (className ? className.toLowerCase() : '');

export const getSpellsForClass = (className?: string, maxLevel?: number): SpellDefinition[] => {
	const normalizedClass = normalizeClass(className);
	return Object.values(SPELL_DEFINITIONS).filter((definition) => {
		const allowed =
			!normalizedClass ||
			definition.classes.some((classId) => normalizedClass.includes(classId.toLowerCase()));
		const withinLevel = typeof maxLevel === 'number' ? definition.level <= maxLevel : true;
		return allowed && withinLevel;
	});
};

export const findSpellByName = (spellName?: string): SpellDefinition | undefined => {
	if (!spellName) {
		return undefined;
	}
	const normalized = spellName.trim().toLowerCase();
	return Object.values(SPELL_DEFINITIONS).find((definition) => {
		return (
			definition.id === normalized ||
			definition.name.toLowerCase() === normalized ||
			definition.name.toLowerCase().replace(/\s+/g, '-') === normalized
		);
	});
};

export const getSpellAttackAbilityOverride = (spellId: string): StatKey | undefined => {
	return SPELL_DEFINITIONS[spellId]?.attackAbilityOverride;
};

