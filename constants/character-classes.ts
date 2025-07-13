/**
 * Character Class Configurations - Templates for Creating Characters
 * Pre-configured class data for quick character/companion generation
 */

import type { 
	CharacterClassConfig, 
	CharacterClass, 
	DiceType,
	AbilityScores,
	Skills,
	SavingThrows,
	ClassFeature
} from '@/types/characters';

/**
 * Base class features available to multiple classes
 */
const BASE_FEATURES = {
	FIGHTING_STYLE: {
		name: 'Fighting Style',
		description: 'Choose a fighting style that suits your combat preferences.',
		level: 1,
	},
	SECOND_WIND: {
		name: 'Second Wind',
		description: 'Regain hit points as a bonus action.',
		level: 1,
		uses: { total: 1, used: 0, resetOn: 'short-rest' as const },
	},
	ACTION_SURGE: {
		name: 'Action Surge',
		description: 'Take an additional action on your turn.',
		level: 2,
		uses: { total: 1, used: 0, resetOn: 'short-rest' as const },
	},
	RAGE: {
		name: 'Rage',
		description: 'Enter a battle rage for increased damage and resistance.',
		level: 1,
		uses: { total: 2, used: 0, resetOn: 'long-rest' as const },
	},
	BARDIC_INSPIRATION: {
		name: 'Bardic Inspiration',
		description: 'Inspire allies with encouraging words.',
		level: 1,
		uses: { total: 3, used: 0, resetOn: 'short-rest' as const },
	},
	SNEAK_ATTACK: {
		name: 'Sneak Attack',
		description: 'Deal extra damage when you have advantage.',
		level: 1,
	},
	CHANNEL_DIVINITY: {
		name: 'Channel Divinity',
		description: 'Channel divine energy for various effects.',
		level: 2,
		uses: { total: 1, used: 0, resetOn: 'short-rest' as const },
	},
} satisfies Record<string, ClassFeature>;

/**
 * Fighter - Versatile warrior with combat expertise
 */
const FIGHTER_CONFIG: CharacterClassConfig = {
	name: 'fighter',
	hitDie: 'd10',
	primaryAbilities: ['strength', 'dexterity'],
	savingThrowProficiencies: ['strength', 'constitution'],
	skillChoices: {
		options: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
		count: 2,
	},
	startingEquipment: [
		'chain-mail',
		'longsword',
		'shield',
		'light-crossbow',
		'crossbow-bolts-20',
		'explorers-pack',
		'handaxe-2',
	],
	features: [
		BASE_FEATURES.FIGHTING_STYLE,
		BASE_FEATURES.SECOND_WIND,
		BASE_FEATURES.ACTION_SURGE,
	],
};

/**
 * Wizard - Master of arcane magic and spells
 */
const WIZARD_CONFIG: CharacterClassConfig = {
	name: 'wizard',
	hitDie: 'd6',
	primaryAbilities: ['intelligence'],
	savingThrowProficiencies: ['intelligence', 'wisdom'],
	skillChoices: {
		options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
		count: 2,
	},
	startingEquipment: [
		'quarterstaff',
		'component-pouch',
		'scholars-pack',
		'leather-armor',
		'dagger',
		'spellbook',
	],
	spellcasting: {
		ability: 'intelligence',
		type: 'full',
	},
	features: [
		{
			name: 'Spellcasting',
			description: 'Cast wizard spells using Intelligence as spellcasting ability.',
			level: 1,
		},
		{
			name: 'Arcane Recovery',
			description: 'Recover expended spell slots during a short rest.',
			level: 1,
			uses: { total: 1, used: 0, resetOn: 'long-rest' },
		},
	],
};

/**
 * Rogue - Skilled infiltrator and damage dealer
 */
const ROGUE_CONFIG: CharacterClassConfig = {
	name: 'rogue',
	hitDie: 'd8',
	primaryAbilities: ['dexterity'],
	savingThrowProficiencies: ['dexterity', 'intelligence'],
	skillChoices: {
		options: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
		count: 4,
	},
	startingEquipment: [
		'rapier',
		'shortbow',
		'arrows-20',
		'thieves-tools',
		'leather-armor',
		'dagger-2',
		'burglars-pack',
	],
	features: [
		{
			name: 'Expertise',
			description: 'Double proficiency bonus for chosen skills.',
			level: 1,
		},
		BASE_FEATURES.SNEAK_ATTACK,
		{
			name: "Thieves' Cant",
			description: 'Secret language of rogues and criminals.',
			level: 1,
		},
	],
};

