/**
 * Tool Command Executor for Local DM Agent
 *
 * Executes tool commands and integrates with game state management
 * Provides a high-level interface for AI providers to execute commands
 *
 * Requirements: 2.3, 4.2
 */

import { ToolCommand, ToolCommandParser, ToolCommandResult } from './tool-command-parser';

import { Character } from '@/types/character';
import { GameState } from '@/types/game';

export interface ExecutionContext {
	character: Character;
	gameState: GameState;
	updateCharacter: (updates: Partial<Character>) => Promise<void>;
	updateGameState?: (updates: Partial<GameState>) => Promise<void>;
}

export interface ExecutionResult {
	success: boolean;
	commands: ToolCommand[];
	results: ToolCommandResult[];
	messages: string[];
	characterUpdated: boolean;
	gameStateUpdated: boolean;
	error?: string;
}

export class ToolCommandExecutor {
	/**
	 * Process AI response text and execute any tool commands found
	 */
	static async processAIResponse(
		responseText: string,
		context: ExecutionContext,
	): Promise<{
		cleanText: string;
		executionResult: ExecutionResult;
	}> {
		try {
			// Extract tool commands from response
			const commands = ToolCommandParser.extractToolCommands(responseText);

			// Remove tool commands from display text
			const cleanText = ToolCommandParser.removeToolCommands(responseText);

			// Execute commands if any were found
			let executionResult: ExecutionResult;
			if (commands.length > 0) {
				executionResult = await this.executeCommands(commands, context);
			} else {
				executionResult = {
					success: true,
					commands: [],
					results: [],
					messages: [],
					characterUpdated: false,
					gameStateUpdated: false,
				};
			}

			return { cleanText, executionResult };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			return {
				cleanText: responseText,
				executionResult: {
					success: false,
					commands: [],
					results: [],
					messages: [],
					characterUpdated: false,
					gameStateUpdated: false,
					error: errorMessage,
				},
			};
		}
	}

