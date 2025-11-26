import type { Character as AppCharacter } from '@/types/character';
import type { Character as WorkerCharacter, StatBlock as WorkerStatBlock } from '@/shared/workers/types';
import type { StatBlock, StatKey } from '@/types/stats';

type CharacterStats = Partial<Record<string, number>> | Partial<WorkerStatBlock> | Partial<StatBlock>;

export type CombatCharacter = Partial<AppCharacter> | Partial<WorkerCharacter> & {
	stats?: CharacterStats;
};

const BASE_AC = 10;

const STAT_ALIAS_MAP: Record<StatKey, string[]> = {
	STR: ['STR', 'str', 'strength'],
	DEX: ['DEX', 'dex', 'dexterity'],
	CON: ['CON', 'con', 'constitution'],
	INT: ['INT', 'int', 'intelligence'],
	WIS: ['WIS', 'wis', 'wisdom'],
	CHA: ['CHA', 'cha', 'charisma'],
};

const SPELLCASTING_CLASS_MAP: Record<string, StatKey> = {
	wizard: 'INT',
	sorcerer: 'CHA',
	warlock: 'CHA',
	bard: 'CHA',
	paladin: 'CHA',
	cleric: 'WIS',
	druid: 'WIS',
	ranger: 'WIS',
	artificer: 'INT',
	monk: 'WIS',
};

const DEFAULT_SPELLCASTING_STAT: StatKey = 'INT';

const getNormalizedSkills = (skills?: string[]): string[] =>
	skills?.map((skill) => skill.toLowerCase().trim()) ?? [];

const getStatValue = (stats: CharacterStats | undefined, key: StatKey): number | undefined => {
	if (!stats) {
		return undefined;
	}

	for (const alias of STAT_ALIAS_MAP[key]) {
		const value = stats[alias as keyof typeof stats];
		if (typeof value === 'number') {
			return value;
		}
	}

	return undefined;
};

const getCharacterLevel = (character: CombatCharacter): number => {
	if (typeof character.level === 'number') {
		return character.level;
	}

	// Some character rows may store level under `level` on nested objects
	const maybeLevel = (character as Record<string, unknown>)?.level;
	return typeof maybeLevel === 'number' ? maybeLevel : 1;
};

export const getAbilityModifier = (score?: number): number => {
	if (typeof score !== 'number') {
		return 0;
	}
	return Math.floor((score - 10) / 2);
};

export const calculateProficiencyBonus = (level?: number): number => {
	const safeLevel = typeof level === 'number' && level > 0 ? level : 1;
	return Math.ceil(safeLevel / 4) + 1;
};

export const calculateAC = (character: CombatCharacter): number => {
	const dexScore = getStatValue(character.stats, 'DEX') ?? 10;
	return BASE_AC + getAbilityModifier(dexScore);
};

const getSpellcastingAbilityKey = (character: CombatCharacter): StatKey => {
	const className = typeof character.class === 'string' ? character.class.toLowerCase() : '';
	for (const [match, ability] of Object.entries(SPELLCASTING_CLASS_MAP)) {
		if (className.includes(match)) {
			return ability;
		}
	}
	return DEFAULT_SPELLCASTING_STAT;
};

export const getAbilityScore = (character: CombatCharacter, statKey: StatKey): number => {
	return getStatValue(character.stats, statKey) ?? 10;
};

const getAttackAbilityKey = (attackType: 'melee' | 'ranged' | 'spell', character: CombatCharacter): StatKey => {
	if (attackType === 'spell') {
		return getSpellcastingAbilityKey(character);
	}
	return attackType === 'melee' ? 'STR' : 'DEX';
};

export const calculateAttackBonus = (
	character: CombatCharacter,
	attackType: 'melee' | 'ranged' | 'spell' = 'melee',
): number => {
	const abilityKey = getAttackAbilityKey(attackType, character);
	const abilityScore = getAbilityScore(character, abilityKey);
	const abilityModifier = getAbilityModifier(abilityScore);
	return abilityModifier + calculateProficiencyBonus(getCharacterLevel(character));
};

export const calculateSpellSaveDC = (character: CombatCharacter): number => {
	const spellAbility = getSpellcastingAbilityKey(character);
	const abilityScore = getAbilityScore(character, spellAbility);
	return 8 + getAbilityModifier(abilityScore) + calculateProficiencyBonus(getCharacterLevel(character));
};

export const isSkillProficient = (character: CombatCharacter, skillId: string): boolean => {
	const normalized = skillId.toLowerCase();
	return getNormalizedSkills(character.skills).includes(normalized);
};

export const calculatePassivePerception = (character: CombatCharacter): number => {
	const wisScore = getAbilityScore(character, 'WIS');
	const wisModifier = getAbilityModifier(wisScore);
	const proficiency = isSkillProficient(character, 'perception')
		? calculateProficiencyBonus(getCharacterLevel(character))
		: 0;
	return 10 + wisModifier + proficiency;
};

export const getSpellcastingAbilityModifier = (character: CombatCharacter): number => {
	const spellAbility = getSpellcastingAbilityKey(character);
	return getAbilityModifier(getAbilityScore(character, spellAbility));
};