/**
 * Cleric - Divine spellcaster and healer
 */
const CLERIC_CONFIG: CharacterClassConfig = {
	name: 'cleric',
	hitDie: 'd8',
	primaryAbilities: ['wisdom'],
	savingThrowProficiencies: ['wisdom', 'charisma'],
	skillChoices: {
		options: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
		count: 2,
	},
	startingEquipment: [
		'scale-mail',
		'shield',
		'mace',
		'light-crossbow',
		'crossbow-bolts-20',
		'priests-pack',
		'holy-symbol',
	],
	spellcasting: {
		ability: 'wisdom',
		type: 'full',
	},
	features: [
		{
			name: 'Spellcasting',
			description: 'Cast cleric spells using Wisdom as spellcasting ability.',
			level: 1,
		},
		{
			name: 'Divine Domain',
			description: 'Choose a divine domain that grants additional spells and features.',
			level: 1,
		},
		BASE_FEATURES.CHANNEL_DIVINITY,
	],
};

/**
 * Ranger - Nature warrior with survival skills
 */
const RANGER_CONFIG: CharacterClassConfig = {
	name: 'ranger',
	hitDie: 'd10',
	primaryAbilities: ['dexterity', 'wisdom'],
	savingThrowProficiencies: ['strength', 'dexterity'],
	skillChoices: {
		options: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
		count: 3,
	},
	startingEquipment: [
		'scale-mail',
		'shortsword-2',
		'longbow',
		'arrows-20',
		'explorers-pack',
		'leather-armor',
	],
	spellcasting: {
		ability: 'wisdom',
		type: 'half',
	},
	features: [
		{
			name: 'Favored Enemy',
			description: 'Choose a type of creature you have studied extensively.',
			level: 1,
		},
		{
			name: 'Natural Explorer',
			description: 'Choose a favored terrain where you excel.',
			level: 1,
		},
		BASE_FEATURES.FIGHTING_STYLE,
	],
};

/**
 * Barbarian - Fierce warrior powered by primal rage
 */
const BARBARIAN_CONFIG: CharacterClassConfig = {
	name: 'barbarian',
	hitDie: 'd12',
	primaryAbilities: ['strength'],
	savingThrowProficiencies: ['strength', 'constitution'],
	skillChoices: {
		options: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
		count: 2,
	},
	startingEquipment: [
		'greataxe',
		'handaxe-2',
		'explorers-pack',
		'javelin-4',
		'leather-armor',
	],
	features: [
		BASE_FEATURES.RAGE,
		{
			name: 'Unarmored Defense',
			description: 'While not wearing armor, AC equals 10 + Dex modifier + Con modifier.',
			level: 1,
		},
	],
};

/**
 * Bard - Charismatic performer with magical abilities
 */
const BARD_CONFIG: CharacterClassConfig = {
	name: 'bard',
	hitDie: 'd8',
	primaryAbilities: ['charisma'],
	savingThrowProficiencies: ['dexterity', 'charisma'],
	skillChoices: {
		options: ['deception', 'history', 'investigation', 'persuasion', 'religion', 'sleightOfHand'],
		count: 3,
	},
	startingEquipment: [
		'rapier',
		'entertainers-pack',
		'leather-armor',
		'dagger',
		'musical-instrument',
	],
	spellcasting: {
		ability: 'charisma',
		type: 'full',
	},
	features: [
		{
			name: 'Spellcasting',
			description: 'Cast bard spells using Charisma as spellcasting ability.',
			level: 1,
		},
		BASE_FEATURES.BARDIC_INSPIRATION,
	],
};

/**
 * All character class configurations
 */
