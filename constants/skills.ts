// D&D 4e Skills by Ability Score with color coding

import { Skill } from '@/types/skill';

export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export const ABILITY_COLORS: Record<AbilityKey, string> = {
	STR: '#B22222', // Red
	DEX: '#228B22', // Green
	CON: '#8B5C2A', // Brown
	INT: '#1E90FF', // Blue
	WIS: '#2E8B8B', // Teal/Sage
	CHA: '#8B008B', // Purple/Magenta
};

export const SKILL_LIST: Skill[] = [
	{
		id: 'athletics',
		name: 'Athletics',
		ability: 'STR',
		image: require('../assets/images/skills/athletics.png'),
	},
	{
		id: 'acrobatics',
		name: 'Acrobatics',
		ability: 'DEX',
		image: require('../assets/images/skills/acrobatics.png'),
	},
	{
		id: 'stealth',
		name: 'Stealth',
		ability: 'DEX',
		image: require('../assets/images/skills/stealth.png'),
	},
	{
		id: 'thievery',
		name: 'Thievery',
		ability: 'DEX',
		image: require('../assets/images/skills/thievery.png'),
	},
	{
		id: 'endurance',
		name: 'Endurance',
		ability: 'CON',
		image: require('../assets/images/skills/endurance.png'),
	},
	{
		id: 'arcana',
		name: 'Arcana',
		ability: 'INT',
		image: require('../assets/images/skills/arcana.png'),
	},
	{
		id: 'history',
		name: 'History',
		ability: 'INT',
		image: require('../assets/images/skills/history.png'),
	},
	{
		id: 'religion',
		name: 'Religion',
		ability: 'INT',
		image: require('../assets/images/skills/religion.png'),
	},
	{
		id: 'dungeoneering',
		name: 'Dungeoneering',
		ability: 'WIS',
		image: require('../assets/images/skills/dungeoneering.png'),
	},
	{
		id: 'heal',
		name: 'Heal',
		ability: 'WIS',
		image: require('../assets/images/skills/heal.png'),
	},
	{
		id: 'insight',
		name: 'Insight',
		ability: 'WIS',
		image: require('../assets/images/skills/insight.png'),
	},
	{
		id: 'nature',
		name: 'Nature',
		ability: 'WIS',
		image: require('../assets/images/skills/nature.png'),
	},
	{
		id: 'perception',
		name: 'Perception',
		ability: 'WIS',
		image: require('../assets/images/skills/perception.png'),
	},
	{
		id: 'bluff',
		name: 'Bluff',
		ability: 'CHA',
		image: require('../assets/images/skills/bluff.png'),
	},
	{
		id: 'diplomacy',
		name: 'Diplomacy',
		ability: 'CHA',
		image: require('../assets/images/skills/diplomacy.png'),
	},
	{
		id: 'intimidate',
		name: 'Intimidate',
		ability: 'CHA',
		image: require('../assets/images/skills/intimidate.png'),
	},
	{
		id: 'streetwise',
		name: 'Streetwise',
		ability: 'CHA',
		image: require('../assets/images/skills/streetwise.png'),
	},
];

export const SKILL_MAP: Record<AbilityKey, string[]> = {
	STR: ['Athletics'],
	DEX: ['Acrobatics', 'Stealth', 'Thievery'],
	CON: ['Endurance'],
	INT: ['Arcana', 'History', 'Religion'],
	WIS: ['Dungeoneering', 'Heal', 'Insight', 'Nature', 'Perception'],
	CHA: ['Bluff', 'Diplomacy', 'Intimidate', 'Streetwise'],
};

// Skill descriptions for tooltips
export const SKILL_DESCRIPTIONS: Record<string, string> = {
	athletics: 'Strength-based skill for climbing, jumping, swimming, and other physical feats.',
	acrobatics: 'Dexterity-based skill for balance, tumbling, and graceful movement.',
	stealth: 'Dexterity-based skill for hiding, moving silently, and avoiding detection.',
	thievery: 'Dexterity-based skill for picking locks, disarming traps, and sleight of hand.',
	endurance: 'Constitution-based skill for resisting fatigue, disease, and environmental hazards.',
	arcana: 'Intelligence-based skill for knowledge of magic, magical creatures, and arcane lore.',
	history: 'Intelligence-based skill for knowledge of past events, legends, and historical figures.',
	religion: 'Intelligence-based skill for knowledge of deities, religious practices, and holy symbols.',
	dungeoneering: 'Wisdom-based skill for navigating dungeons, recognizing hazards, and understanding underground environments.',
	heal: 'Wisdom-based skill for treating wounds, diagnosing diseases, and providing medical care.',
	insight: 'Wisdom-based skill for reading people, detecting lies, and understanding motives.',
	nature: 'Wisdom-based skill for knowledge of plants, animals, weather, and natural environments.',
	perception: 'Wisdom-based skill for noticing details, detecting hidden objects, and awareness of surroundings.',
	bluff: 'Charisma-based skill for deception, misdirection, and convincing others of falsehoods.',
	diplomacy: 'Charisma-based skill for negotiation, persuasion, and peaceful conflict resolution.',
	intimidate: 'Charisma-based skill for coercion, threats, and forcing others to comply through fear.',
	streetwise: 'Charisma-based skill for knowledge of local customs, finding information, and navigating urban environments.',
};