	/**
	 * Execute a list of tool commands
	 */
	static async executeCommands(
		commands: ToolCommand[],
		context: ExecutionContext,
	): Promise<ExecutionResult> {
		const results: ToolCommandResult[] = [];
		const messages: string[] = [];
		let characterUpdated = false;
		let gameStateUpdated = false;
		let hasErrors = false;

		try {
			// Execute all commands and collect results
			const {
				results: commandResults,
				characterUpdates,
				gameStateUpdates,
			} = await ToolCommandParser.executeToolCommands(
				commands,
				context.character,
				context.gameState,
			);

			results.push(...commandResults);

			// Collect messages from results
			for (const result of commandResults) {
				if (result.message) {
					messages.push(result.message);
				}
				if (!result.success) {
					hasErrors = true;
				}
			}

			// Apply character updates if any
			if (Object.keys(characterUpdates).length > 0) {
				await context.updateCharacter(characterUpdates);
				characterUpdated = true;
				console.log('🎲 Character updated:', characterUpdates);
			}

			// Apply game state updates if any
			if (Object.keys(gameStateUpdates).length > 0 && context.updateGameState) {
				await context.updateGameState(gameStateUpdates);
				gameStateUpdated = true;
				console.log('🌍 Game state updated:', gameStateUpdates);
			}

			return {
				success: !hasErrors,
				commands,
				results,
				messages,
				characterUpdated,
				gameStateUpdated,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('❌ Tool command execution failed:', error);

			return {
				success: false,
				commands,
				results,
				messages,
				characterUpdated,
				gameStateUpdated,
				error: errorMessage,
			};
		}
	}

	/**
	 * Execute a single tool command (utility method)
	 */
	static async executeSingleCommand(
		commandText: string,
		context: ExecutionContext,
	): Promise<ExecutionResult> {
		const commands = ToolCommandParser.extractToolCommands(`[${commandText}]`);

		if (commands.length === 0) {
			return {
				success: false,
				commands: [],
				results: [],
				messages: [],
				characterUpdated: false,
				gameStateUpdated: false,
				error: 'No valid command found',
			};
		}

		return this.executeCommands(commands, context);
	}

	/**
	 * Validate tool commands without executing them
	 */
	static validateCommands(responseText: string): {
		valid: boolean;
		commands: ToolCommand[];
		errors: string[];
	} {
		const commands = ToolCommandParser.extractToolCommands(responseText);
		const errors: string[] = [];

		for (const command of commands) {
			try {
				// Try to parse command parameters to validate format
				switch (command.type) {
					case 'roll':
						this.validateRollCommand(command.params);
						break;
					case 'update':
						this.validateUpdateCommand(command.params);
						break;
					case 'damage':
					case 'heal':
						this.validateDamageHealCommand(command.params);
						break;
					case 'status':
						this.validateStatusCommand(command.params);
						break;
					case 'inventory':
						this.validateInventoryCommand(command.params);
						break;
					default:
						errors.push(`Unknown command type: ${command.type}`);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				errors.push(`Invalid ${command.type} command: ${errorMessage}`);
			}
		}

		return {
			valid: errors.length === 0,
			commands,
			errors,
		};
	}

	/**
	 * Get formatted execution summary for display
	 */
	static formatExecutionSummary(executionResult: ExecutionResult): string {
		if (!executionResult.success && executionResult.error) {
			return `⚠️ Command execution failed: ${executionResult.error}`;
		}

		if (executionResult.commands.length === 0) {
			return '';
		}

		const parts: string[] = [];

		// Add command results
		if (executionResult.messages.length > 0) {
			parts.push('🎲 ' + executionResult.messages.join(', '));
		}

		// Add update notifications
		if (executionResult.characterUpdated) {
			parts.push('📊 Character updated');
		}

		if (executionResult.gameStateUpdated) {
			parts.push('🌍 Game state updated');
		}

		return parts.join(' | ');
	}

	/**
	 * Extract dice roll results for display
	 */
	static extractRollResults(executionResult: ExecutionResult): Array<{
		notation: string;
		result: number;
		rolls: number[];
		purpose?: string;
	}> {
		const rollResults: Array<{
			notation: string;
			result: number;
			rolls: number[];
			purpose?: string;
		}> = [];

		for (const command of executionResult.commands) {
			if (command.type === 'roll' && command.result) {
				rollResults.push({
					notation: command.parsed?.notation || command.params,
					result: command.result.total,
					rolls: command.result.rolls,
					purpose: command.parsed?.purpose,
				});
			}
		}

		return rollResults;
	}

	// Validation methods
	private static validateRollCommand(params: string): void {
		const parts = params.toLowerCase().split(' ');
		const notation = parts[0];

		if (!/^\d+d\d+([+-]\d+)?$/.test(notation)) {
			throw new Error(`Invalid dice notation: ${notation}`);
		}
	}

	private static validateUpdateCommand(params: string): void {
		if (!/^(HP|MAXHP|AP|MAXAP|STR|DEX|CON|INT|WIS|CHA)([+-=])(\d+)$/i.test(params)) {
			throw new Error(`Invalid update format: ${params}`);
		}
	}

	private static validateDamageHealCommand(params: string): void {
		const parts = params.split(' ');
		const damageStr = parts[0];

		if (!/^(\d+d\d+([+-]\d+)?|\d+)$/.test(damageStr)) {
			throw new Error(`Invalid damage/heal format: ${damageStr}`);
		}
	}

	private static validateStatusCommand(params: string): void {
		if (!params.trim()) {
			throw new Error('Status effect name required');
		}
	}

	private static validateInventoryCommand(params: string): void {
		const parts = params.split(' ');
		const action = parts[0];

		if (!['add', 'remove', 'equip', 'unequip'].includes(action)) {
			throw new Error(`Invalid inventory action: ${action}`);
		}

		if (parts.length < 2) {
			throw new Error('Item name required');
		}
	}
}