export const CHARACTER_CLASS_CONFIGS: Record<CharacterClass, CharacterClassConfig> = {
	fighter: FIGHTER_CONFIG,
	wizard: WIZARD_CONFIG,
	rogue: ROGUE_CONFIG,
	cleric: CLERIC_CONFIG,
	ranger: RANGER_CONFIG,
	barbarian: BARBARIAN_CONFIG,
	bard: BARD_CONFIG,
	
	// Placeholder configs for classes not yet fully implemented
	druid: {
		...CLERIC_CONFIG,
		name: 'druid',
		primaryAbilities: ['wisdom'],
		startingEquipment: ['scimitar', 'shield', 'leather-armor', 'explorers-pack'],
		features: [
			{
				name: 'Druidcraft',
				description: 'Know minor nature-based cantrips.',
				level: 1,
			},
		],
	},
	monk: {
		...ROGUE_CONFIG,
		name: 'monk',
		hitDie: 'd8',
		primaryAbilities: ['dexterity', 'wisdom'],
		savingThrowProficiencies: ['strength', 'dexterity'],
		startingEquipment: ['shortsword', 'dart-10', 'explorers-pack'],
		features: [
			{
				name: 'Martial Arts',
				description: 'Use martial arts techniques in unarmed combat.',
				level: 1,
			},
		],
	},
	paladin: {
		...FIGHTER_CONFIG,
		name: 'paladin',
		primaryAbilities: ['strength', 'charisma'],
		savingThrowProficiencies: ['wisdom', 'charisma'],
		spellcasting: {
			ability: 'charisma',
			type: 'half',
		},
		features: [
			{
				name: 'Divine Sense',
				description: 'Detect celestials, fiends, and undead.',
				level: 1,
			},
		],
	},
	sorcerer: {
		...WIZARD_CONFIG,
		name: 'sorcerer',
		primaryAbilities: ['charisma'],
		savingThrowProficiencies: ['constitution', 'charisma'],
		spellcasting: {
			ability: 'charisma',
			type: 'full',
		},
		features: [
			{
				name: 'Sorcerous Origin',
				description: 'Your innate magic comes from a draconic bloodline.',
				level: 1,
			},
		],
	},
	warlock: {
		...WIZARD_CONFIG,
		name: 'warlock',
		hitDie: 'd8',
		primaryAbilities: ['charisma'],
		savingThrowProficiencies: ['wisdom', 'charisma'],
		spellcasting: {
			ability: 'charisma',
			type: 'warlock',
		},
		features: [
			{
				name: 'Otherworldly Patron',
				description: 'Your patron grants you magical power.',
				level: 1,
			},
		],
	},
};

/**
 * Helper function to get class configuration
 */
export function getClassConfig(characterClass: CharacterClass): CharacterClassConfig {
	return CHARACTER_CLASS_CONFIGS[characterClass];
}

/**
 * Get available class options for character creation
 */
export function getAvailableClasses(): { value: CharacterClass; label: string; description: string }[] {
	return [
		{ value: 'fighter', label: 'Fighter', description: 'A master of martial combat, skilled with a variety of weapons and armor.' },
		{ value: 'wizard', label: 'Wizard', description: 'A scholarly magic-user capable of manipulating the structures of spellcasting.' },
		{ value: 'rogue', label: 'Rogue', description: 'A scoundrel who uses stealth and trickery to achieve their goals.' },
		{ value: 'cleric', label: 'Cleric', description: 'A priestly champion who wields divine magic in service of a higher power.' },
		{ value: 'ranger', label: 'Ranger', description: 'A warrior of the wilderness, skilled in tracking, survival, and combat.' },
		{ value: 'barbarian', label: 'Barbarian', description: 'A fierce warrior of primitive background who can enter a battle rage.' },
		{ value: 'bard', label: 'Bard', description: 'A performer whose music holds magical power to help allies or hinder foes.' },
		{ value: 'druid', label: 'Druid', description: 'A priest of nature, wielding elemental forces and transformative magic.' },
		{ value: 'monk', label: 'Monk', description: 'A master of martial arts, harnessing inner power through discipline.' },
		{ value: 'paladin', label: 'Paladin', description: 'A holy warrior bound to a sacred oath, combining combat prowess with divine magic.' },
		{ value: 'sorcerer', label: 'Sorcerer', description: 'A spellcaster who draws on inherent magic from a draconic or otherworldly bloodline.' },
		{ value: 'warlock', label: 'Warlock', description: 'A wielder of magic derived from a bargain with an extraplanar entity.' },
	];
}