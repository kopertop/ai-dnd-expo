/**
 * Tool Command Parser for Local DM Agent
 *
 * Parses and executes tool commands from AI model output
 * Supports dice rolls, character updates, and game state modifications
 *
 * Requirements: 2.3, 4.2
 */

import { Character } from '@/types/character';
import { GameState } from '@/types/game';

export interface ToolCommand {
	type: 'roll' | 'update' | 'damage' | 'heal' | 'status' | 'inventory';
	params: string;
	parsed?: any;
	result?: any;
	error?: string;
}

export interface ParsedRollCommand {
	notation: string;
	modifier?: number;
	advantage?: boolean;
	disadvantage?: boolean;
	purpose?: string;
}

export interface ParsedUpdateCommand {
	target: 'hp' | 'maxhp' | 'ap' | 'maxap' | 'stat' | 'skill';
	operation: 'add' | 'subtract' | 'set';
	value: number;
	stat?: string; // For stat updates like 'strength'
}

export interface ParsedInventoryCommand {
	action: 'add' | 'remove' | 'equip' | 'unequip';
	item: string;
	quantity?: number;
	slot?: string;
}

export interface ToolCommandResult {
	success: boolean;
	message: string;
	value?: any;
	characterUpdates?: Partial<Character>;
}

export class ToolCommandParser {
	/**
	 * Extract tool commands from AI model output
	 * Supports formats: [ROLL:1d20+3], [UPDATE:HP-5], [DAMAGE:2d6], etc.
	 */
	static extractToolCommands(text: string): ToolCommand[] {
		const commands: ToolCommand[] = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const type = match[1].toLowerCase();
			const params = match[2].trim();

			// Validate command type
			if (this.isValidCommandType(type)) {
				commands.push({
					type: type as ToolCommand['type'],
					params,
				});
			}
		}

