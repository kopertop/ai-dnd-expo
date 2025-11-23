/**
 * Client-side dice rolling helper
 * Provides utilities for dice notation parsing and validation
 */

export interface DiceRollResult {
	total: number;
	rolls: number[];
	modifier: number;
	breakdown: string;
	purpose?: string;
}

export interface DiceRollOptions {
	advantage?: boolean;
	disadvantage?: boolean;
	purpose?: string;
}

/**
 * Parse dice notation (e.g., "1d20+3", "2d6", "1d20-1")
 */
export function parseDiceNotation(notation: string): {
	numDice: number;
	dieSize: number;
	modifier: number;
} | null {
	const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
	if (!match) {
		return null;
	}

	const numDice = parseInt(match[1], 10);
	const dieSize = parseInt(match[2], 10);
	const modifier = match[3] ? parseInt(match[3], 10) : 0;

	return { numDice, dieSize, modifier };
}

/**
 * Validate dice notation
 */
export function validateDiceNotation(notation: string): { valid: boolean; error?: string } {
	const parsed = parseDiceNotation(notation);
	if (!parsed) {
		return { valid: false, error: 'Invalid dice notation. Use format: XdY+Z (e.g., 1d20+3)' };
	}

	if (parsed.numDice < 1 || parsed.numDice > 100) {
		return { valid: false, error: 'Number of dice must be between 1 and 100' };
	}

	if (parsed.dieSize < 2 || parsed.dieSize > 100) {
		return { valid: false, error: 'Die size must be between 2 and 100' };
	}

	return { valid: true };
}

/**
 * Format dice roll result for display
 */
export function formatDiceRoll(result: DiceRollResult): string {
	if (result.purpose) {
		return `${result.purpose}: ${result.breakdown}`;
	}
	return result.breakdown;
}

/**
 * Local fallback dice roll (for offline use)
 * Note: Server-side rolls are preferred for fairness
 */
export function rollDiceLocal(notation: string, options?: DiceRollOptions): DiceRollResult {
	const parsed = parseDiceNotation(notation);
	if (!parsed) {
		throw new Error('Invalid dice notation');
	}

	let rolls: number[];
	
	// Handle advantage/disadvantage (only for d20)
	if (parsed.dieSize === 20 && parsed.numDice === 1 && (options?.advantage || options?.disadvantage)) {
		const roll1 = Math.floor(Math.random() * parsed.dieSize) + 1;
		const roll2 = Math.floor(Math.random() * parsed.dieSize) + 1;
		if (options.advantage) {
			rolls = [Math.max(roll1, roll2)];
		} else {
			rolls = [Math.min(roll1, roll2)];
		}
	} else {
		rolls = Array.from({ length: parsed.numDice }, () => Math.floor(Math.random() * parsed.dieSize) + 1);
	}

	const total = rolls.reduce((sum, roll) => sum + roll, 0) + parsed.modifier;
	const breakdown = `${rolls.join(' + ')}${parsed.modifier !== 0 ? (parsed.modifier > 0 ? ' + ' : ' - ') + Math.abs(parsed.modifier) : ''} = ${total}`;

	return {
		total,
		rolls,
		modifier: parsed.modifier,
		breakdown,
		purpose: options?.purpose,
	};
}

