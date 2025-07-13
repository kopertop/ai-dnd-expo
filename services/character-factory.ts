// @ts-nocheck
/**
 * Character Factory - Create Characters and Companions
 * Handles generation of characters with proper stats, equipment, and configuration
 */

import type {
	BaseCharacter,
	PlayerCharacter,
	CompanionNPC,
	CharacterClass,
	CharacterRace,
	Alignment,
	AbilityScores,
	AbilityModifiers,
	Skills,
	SavingThrows,
	CharacterVitals,
	CharacterProgression,
	CharacterBackground,
	CharacterPersonality,
	AnyCharacter,
} from '@/types/characters';

import { CHARACTER_CLASS_CONFIGS, getClassConfig } from '@/data/character-classes';

/**
 * Calculate ability modifier from ability score
 */
function calculateAbilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/**
 * Calculate all ability modifiers from ability scores
 */
function calculateAbilityModifiers(scores: AbilityScores): AbilityModifiers {
	return {
		strength: calculateAbilityModifier(scores.strength),
		dexterity: calculateAbilityModifier(scores.dexterity),
		constitution: calculateAbilityModifier(scores.constitution),
		intelligence: calculateAbilityModifier(scores.intelligence),
		wisdom: calculateAbilityModifier(scores.wisdom),
		charisma: calculateAbilityModifier(scores.charisma),
	};
}

/**
 * Generate random ability scores using 4d6 drop lowest method
 */
function generateAbilityScores(): AbilityScores {
	const rollStat = (): number => {
		const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
		rolls.sort((a, b) => b - a);
		return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
	};

	return {
		strength: rollStat(),
		dexterity: rollStat(),
		constitution: rollStat(),
		intelligence: rollStat(),
		wisdom: rollStat(),
		charisma: rollStat(),
	};
}

/**
 * Apply racial bonuses to ability scores
 */
function applyRacialBonuses(scores: AbilityScores, race: CharacterRace): AbilityScores {
	const bonuses: Record<CharacterRace, Partial<AbilityScores>> = {
		human: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
		elf: { dexterity: 2 },
		dwarf: { constitution: 2 },
		halfling: { dexterity: 2 },
		dragonborn: { strength: 2, charisma: 1 },
		gnome: { intelligence: 2 },
		'half-elf': { charisma: 2, dexterity: 1 }, // simplified
		'half-orc': { strength: 2, constitution: 1 },
		tiefling: { intelligence: 1, charisma: 2 },
	};

	const racialBonus = bonuses[race] || {};
	return {
		strength: scores.strength + (racialBonus.strength || 0),
		dexterity: scores.dexterity + (racialBonus.dexterity || 0),
		constitution: scores.constitution + (racialBonus.constitution || 0),
		intelligence: scores.intelligence + (racialBonus.intelligence || 0),
		wisdom: scores.wisdom + (racialBonus.wisdom || 0),
		charisma: scores.charisma + (racialBonus.charisma || 0),
	};
}

/**
 * Calculate skills based on ability modifiers and proficiencies
 */
function calculateSkills(
	abilityModifiers: AbilityModifiers,
	proficiencyBonus: number,
	proficientSkills: (keyof Skills)[] = []
): Skills {
	const skillAbilities: Record<keyof Skills, keyof AbilityModifiers> = {
		athletics: 'strength',
		acrobatics: 'dexterity',
		sleightOfHand: 'dexterity',
		stealth: 'dexterity',
		arcana: 'intelligence',
		history: 'intelligence',
		investigation: 'intelligence',
		nature: 'intelligence',
		religion: 'intelligence',
		animalHandling: 'wisdom',
		insight: 'wisdom',
		medicine: 'wisdom',
		perception: 'wisdom',
		survival: 'wisdom',
		deception: 'charisma',
		intimidation: 'charisma',
		performance: 'charisma',
		persuasion: 'charisma',
	};

	const skills = {} as Skills;
	
	for (const [skill, ability] of Object.entries(skillAbilities)) {
		const isProficient = proficientSkills.includes(skill as keyof Skills);
		const abilityMod = abilityModifiers[ability];
		const profBonus = isProficient ? proficiencyBonus : 0;
		skills[skill as keyof Skills] = abilityMod + profBonus;
	}

	return skills;
}

/**
 * Calculate saving throws based on ability modifiers and proficiencies
 */
function calculateSavingThrows(
	abilityModifiers: AbilityModifiers,
	proficiencyBonus: number,
	proficientSaves: (keyof SavingThrows)[] = []
): SavingThrows {
	const saves = {} as SavingThrows;
	
	for (const ability of Object.keys(abilityModifiers) as (keyof AbilityModifiers)[]) {
		const isProficient = proficientSaves.includes(ability);
		const abilityMod = abilityModifiers[ability];
		const profBonus = isProficient ? proficiencyBonus : 0;
		saves[ability] = abilityMod + profBonus;
	}

	return saves;
}

