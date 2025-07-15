import { Character } from '@/types/character';

export interface CharacterUpdate {
	type: 'hp' | 'stat' | 'skill' | 'inventory' | 'experience' | 'condition';
	operation: 'set' | 'add' | 'subtract' | 'toggle';
	target: string;
	value: number | string | boolean;
	reason?: string;
}

export interface UpdateResult {
	success: boolean;
	oldValue: any;
	newValue: any;
	message: string;
}

export class CharacterUpdater {
	/**
	 * Update character data based on game events
	 */
	async updateCharacter(character: Character, update: CharacterUpdate): Promise<UpdateResult> {
		try {
			switch (update.type) {
			case 'hp':
				return this.updateHP(character, update);
			case 'stat':
				return this.updateStat(character, update);
			case 'skill':
				return this.updateSkill(character, update);
			case 'inventory':
				return this.updateInventory(character, update);
			case 'experience':
				return this.updateExperience(character, update);
			case 'condition':
				return this.updateCondition(character, update);
			default:
				throw new Error(`Unknown update type: ${update.type}`);
			}
		} catch (error) {
			return {
				success: false,
				oldValue: null,
				newValue: null,
				message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Update character hit points
	 */
	private updateHP(character: Character, update: CharacterUpdate): UpdateResult {
		const oldHP = character.health;
		let newHP = oldHP;

		switch (update.operation) {
		case 'set':
			newHP = Math.max(0, Math.min(character.maxHealth, Number(update.value)));
			break;
		case 'add':
			newHP = Math.min(character.maxHealth, oldHP + Number(update.value));
			break;
		case 'subtract':
			newHP = Math.max(0, oldHP - Number(update.value));
			break;
		}

		character.health = newHP;

		let message = `HP: ${oldHP} → ${newHP}`;
		if (update.reason) {
			message += ` (${update.reason})`;
		}

		// Check for unconscious/death
		if (newHP <= 0) {
			message += ' - Character is unconscious!';
		} else if (newHP <= character.maxHealth * 0.25) {
			message += ' - Character is badly wounded!';
		}

		return {
			success: true,
			oldValue: oldHP,
			newValue: newHP,
			message,
		};
	}

	/**
	 * Update character statistics (STR, DEX, CON, etc.)
	 */
	private updateStat(character: Character, update: CharacterUpdate): UpdateResult {
		const stats = character.stats;
		const statName = update.target.toLowerCase();

		if (!(statName in stats)) {
			throw new Error(`Invalid stat: ${statName}`);
		}

		const oldValue = stats[statName as keyof typeof stats];
		let newValue = oldValue;

		switch (update.operation) {
		case 'set':
			newValue = Math.max(1, Math.min(30, Number(update.value)));
			break;
		case 'add':
			newValue = Math.min(30, oldValue + Number(update.value));
			break;
		case 'subtract':
			newValue = Math.max(1, oldValue - Number(update.value));
			break;
		}

		(stats as any)[statName] = newValue;

		return {
			success: true,
			oldValue,
			newValue,
			message: `${statName.toUpperCase()}: ${oldValue} → ${newValue}`,
		};
	}

	/**
	 * Update character skills
	 */
	private updateSkill(character: Character, update: CharacterUpdate): UpdateResult {
		const skillName = update.target;
		const skills = character.skills;

		const skillIndex = skills.findIndex(
			(skill: string) => skill.toLowerCase() === skillName.toLowerCase(),
		);

		if (skillIndex === -1) {
			// Add new skill if it doesn't exist
			if (update.operation === 'set' && update.value) {
				skills.push(skillName);
				return {
					success: true,
					oldValue: false,
					newValue: true,
					message: `${skillName} proficiency: No → Yes`,
				};
			} else {
				throw new Error(`Skill not found: ${skillName}`);
			}
		}

		// For existing skills, just track presence (skills array only contains proficient skills)
		const hadSkill = true;
		let hasSkill = hadSkill;

		switch (update.operation) {
		case 'toggle':
			if (hadSkill) {
				skills.splice(skillIndex, 1);
				hasSkill = false;
			}
			break;
		case 'set':
			if (!update.value && hadSkill) {
				skills.splice(skillIndex, 1);
				hasSkill = false;
			}
			break;
		}

		return {
			success: true,
			oldValue: hadSkill,
			newValue: hasSkill,
			message: `${skillName} proficiency: ${hadSkill ? 'Yes' : 'No'} → ${hasSkill ? 'Yes' : 'No'}`,
		};
	}

	/**
	 * Update character inventory
	 */
	private updateInventory(character: Character, update: CharacterUpdate): UpdateResult {
		// This would integrate with the inventory manager
		// For now, return a placeholder
		return {
			success: true,
			oldValue: null,
			newValue: null,
			message: `Inventory updated: ${update.target}`,
		};
	}

	/**
	 * Update character level (since Character type doesn't have experience field)
	 */
	private updateExperience(character: Character, update: CharacterUpdate): UpdateResult {
		const oldLevel = character.level;
		let newLevel = oldLevel;

		switch (update.operation) {
		case 'add':
			newLevel = oldLevel + Number(update.value);
			break;
		case 'set':
			newLevel = Number(update.value);
			break;
		}

		// Ensure level is within reasonable bounds
		newLevel = Math.max(1, Math.min(20, newLevel));
		character.level = newLevel;

		let message = `Level: ${oldLevel} → ${newLevel}`;
		if (newLevel > oldLevel) {
			message += ` - LEVEL UP! You are now level ${newLevel}!`;
		}

		return {
			success: true,
			oldValue: oldLevel,
			newValue: newLevel,
			message,
		};
	}

	/**
	 * Update character conditions (poisoned, charmed, etc.)
	 */
	private updateCondition(character: Character, update: CharacterUpdate): UpdateResult {
		// Character type doesn't have conditions field, so we'll store it in a custom property
		const conditions = (character as any).conditions || [];

		const conditionName = update.target;
		const hasCondition = conditions.includes(conditionName);

		switch (update.operation) {
		case 'toggle':
			if (hasCondition) {
				(character as any).conditions = conditions.filter(
					(c: string) => c !== conditionName,
				);
			} else {
				(character as any).conditions = [...conditions, conditionName];
			}
			break;
		case 'set':
			if (update.value && !hasCondition) {
				(character as any).conditions = [...conditions, conditionName];
			} else if (!update.value && hasCondition) {
				(character as any).conditions = conditions.filter(
					(c: string) => c !== conditionName,
				);
			}
			break;
		}

		const newConditions = (character as any).conditions || [];
		const newHasCondition = newConditions.includes(conditionName);

		return {
			success: true,
			oldValue: hasCondition,
			newValue: newHasCondition,
			message: `${conditionName}: ${hasCondition ? 'Active' : 'Inactive'} → ${newHasCondition ? 'Active' : 'Inactive'}`,
		};
	}

	/**
	 * Calculate character level from experience points
	 */
	private calculateLevel(xp: number): number {
		// D&D 5e experience table
		const xpTable = [
			0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000,
			140000, 165000, 195000, 225000, 265000, 305000, 355000,
		];

		for (let level = xpTable.length - 1; level >= 0; level--) {
			if (xp >= xpTable[level]) {
				return level + 1;
			}
		}
		return 1;
	}

	/**
	 * Calculate ability modifier from ability score
	 */
	static calculateModifier(abilityScore: number): number {
		return Math.floor((abilityScore - 10) / 2);
	}

	/**
	 * Calculate proficiency bonus from character level
	 */
	static calculateProficiencyBonus(level: number): number {
		return Math.ceil(level / 4) + 1;
	}

	/**
	 * Validate update parameters
	 */
	validateUpdate(update: CharacterUpdate): boolean {
		if (!update.type || !update.operation || !update.target) {
			return false;
		}

		// Type-specific validation
		switch (update.type) {
		case 'hp':
			return typeof update.value === 'number' && update.value >= 0;
		case 'stat':
			return typeof update.value === 'number' && update.value >= 1 && update.value <= 30;
		case 'experience':
			return typeof update.value === 'number' && update.value >= 0;
		default:
			return true;
		}
	}
}
