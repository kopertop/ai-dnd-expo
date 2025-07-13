/**
 * Character System Types - Foundation for Players and Companions
 * Modular, extensible character data models for D&D gameplay
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DiceRoll {
	type: DiceType;
	count: number;
	modifier?: number;
}

export interface AbilityScores {
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
}

export interface AbilityModifiers {
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
}

export interface Skills {
	// Strength-based
	athletics: number;
	
	// Dexterity-based
	acrobatics: number;
	sleightOfHand: number;
	stealth: number;
	
	// Intelligence-based
	arcana: number;
	history: number;
	investigation: number;
	nature: number;
	religion: number;
	
	// Wisdom-based
	animalHandling: number;
	insight: number;
	medicine: number;
	perception: number;
	survival: number;
	
	// Charisma-based
	deception: number;
	intimidation: number;
	performance: number;
	persuasion: number;
}

export interface SavingThrows {
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
}

export interface HitPoints {
	current: number;
	maximum: number;
	temporary: number;
}

export interface ArmorClass {
	base: number;
	bonus: number;
	total: number;
}

export interface CharacterVitals {
	hitPoints: HitPoints;
	armorClass: ArmorClass;
	speed: number;
	initiative: number;
	proficiencyBonus: number;
}

export type CharacterClass = 
	| 'fighter' 
	| 'wizard' 
	| 'rogue' 
	| 'cleric' 
	| 'ranger' 
	| 'barbarian'
	| 'bard'
	| 'druid'
	| 'monk'
	| 'paladin'
	| 'sorcerer'
	| 'warlock';

export type CharacterRace = 
	| 'human'
	| 'elf'
	| 'dwarf'
	| 'halfling'
	| 'dragonborn'
	| 'gnome'
	| 'half-elf'
	| 'half-orc'
	| 'tiefling';

export type Alignment = 
	| 'lawful-good'
	| 'neutral-good'
	| 'chaotic-good'
	| 'lawful-neutral'
	| 'true-neutral'
	| 'chaotic-neutral'
	| 'lawful-evil'
	| 'neutral-evil'
	| 'chaotic-evil';

export interface CharacterBackground {
	name: string;
	description: string;
	skillProficiencies: (keyof Skills)[];
	languages: string[];
	equipment: string[];
}

export interface CharacterPersonality {
	traits: string[];
	ideals: string[];
	bonds: string[];
	flaws: string[];
	backstory: string;
}

export interface SpellSlot {
	level: number;
	total: number;
	used: number;
}

export interface SpellCasting {
	spellcastingAbility?: keyof AbilityScores;
	spellSaveDC?: number;
	spellAttackBonus?: number;
	spellSlots: SpellSlot[];
	spellsKnown: string[];
	cantripsKnown: string[];
}

export interface ClassFeature {
	name: string;
	description: string;
	level: number;
	uses?: {
		total: number;
		used: number;
		resetOn: 'short-rest' | 'long-rest' | 'dawn';
	};
}

export interface CharacterProgression {
	level: number;
	experiencePoints: number;
	hitDie: DiceType;
	hitDieUsed: number;
	features: ClassFeature[];
	spellcasting?: SpellCasting;
}

/**
 * Base character interface - foundation for all character types
 */
export interface BaseCharacter {
	id: string;
	name: string;
	race: CharacterRace;
	characterClass: CharacterClass;
	level: number;
	alignment: Alignment;
	
	// Core stats
	abilityScores: AbilityScores;
	abilityModifiers: AbilityModifiers;
	skills: Skills;
	savingThrows: SavingThrows;
	vitals: CharacterVitals;
	progression: CharacterProgression;
	
	// Character details
	background: CharacterBackground;
	personality: CharacterPersonality;
	
	// Equipment (references to inventory)
	equippedItems: string[]; // Item IDs
	inventoryId: string;
	
	// Metadata
	createdAt: number;
	updatedAt: number;
}

/**
 * Player character - the main character controlled by the user
 */
export interface PlayerCharacter extends BaseCharacter {
	type: 'player';
	
	// Player-specific properties
	inspiration: boolean;
	deathSaves: {
		successes: number;
		failures: number;
	};
}

/**
 * Companion NPC - party members that travel with the player
 */
export interface CompanionNPC extends BaseCharacter {
	type: 'companion';
	
	// Companion-specific properties
	loyalty: number; // 0-100, affects behavior
	isActive: boolean; // Currently in party
	companionType: 'hired' | 'quest' | 'story' | 'summoned';
	
	// AI behavior settings
	behavior: {
		combatStyle: 'aggressive' | 'defensive' | 'balanced' | 'support';
		followDistance: 'close' | 'medium' | 'far';
		independence: number; // 0-100, how much they act on their own
	};
	
	// Voice and personality for AI interactions
	voiceSettings: {
		personality: string;
		speakingStyle: string;
		catchphrases: string[];
	};
}

/**
 * Character factory configuration for easy class creation
 */
export interface CharacterClassConfig {
	name: CharacterClass;
	hitDie: DiceType;
	primaryAbilities: (keyof AbilityScores)[];
	savingThrowProficiencies: (keyof SavingThrows)[];
	skillChoices: {
		options: (keyof Skills)[];
		count: number;
	};
	startingEquipment: string[];
	spellcasting?: {
		ability: keyof AbilityScores;
		type: 'full' | 'half' | 'third' | 'warlock';
	};
	features: ClassFeature[];
}

/**
 * Utility types for character operations
 */
export type AnyCharacter = PlayerCharacter | CompanionNPC;

export type CharacterType = AnyCharacter['type'];

export type CharacterFilter = {
	type?: CharacterType;
	characterClass?: CharacterClass;
	level?: number;
	isActive?: boolean;
};

/**
 * Character state for UI components
 */
export interface CharacterDisplayState {
	isExpanded: boolean;
	activeTab: 'stats' | 'skills' | 'equipment' | 'spells' | 'features';
	isEditing: boolean;
}

/**
 * Helper functions type definitions
 */
export type AbilityScoreCalculator = (base: number, racial: number, improvements: number) => number;
export type AbilityModifierCalculator = (score: number) => number;
export type SkillModifierCalculator = (abilityMod: number, proficiency: boolean, proficiencyBonus: number) => number;

/**
 * Events for character system
 */
export interface CharacterEvents {
	'character:created': { character: AnyCharacter };
	'character:updated': { character: AnyCharacter; changes: Partial<AnyCharacter> };
	'character:deleted': { characterId: string };
	'character:level-up': { character: AnyCharacter; newLevel: number };
	'companion:joined': { companion: CompanionNPC };
	'companion:left': { companion: CompanionNPC };
	'companion:loyalty-changed': { companion: CompanionNPC; oldLoyalty: number; newLoyalty: number };
}