		return commands;
	}

	/**
	 * Remove tool commands from display text
	 */
	static removeToolCommands(text: string): string {
		return text.replace(/\[(\w+):([^\]]+)\]/g, '').trim();
	}

	/**
	 * Parse and execute tool commands
	 */
	static async executeToolCommands(
		commands: ToolCommand[],
		character: Character,
		gameState: GameState,
	): Promise<{
		results: ToolCommandResult[];
		characterUpdates: Partial<Character>;
		gameStateUpdates: Partial<GameState>;
	}> {
		const results: ToolCommandResult[] = [];
		let characterUpdates: Partial<Character> = {};
		const gameStateUpdates: Partial<GameState> = {};

		for (const command of commands) {
			try {
				// Parse command parameters
				command.parsed = this.parseCommandParams(command);

				// Execute command
				const result = await this.executeCommand(command, character, gameState);
				results.push(result);

				// Accumulate updates
				if (result.characterUpdates) {
					characterUpdates = { ...characterUpdates, ...result.characterUpdates };
				}

				// Store result in command
				command.result = result.value;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				command.error = errorMessage;
				results.push({
					success: false,
					message: `Failed to execute ${command.type} command: ${errorMessage}`,
				});
			}
		}

		return { results, characterUpdates, gameStateUpdates };
	}

	/**
	 * Parse command parameters based on command type
	 */
	private static parseCommandParams(command: ToolCommand): any {
		switch (command.type) {
			case 'roll':
				return this.parseRollCommand(command.params);
			case 'update':
				return this.parseUpdateCommand(command.params);
			case 'damage':
				return this.parseDamageCommand(command.params);
			case 'heal':
				return this.parseHealCommand(command.params);
			case 'status':
				return this.parseStatusCommand(command.params);
			case 'inventory':
				return this.parseInventoryCommand(command.params);
			default:
				throw new Error(`Unknown command type: ${command.type}`);
		}
	}

	/**
	 * Execute individual command
	 */
	private static async executeCommand(
		command: ToolCommand,
		character: Character,
		gameState: GameState,
	): Promise<ToolCommandResult> {
		switch (command.type) {
			case 'roll':
				return this.executeRollCommand(command.parsed);
			case 'update':
				return this.executeUpdateCommand(command.parsed, character);
			case 'damage':
				return this.executeDamageCommand(command.parsed, character);
			case 'heal':
				return this.executeHealCommand(command.parsed, character);
			case 'status':
				return this.executeStatusCommand(command.parsed, character);
			case 'inventory':
				return this.executeInventoryCommand(command.parsed, character);
			default:
				throw new Error(`Cannot execute unknown command type: ${command.type}`);
		}
	}

	/**
	 * Parse dice roll commands
	 * Formats: 1d20+3, 2d6, 1d20+5 advantage, 3d8+2 fire damage
	 */
	private static parseRollCommand(params: string): ParsedRollCommand {
		const parts = params.toLowerCase().split(' ');
		const notation = parts[0];

		// Validate dice notation
		if (!/^\d+d\d+([+-]\d+)?$/.test(notation)) {
			throw new Error(`Invalid dice notation: ${notation}`);
		}

		const parsed: ParsedRollCommand = { notation };

		// Parse modifiers and flags
		for (let i = 1; i < parts.length; i++) {
			const part = parts[i];
			if (part === 'advantage') {
				parsed.advantage = true;
			} else if (part === 'disadvantage') {
				parsed.disadvantage = true;
			} else if (
				part.includes('damage') ||
				part.includes('attack') ||
				part.includes('check')
			) {
				parsed.purpose = parts.slice(i).join(' ');
				break;
			}
		}

		return parsed;
	}

	/**
	 * Parse character update commands
	 * Formats: HP-5, HP+10, MAXHP=25, STR+1
	 */
	private static parseUpdateCommand(params: string): ParsedUpdateCommand {
		const match = params.match(/^(HP|MAXHP|AP|MAXAP|STR|DEX|CON|INT|WIS|CHA)([+-=])(\d+)$/i);

		if (!match) {
			throw new Error(`Invalid update command format: ${params}`);
		}

		const [, target, operator, valueStr] = match;
		const value = parseInt(valueStr, 10);

		let operation: ParsedUpdateCommand['operation'];
		switch (operator) {
			case '+':
				operation = 'add';
				break;
			case '-':
				operation = 'subtract';
				break;
			case '=':
				operation = 'set';
				break;
			default:
				throw new Error(`Invalid operator: ${operator}`);
		}

		const parsed: ParsedUpdateCommand = {
			target: target.toLowerCase() as ParsedUpdateCommand['target'],
			operation,
			value,
		};

		// Handle stat updates
		if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(parsed.target)) {
			parsed.stat = parsed.target;
			parsed.target = 'stat';
		}

		return parsed;
	}

	/**
	 * Parse damage commands
	 * Formats: 2d6, 1d8+3 fire, 10 piercing
	 */
	private static parseDamageCommand(params: string): {
		damage: ParsedRollCommand | number;
		type?: string;
	} {
		const parts = params.split(' ');
		const damageStr = parts[0];

		let damage: ParsedRollCommand | number;
		if (/^\d+d\d+([+-]\d+)?$/.test(damageStr)) {
			damage = this.parseRollCommand(damageStr);
		} else if (/^\d+$/.test(damageStr)) {
			damage = parseInt(damageStr, 10);
		} else {
			throw new Error(`Invalid damage format: ${damageStr}`);
		}

		const type = parts.slice(1).join(' ') || undefined;

		return { damage, type };
	}

	/**
	 * Parse heal commands
	 * Formats: 2d4+2, 15, 1d8+3 magical
	 */
	private static parseHealCommand(params: string): {
		healing: ParsedRollCommand | number;
		type?: string;
	} {
		const parts = params.split(' ');
		const healStr = parts[0];

		let healing: ParsedRollCommand | number;
		if (/^\d+d\d+([+-]\d+)?$/.test(healStr)) {
			healing = this.parseRollCommand(healStr);
		} else if (/^\d+$/.test(healStr)) {
			healing = parseInt(healStr, 10);
		} else {
			throw new Error(`Invalid healing format: ${healStr}`);
		}

		const type = parts.slice(1).join(' ') || undefined;

		return { healing, type };
	}

	/**
	 * Parse status effect commands
	 * Formats: poisoned, stunned 2, blessed 3 rounds
	 */
	private static parseStatusCommand(params: string): {
		effect: string;
		duration?: number;
		unit?: string;
	} {
		const parts = params.split(' ');
		const effect = parts[0];

		let duration: number | undefined;
		let unit: string | undefined;

		if (parts.length > 1) {
			const durationStr = parts[1];
			if (/^\d+$/.test(durationStr)) {
				duration = parseInt(durationStr, 10);
				unit = parts[2] || 'rounds';
			}
		}

		return { effect, duration, unit };
	}

	/**
	 * Parse inventory commands
	 * Formats: add sword, remove potion 2, equip helmet, unequip shield
	 */
	private static parseInventoryCommand(params: string): ParsedInventoryCommand {
		const parts = params.split(' ');
		const action = parts[0] as ParsedInventoryCommand['action'];

		if (!['add', 'remove', 'equip', 'unequip'].includes(action)) {
			throw new Error(`Invalid inventory action: ${action}`);
		}

		const item = parts.slice(1, -1).join(' ') || parts[1];
		const lastPart = parts[parts.length - 1];
		const quantity = /^\d+$/.test(lastPart) ? parseInt(lastPart, 10) : 1;

		return {
			action,
			item: quantity > 1 ? item : parts.slice(1).join(' '),
			quantity: quantity > 1 ? quantity : undefined,
		};
	}

	/**
	 * Execute dice roll command
	 */
	private static executeRollCommand(parsed: ParsedRollCommand): ToolCommandResult {
		const result = this.rollDice(parsed.notation, parsed.advantage, parsed.disadvantage);

		let message = `Rolled ${parsed.notation}: ${result.total}`;
		if (result.rolls.length > 1) {
			message += ` (${result.rolls.join(', ')})`;
		}
		if (parsed.purpose) {
			message += ` for ${parsed.purpose}`;
		}

		return {
			success: true,
			message,
			value: result,
		};
	}

	/**
	 * Execute character update command
	 */
	private static executeUpdateCommand(
		parsed: ParsedUpdateCommand,
		character: Character,
	): ToolCommandResult {
		const updates: Partial<Character> = {};
		let currentValue: number;
		let newValue: number;
		let fieldName: string;

		switch (parsed.target) {
			case 'hp':
				currentValue = character.health;
				fieldName = 'health';
				break;
			case 'maxhp':
				currentValue = character.maxHealth;
				fieldName = 'maxHealth';
				break;
			case 'ap':
				currentValue = character.actionPoints;
				fieldName = 'actionPoints';
				break;
			case 'maxap':
				currentValue = character.maxActionPoints;
				fieldName = 'maxActionPoints';
				break;
			case 'stat':
				if (!parsed.stat) {
					throw new Error('Stat name required for stat updates');
				}
				currentValue = character.stats[parsed.stat as keyof typeof character.stats] || 10;
				fieldName = `stats.${parsed.stat}`;
				break;
			default:
				throw new Error(`Unknown update target: ${parsed.target}`);
		}

		// Calculate new value
		switch (parsed.operation) {
			case 'add':
				newValue = currentValue + parsed.value;
				break;
			case 'subtract':
				newValue = currentValue - parsed.value;
				break;
			case 'set':
				newValue = parsed.value;
				break;
		}

		// Apply constraints
		if (parsed.target === 'hp') {
			newValue = Math.max(0, Math.min(newValue, character.maxHealth));
			updates.health = newValue;
		} else if (parsed.target === 'ap') {
			newValue = Math.max(0, Math.min(newValue, character.maxActionPoints));
			updates.actionPoints = newValue;
		} else if (parsed.target === 'stat' && parsed.stat) {
			newValue = Math.max(1, Math.min(newValue, 30)); // D&D stat limits
			updates.stats = { ...character.stats, [parsed.stat]: newValue };
		} else {
			(updates as any)[fieldName.split('.')[0]] = newValue;
		}

		const operationText =
			parsed.operation === 'set'
				? 'set to'
				: parsed.operation === 'add'
					? 'increased by'
					: 'decreased by';

		return {
			success: true,
			message: `${fieldName} ${operationText} ${parsed.value} (${currentValue} → ${newValue})`,
			value: newValue,
			characterUpdates: updates,
		};
	}

	/**
	 * Execute damage command
	 */
	private static executeDamageCommand(
		parsed: { damage: ParsedRollCommand | number; type?: string },
		character: Character,
	): ToolCommandResult {
		let damageAmount: number;
		let rollMessage = '';

		if (typeof parsed.damage === 'number') {
			damageAmount = parsed.damage;
		} else {
			const rollResult = this.rollDice(parsed.damage.notation);
			damageAmount = rollResult.total;
			rollMessage = ` (rolled ${rollResult.total})`;
		}

		const newHealth = Math.max(0, character.health - damageAmount);
		const actualDamage = character.health - newHealth;

		const typeText = parsed.type ? ` ${parsed.type}` : '';
		const message = `Takes ${actualDamage}${typeText} damage${rollMessage} (${character.health} → ${newHealth} HP)`;

		return {
			success: true,
			message,
			value: actualDamage,
			characterUpdates: { health: newHealth },
		};
	}

	/**
	 * Execute heal command
	 */
	private static executeHealCommand(
		parsed: { healing: ParsedRollCommand | number; type?: string },
		character: Character,
	): ToolCommandResult {
		let healAmount: number;
		let rollMessage = '';

		if (typeof parsed.healing === 'number') {
			healAmount = parsed.healing;
		} else {
			const rollResult = this.rollDice(parsed.healing.notation);
			healAmount = rollResult.total;
			rollMessage = ` (rolled ${rollResult.total})`;
		}

		const newHealth = Math.min(character.maxHealth, character.health + healAmount);
		const actualHealing = newHealth - character.health;

		const typeText = parsed.type ? ` ${parsed.type}` : '';
		const message = `Heals ${actualHealing}${typeText} HP${rollMessage} (${character.health} → ${newHealth} HP)`;

		return {
			success: true,
			message,
			value: actualHealing,
			characterUpdates: { health: newHealth },
		};
	}

	/**
	 * Execute status effect command
	 */
	private static executeStatusCommand(
		parsed: { effect: string; duration?: number; unit?: string },
		character: Character,
	): ToolCommandResult {
		// Note: This is a placeholder - full status effect system would need more complex state management
		const durationText = parsed.duration
			? ` for ${parsed.duration} ${parsed.unit || 'rounds'}`
			: '';
		const message = `Applied ${parsed.effect} status effect${durationText}`;

		return {
			success: true,
			message,
			value: { effect: parsed.effect, duration: parsed.duration, unit: parsed.unit },
		};
	}

	/**
	 * Execute inventory command
	 */
	private static executeInventoryCommand(
		parsed: ParsedInventoryCommand,
		character: Character,
	): ToolCommandResult {
		// Note: This is a placeholder - full inventory system would need proper item management
		const quantityText = parsed.quantity && parsed.quantity > 1 ? ` (${parsed.quantity})` : '';
		const message = `${parsed.action} ${parsed.item}${quantityText}`;

		return {
			success: true,
			message,
			value: parsed,
		};
	}

	/**
	 * Roll dice with optional advantage/disadvantage
	 */
	private static rollDice(
		notation: string,
		advantage?: boolean,
		disadvantage?: boolean,
	): { total: number; rolls: number[]; modifier: number } {
		const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
		if (!match) {
			throw new Error(`Invalid dice notation: ${notation}`);
		}

		const numDice = parseInt(match[1], 10);
		const dieSize = parseInt(match[2], 10);
		const modifier = match[3] ? parseInt(match[3], 10) : 0;

		const rolls: number[] = [];

		// Handle advantage/disadvantage for d20 rolls
		if (dieSize === 20 && numDice === 1 && (advantage || disadvantage)) {
			const roll1 = Math.floor(Math.random() * dieSize) + 1;
			const roll2 = Math.floor(Math.random() * dieSize) + 1;

			if (advantage) {
				rolls.push(Math.max(roll1, roll2));
			} else {
				rolls.push(Math.min(roll1, roll2));
			}
		} else {
			// Normal rolling
			for (let i = 0; i < numDice; i++) {
				rolls.push(Math.floor(Math.random() * dieSize) + 1);
			}
		}

		const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

		return { total, rolls, modifier };
	}

	/**
	 * Check if command type is valid
	 */
	private static isValidCommandType(type: string): boolean {
		return ['roll', 'update', 'damage', 'heal', 'status', 'inventory'].includes(type);
	}
}
