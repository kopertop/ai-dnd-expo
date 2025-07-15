export interface DiceRoll {
	notation: string;
	rolls: number[];
	total: number;
	modifier: number;
	breakdown: string;
}

export class DiceRoller {
	/**
	 * Roll dice using standard D&D notation (e.g., "1d20", "3d6+2", "2d8-1")
	 */
	roll(notation: string): DiceRoll {
		const parsed = this.parseNotation(notation);
		const rolls: number[] = [];

		for (let i = 0; i < parsed.count; i++) {
			rolls.push(this.rollSingleDie(parsed.sides));
		}

		const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
		const total = rollSum + parsed.modifier;

		return {
			notation,
			rolls,
			total,
			modifier: parsed.modifier,
			breakdown: this.createBreakdown(rolls, parsed.modifier, total),
		};
	}

	/**
	 * Roll with advantage (roll twice, take higher)
	 */
	rollWithAdvantage(notation: string): DiceRoll {
		const roll1 = this.roll(notation);
		const roll2 = this.roll(notation);

		const betterRoll = roll1.total >= roll2.total ? roll1 : roll2;

		return {
			...betterRoll,
			breakdown: `Advantage: [${roll1.total}] vs [${roll2.total}] → ${betterRoll.total}`,
		};
	}

	/**
	 * Roll with disadvantage (roll twice, take lower)
	 */
	rollWithDisadvantage(notation: string): DiceRoll {
		const roll1 = this.roll(notation);
		const roll2 = this.roll(notation);

		const worseRoll = roll1.total <= roll2.total ? roll1 : roll2;

		return {
			...worseRoll,
			breakdown: `Disadvantage: [${roll1.total}] vs [${roll2.total}] → ${worseRoll.total}`,
		};
	}

	/**
	 * Parse dice notation into components
	 */
	private parseNotation(notation: string): {
		count: number;
		sides: number;
		modifier: number;
	} {
		// Remove spaces and convert to lowercase
		const clean = notation.replace(/\s/g, '').toLowerCase();

		// Match patterns like "3d6+2", "1d20", "2d8-1"
		const match = clean.match(/^(\d+)?d(\d+)([+-]\d+)?$/);

		if (!match) {
			throw new Error(`Invalid dice notation: ${notation}`);
		}

		const count = parseInt(match[1] || '1', 10);
		const sides = parseInt(match[2], 10);
		const modifier = match[3] ? parseInt(match[3], 10) : 0;

		if (count < 1 || count > 100) {
			throw new Error('Dice count must be between 1 and 100');
		}

		if (sides < 2 || sides > 1000) {
			throw new Error('Dice sides must be between 2 and 1000');
		}

		return { count, sides, modifier };
	}

	/**
	 * Roll a single die with specified number of sides
	 */
	private rollSingleDie(sides: number): number {
		return Math.floor(Math.random() * sides) + 1;
	}

	/**
	 * Create a human-readable breakdown of the roll
	 */
	private createBreakdown(rolls: number[], modifier: number, total: number): string {
		let breakdown = `[${rolls.join(', ')}]`;

		if (modifier !== 0) {
			const modStr = modifier > 0 ? `+${modifier}` : `${modifier}`;
			breakdown += ` ${modStr}`;
		}

		breakdown += ` = ${total}`;
		return breakdown;
	}

	/**
	 * Roll multiple different dice and return all results
	 */
	rollMultiple(notations: string[]): DiceRoll[] {
		return notations.map(notation => this.roll(notation));
	}

	/**
	 * Common D&D rolls
	 */
	static readonly COMMON_ROLLS = {
		D4: '1d4',
		D6: '1d6',
		D8: '1d8',
		D10: '1d10',
		D12: '1d12',
		D20: '1d20',
		D100: '1d100',
		ATTACK: '1d20',
		ABILITY_SCORE: '4d6', // Drop lowest is handled separately
		HP_FIGHTER: '1d10',
		HP_WIZARD: '1d6',
		HP_ROGUE: '1d8',
		DAMAGE_SHORTSWORD: '1d6',
		DAMAGE_LONGSWORD: '1d8',
		DAMAGE_GREATSWORD: '2d6',
		FIREBALL: '8d6',
	} as const;

	/**
	 * Roll ability scores (4d6, drop lowest)
	 */
	rollAbilityScore(): DiceRoll {
		const rolls = [
			this.rollSingleDie(6),
			this.rollSingleDie(6),
			this.rollSingleDie(6),
			this.rollSingleDie(6),
		];

		// Sort and drop the lowest
		rolls.sort((a, b) => b - a);
		const keepRolls = rolls.slice(0, 3);
		const total = keepRolls.reduce((sum, roll) => sum + roll, 0);

		return {
			notation: '4d6 drop lowest',
			rolls: keepRolls,
			total,
			modifier: 0,
			breakdown: `4d6 [${rolls.join(', ')}] drop lowest → [${keepRolls.join(', ')}] = ${total}`,
		};
	}

	/**
	 * Roll initiative with dexterity modifier
	 */
	rollInitiative(dexModifier: number): DiceRoll {
		const baseRoll = this.roll('1d20');
		return {
			notation: `1d20+${dexModifier}`,
			rolls: baseRoll.rolls,
			total: baseRoll.total + dexModifier,
			modifier: dexModifier,
			breakdown: `Initiative: [${baseRoll.rolls[0]}] + ${dexModifier} = ${baseRoll.total + dexModifier}`,
		};
	}

	/**
	 * Validate dice notation
	 */
	isValidNotation(notation: string): boolean {
		try {
			this.parseNotation(notation);
			return true;
		} catch {
			return false;
		}
	}
}