/**
 * Calculate proficiency bonus based on character level
 */
function calculateProficiencyBonus(level: number): number {
	return Math.ceil(level / 4) + 1;
}

/**
 * Calculate hit points for a character
 */
function calculateHitPoints(
	characterClass: CharacterClass,
	level: number,
	constitutionModifier: number
): number {
	const classConfig = getClassConfig(characterClass);
	const hitDieValue = parseInt(classConfig.hitDie.substring(1)); // Remove 'd' prefix
	
	// First level gets max hit die + con modifier
	let hitPoints = hitDieValue + constitutionModifier;
	
	// Subsequent levels get average hit die value + con modifier
	for (let i = 2; i <= level; i++) {
		const averageRoll = Math.floor(hitDieValue / 2) + 1;
		hitPoints += averageRoll + constitutionModifier;
	}
	
	return Math.max(hitPoints, level); // Minimum 1 HP per level
}

/**
 * Generate a random character background
 */
function generateBackground(): CharacterBackground {
	const backgrounds = [
		{
			name: 'Acolyte',
			description: 'You have spent your life in service to a temple.',
			skillProficiencies: ['insight', 'religion'],
			languages: ['Common', 'One of your choice'],
			equipment: ['Holy symbol', 'Prayer book', 'Incense', 'Vestments', 'Common clothes', 'Belt pouch'],
		},
		{
			name: 'Folk Hero',
			description: 'You come from humble origins and have risen to heroic status.',
			skillProficiencies: ['animalHandling', 'survival'],
			languages: ['Common'],
			equipment: ['Artisan tools', 'Shovel', 'Set of common clothes', 'Belt pouch'],
		},
		{
			name: 'Noble',
			description: 'You were born into a wealthy and influential family.',
			skillProficiencies: ['history', 'persuasion'],
			languages: ['Common', 'One of your choice'],
			equipment: ['Signet ring', 'Scroll of pedigree', 'Fine clothes', 'Purse'],
		},
		{
			name: 'Soldier',
			description: 'You have a military background and combat training.',
			skillProficiencies: ['athletics', 'intimidation'],
			languages: ['Common', 'One of your choice'],
			equipment: ['Insignia of rank', 'Trophy', 'Playing cards', 'Common clothes', 'Belt pouch'],
		},
	];
	
	return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

/**
 * Generate character personality traits
 */
function generatePersonality(): CharacterPersonality {
	const traits = [
		'I am always polite and respectful.',
		'I have a strong sense of justice.',
		'I speak my mind and don\'t mince words.',
		'I am curious about everything.',
		'I am protective of my friends.',
	];
	
	const ideals = [
		'Freedom: Everyone should be free to pursue their own path.',
		'Honor: I will always do what is right.',
		'Power: I seek to become powerful and influential.',
		'Knowledge: Learning is the path to understanding.',
		'Community: We are stronger when we work together.',
	];
	
	const bonds = [
		'My weapons are my most precious possessions.',
		'I have a family member I would do anything to protect.',
		'I owe a debt to someone who saved my life.',
		'I seek to prove myself worthy of respect.',
		'I have a mentor who taught me everything I know.',
	];
	
	const flaws = [
		'I have a hard time trusting others.',
		'I am easily distracted by beautiful things.',
		'I speak without thinking sometimes.',
		'I have a weakness for the comforts of civilization.',
		'I am quick to anger when insulted.',
	];

	return {
		traits: [traits[Math.floor(Math.random() * traits.length)]],
		ideals: [ideals[Math.floor(Math.random() * ideals.length)]],
		bonds: [bonds[Math.floor(Math.random() * bonds.length)]],
		flaws: [flaws[Math.floor(Math.random() * flaws.length)]],
		backstory: 'A brave adventurer with a mysterious past.',
	};
}

/**
 * Character creation parameters
 */
export interface CharacterCreationParams {
	name: string;
	race: CharacterRace;
	characterClass: CharacterClass;
	level?: number;
	alignment?: Alignment;
	abilityScores?: Partial<AbilityScores>;
	background?: CharacterBackground;
	personality?: CharacterPersonality;
	
	// For companions
	companionType?: CompanionNPC['companionType'];
	loyalty?: number;
	behaviorStyle?: CompanionNPC['behavior']['combatStyle'];
}

/**
 * Create a base character with all calculated stats
 */
function createBaseCharacter(params: CharacterCreationParams): Omit<BaseCharacter, 'type'> {
	const level = params.level || 1;
	const classConfig = getClassConfig(params.characterClass);
	const proficiencyBonus = calculateProficiencyBonus(level);
	
	// Generate or use provided ability scores
	let abilityScores = params.abilityScores ? 
		{ ...generateAbilityScores(), ...params.abilityScores } : 
		generateAbilityScores();
	
	// Apply racial bonuses
	abilityScores = applyRacialBonuses(abilityScores, params.race);
	
	// Calculate derived stats
	const abilityModifiers = calculateAbilityModifiers(abilityScores);
	const skills = calculateSkills(abilityModifiers, proficiencyBonus);
	const savingThrows = calculateSavingThrows(
		abilityModifiers, 
		proficiencyBonus, 
		classConfig.savingThrowProficiencies
	);
	
	const hitPoints = calculateHitPoints(
		params.characterClass,
		level,
		abilityModifiers.constitution
	);
	
	const armorClass = {
		base: 10 + abilityModifiers.dexterity,
		bonus: 0,
		total: 10 + abilityModifiers.dexterity,
	};
	
	const vitals: CharacterVitals = {
		hitPoints: {
			current: hitPoints,
			maximum: hitPoints,
			temporary: 0,
		},
		armorClass,
		speed: 30, // Standard human speed
		initiative: abilityModifiers.dexterity,
		proficiencyBonus,
	};
	
	const progression: CharacterProgression = {
		level,
		experiencePoints: level === 1 ? 0 : (level - 1) * 1000, // Simplified XP
		hitDie: classConfig.hitDie,
		hitDieUsed: 0,
		features: classConfig.features.filter(f => f.level <= level),
		spellcasting: classConfig.spellcasting ? {
			spellcastingAbility: classConfig.spellcasting.ability,
			spellSaveDC: 8 + proficiencyBonus + abilityModifiers[classConfig.spellcasting.ability],
			spellAttackBonus: proficiencyBonus + abilityModifiers[classConfig.spellcasting.ability],
			spellSlots: [], // TODO: Calculate based on class and level
			spellsKnown: [],
			cantripsKnown: [],
		} : undefined,
	};
	
	const now = Date.now();
	
	return {
		id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		name: params.name,
		race: params.race,
		characterClass: params.characterClass,
		level,
		alignment: params.alignment || 'true-neutral',
		abilityScores,
		abilityModifiers,
		skills,
		savingThrows,
		vitals,
		progression,
		background: params.background || generateBackground(),
		personality: params.personality || generatePersonality(),
		equippedItems: [],
		inventoryId: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Create a player character
 */
export function createPlayerCharacter(params: CharacterCreationParams): PlayerCharacter {
	const baseCharacter = createBaseCharacter(params);
	
	return {
		...baseCharacter,
		type: 'player',
		inspiration: false,
		deathSaves: {
			successes: 0,
			failures: 0,
		},
	};
}

/**
 * Create a companion NPC
 */
export function createCompanionNPC(params: CharacterCreationParams): CompanionNPC {
	const baseCharacter = createBaseCharacter(params);
	
	return {
		...baseCharacter,
		type: 'companion',
		loyalty: params.loyalty || 75,
		isActive: false, // Starts inactive until recruited
		companionType: params.companionType || 'hired',
		behavior: {
			combatStyle: params.behaviorStyle || 'balanced',
			followDistance: 'medium',
			independence: 50,
		},
		voiceSettings: {
			personality: `A brave ${params.characterClass} who speaks with confidence and loyalty.`,
			speakingStyle: 'helpful and encouraging',
			catchphrases: [
				'I\'ve got your back!',
				'Let\'s do this together!',
				'We can handle anything!',
			],
		},
	};
}

/**
 * Generate a random companion with class preference
 */
export function generateRandomCompanion(
	preferredClass?: CharacterClass,
	level: number = 1
): CompanionNPC {
	const races: CharacterRace[] = ['human', 'elf', 'dwarf', 'halfling'];
	const classes: CharacterClass[] = ['fighter', 'wizard', 'rogue', 'cleric'];
	const names = [
		'Aelindra', 'Bjorn', 'Celia', 'Dain', 'Elara', 'Finn', 'Gilda', 'Harol',
		'Iona', 'Jaxon', 'Kira', 'Liam', 'Maya', 'Nora', 'Owen', 'Petra',
	];
	
	const characterClass = preferredClass || classes[Math.floor(Math.random() * classes.length)];
	const race = races[Math.floor(Math.random() * races.length)];
	const name = names[Math.floor(Math.random() * names.length)];
	
	return createCompanionNPC({
		name,
		race,
		characterClass,
		level,
		companionType: 'hired',
		loyalty: 60 + Math.floor(Math.random() * 30), // 60-90 loyalty
	});
}

/**
 * Character validation
 */
export function validateCharacter(character: AnyCharacter): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (!character.name || character.name.trim().length === 0) {
		errors.push('Character must have a name');
	}
	
	if (character.level < 1 || character.level > 20) {
		errors.push('Character level must be between 1 and 20');
	}
	
	if (character.vitals.hitPoints.current < 0) {
		errors.push('Character cannot have negative hit points');
	}
	
	// Validate ability scores (standard range)
	for (const [ability, score] of Object.entries(character.abilityScores)) {
		if (score < 1 || score > 30) {
			errors.push(`${ability} score must be between 1 and 30`);
		}
	}
	
	return {
		isValid: errors.length === 0,
		errors,
	};
}