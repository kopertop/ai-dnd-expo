// D&D 4e Skills by Ability Score with color coding

export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export const ABILITY_COLORS: Record<AbilityKey, string> = {
	STR: '#B22222', // Red
	DEX: '#228B22', // Green
	CON: '#8B5C2A', // Brown
	INT: '#1E90FF', // Blue
	WIS: '#2E8B8B', // Teal/Sage
	CHA: '#8B008B', // Purple/Magenta
};

export interface Skill {
	id: string;
	name: string;
	ability: AbilityKey;
	image: any; // require()
}

export const SKILL_LIST: Skill[] = [
	{ id: 'athletics', name: 'Athletics', ability: 'STR', image: require('../assets/images/skills/athletics.png') },
	{ id: 'acrobatics', name: 'Acrobatics', ability: 'DEX', image: require('../assets/images/skills/acrobatics.png') },
	{ id: 'stealth', name: 'Stealth', ability: 'DEX', image: require('../assets/images/skills/stealth.png') },
	{ id: 'thievery', name: 'Thievery', ability: 'DEX', image: require('../assets/images/skills/thievery.png') },
	{ id: 'endurance', name: 'Endurance', ability: 'CON', image: require('../assets/images/skills/endurance.png') },
	{ id: 'arcana', name: 'Arcana', ability: 'INT', image: require('../assets/images/skills/arcana.png') },
	{ id: 'history', name: 'History', ability: 'INT', image: require('../assets/images/skills/history.png') },
	{ id: 'religion', name: 'Religion', ability: 'INT', image: require('../assets/images/skills/religion.png') },
	{ id: 'dungeoneering', name: 'Dungeoneering', ability: 'WIS', image: require('../assets/images/skills/dungeoneering.png') },
	{ id: 'heal', name: 'Heal', ability: 'WIS', image: require('../assets/images/skills/heal.png') },
	{ id: 'insight', name: 'Insight', ability: 'WIS', image: require('../assets/images/skills/insight.png') },
	{ id: 'nature', name: 'Nature', ability: 'WIS', image: require('../assets/images/skills/nature.png') },
	{ id: 'perception', name: 'Perception', ability: 'WIS', image: require('../assets/images/skills/perception.png') },
	{ id: 'bluff', name: 'Bluff', ability: 'CHA', image: require('../assets/images/skills/bluff.png') },
	{ id: 'diplomacy', name: 'Diplomacy', ability: 'CHA', image: require('../assets/images/skills/diplomacy.png') },
	{ id: 'intimidate', name: 'Intimidate', ability: 'CHA', image: require('../assets/images/skills/intimidate.png') },
	{ id: 'streetwise', name: 'Streetwise', ability: 'CHA', image: require('../assets/images/skills/streetwise.png') },
];

export const SKILL_MAP: Record<AbilityKey, string[]> = {
	STR: ['Athletics'],
	DEX: ['Acrobatics', 'Stealth', 'Thievery'],
	CON: ['Endurance'],
	INT: ['Arcana', 'History', 'Religion'],
	WIS: ['Dungeoneering', 'Heal', 'Insight', 'Nature', 'Perception'],
	CHA: ['Bluff', 'Diplomacy', 'Intimidate', 'Streetwise'],
};
