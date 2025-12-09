// D&D 5e stat keys
export const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

// Attribute descriptions for tooltips
export const ATTRIBUTE_DESCRIPTIONS: Record<string, string> = {
	STR: 'Strength - Measures physical power and athletic ability. Affects melee attacks, carrying capacity, and athletic skills.',
	DEX: 'Dexterity - Measures agility, reflexes, and balance. Affects AC, ranged attacks, initiative, and stealth skills.',
	CON: 'Constitution - Measures endurance and health. Affects hit points and resistance to disease and poison.',
	INT: 'Intelligence - Measures reasoning ability and memory. Affects investigation, arcana, and other knowledge-based skills.',
	WIS: 'Wisdom - Measures awareness, intuition, and insight. Affects perception, survival, and insight skills.',
	CHA: 'Charisma - Measures force of personality and leadership. Affects persuasion, deception, and social interaction skills.',
};

// Only export STAT_KEYS and any data/constants, all types/schemas are now in types/.
