import { CharacterUpdater } from '../tools/character-updater';
import { DiceRoller } from '../tools/dice-roller';
import { RuleEngine } from '../tools/rule-engine';

import { Character } from '@/types/character';
import { GameWorldState } from '@/types/world-map';

export interface DMMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'narration' | 'dialogue' | 'action_result' | 'system';
	speaker?: string;
	toolCalls?: ToolCall[];
}

export interface ToolCall {
	type: 'dice_roll' | 'character_update' | 'rule_lookup' | 'world_update';
	parameters: Record<string, any>;
	result?: any;
}

export interface DMContext {
	worldState: GameWorldState;
	playerCharacter: Character;
	recentMessages: DMMessage[];
	currentScene: string;
	gameRules: Record<string, any>;
}

export class DungeonMasterAgent {
	private diceRoller: DiceRoller;
	private characterUpdater: CharacterUpdater;
	private ruleEngine: RuleEngine;
	private context: DMContext;
	private messageHistory: DMMessage[] = [];
	private gemmaModel: any = null;

	constructor(initialContext: DMContext, gemmaModel?: any) {
		this.context = initialContext;
		this.diceRoller = new DiceRoller();
		this.characterUpdater = new CharacterUpdater();
		this.ruleEngine = new RuleEngine();
		this.gemmaModel = gemmaModel || null;
	}

	/**
	 * Process a player action and generate DM response
	 */
	async processPlayerAction(playerInput: string): Promise<DMMessage> {
		const message: DMMessage = {
			id: this.generateId(),
			content: '',
			timestamp: Date.now(),
			type: 'narration',
			toolCalls: [],
		};

		try {
			// Parse player intent
			const intent = this.parsePlayerIntent(playerInput);

			// Generate response based on intent
			const response = await this.generateResponse(intent, playerInput);

			message.content = response.content;
			message.type = response.type;
			message.toolCalls = response.toolCalls;
			message.speaker = response.speaker;

			// Execute any tool calls
			if (message.toolCalls) {
				await this.executeToolCalls(message.toolCalls);
			}

			// Add to message history
			this.messageHistory.push(message);

			return message;
		} catch (error) {
			console.error('Error processing player action:', error);
			message.content = 'The DM seems distracted... *rolls dice behind screen*';
			message.type = 'system';
			return message;
		}
	}

	/**
	 * Parse player input to determine intent and extract parameters
	 */
	private parsePlayerIntent(input: string): {
		action: string;
		target?: string;
		parameters: Record<string, any>;
	} {
		const lowercaseInput = input.toLowerCase();

		// Combat actions
		if (lowercaseInput.includes('attack') || lowercaseInput.includes('hit')) {
			return {
				action: 'attack',
				target: this.extractTarget(input),
				parameters: { weapon: this.extractWeapon(input) },
			};
		}

		// Skill checks
		if (lowercaseInput.includes('check') || lowercaseInput.includes('roll')) {
			return {
				action: 'skill_check',
				parameters: { skill: this.extractSkill(input) },
			};
		}

		// Movement
		if (lowercaseInput.includes('move') || lowercaseInput.includes('go')) {
			return {
				action: 'movement',
				parameters: { direction: this.extractDirection(input) },
			};
		}

		// Spellcasting
		if (lowercaseInput.includes('cast') || lowercaseInput.includes('spell')) {
			return {
				action: 'cast_spell',
				target: this.extractTarget(input),
				parameters: { spell: this.extractSpell(input) },
			};
		}

		// Default to general action
		return {
			action: 'general',
			parameters: { description: input },
		};
	}

	/**
	 * Generate DM response based on player intent
	 */
	private async generateResponse(
		intent: any,
		originalInput: string,
	): Promise<{
		content: string;
		type: DMMessage['type'];
		speaker?: string;
		toolCalls: ToolCall[];
	}> {
		const toolCalls: ToolCall[] = [];
		let content = '';
		const type: DMMessage['type'] = 'narration';

		switch (intent.action) {
		case 'attack': {
			const attackRoll = this.diceRoller.roll('1d20');
			const damageRoll = this.diceRoller.roll('1d8');

			toolCalls.push({
				type: 'dice_roll',
				parameters: { notation: '1d20', purpose: 'attack' },
				result: attackRoll,
			});

			if (attackRoll.total >= 15) {
				// Hit
				toolCalls.push({
					type: 'dice_roll',
					parameters: { notation: '1d8', purpose: 'damage' },
					result: damageRoll,
				});
				content = `Your attack hits! You deal ${damageRoll.total} damage to the ${intent.target || 'enemy'}.`;
			} else {
				content = `Your attack misses! The ${intent.target || 'enemy'} dodges your strike.`;
			}
			break;
		}

		case 'skill_check': {
			const skillRoll = this.diceRoller.roll('1d20');
			toolCalls.push({
				type: 'dice_roll',
				parameters: { notation: '1d20', purpose: `${intent.parameters.skill} check` },
				result: skillRoll,
			});

			const dc = 15; // Dynamic DC based on difficulty
			if (skillRoll.total >= dc) {
				content = `Success! Your ${intent.parameters.skill} check (${skillRoll.total}) succeeds.`;
			} else {
				content = `Your ${intent.parameters.skill} check (${skillRoll.total}) fails.`;
			}
			break;
		}

		case 'cast_spell':
			// Check spell slots, then execute
			content = `You begin casting ${intent.parameters.spell}...`;
			// Add spell effect logic here
			break;

		case 'movement':
			content = `You move ${intent.parameters.direction}.`;
			// Update world state
			break;

		default:
			// Use AI/Gemma for general responses (future implementation)
			content = await this.generateGenericResponse(originalInput);
			break;
		}

		return { content, type, toolCalls };
	}

	/**
	 * Execute tool calls and update game state
	 */
	private async executeToolCalls(toolCalls: ToolCall[]): Promise<void> {
		for (const toolCall of toolCalls) {
			switch (toolCall.type) {
			case 'character_update': {
				const updateParams: any = toolCall.parameters;
				if (
					updateParams.type &&
						updateParams.operation &&
						updateParams.target &&
						updateParams.value !== undefined
				) {
					await this.characterUpdater.updateCharacter(
						this.context.playerCharacter,
						updateParams,
					);
				}
				break;
			}
			case 'rule_lookup':
				toolCall.result = await this.ruleEngine.lookupRule(toolCall.parameters.rule);
				break;
			case 'world_update':
				// Update world state based on parameters
				break;
			}
		}
	}

	/**
	 * Generate generic AI response using Gemma model or fallback
	 */
	private async generateGenericResponse(input: string): Promise<string> {
		if (this.gemmaModel && this.gemmaModel.isModelReady()) {
			try {
				// Use Gemma model for response generation
				const context = {
					scene: this.context.currentScene,
					playerName: this.context.playerCharacter.name,
					playerClass: this.context.playerCharacter.class,
					worldName: this.context.worldState.worldMap.name,
				};

				const response = await this.gemmaModel.generateResponse(input, context);

				// Parse and execute any tool commands
				const { cleanText, tools } = this.gemmaModel.parseToolCommands(response.text);

				// Handle tool commands
				for (const tool of tools) {
					if (tool.type === 'roll') {
						// Tool commands will be handled by the main processing logic
						console.log('Tool command found:', tool);
					}
				}

				return cleanText || response.text;
			} catch (error) {
				console.error('Gemma model error, using fallback:', error);
				// Fall through to fallback
			}
		}

		// Fallback responses when Gemma is not available
		const responses = [
			'The DM considers your action carefully...',
			'*The DM rolls some dice behind the screen*',
			'Interesting choice. What happens next depends on fate...',
			'The world around you seems to respond to your words...',
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	// Helper methods for parsing
	private extractTarget(input: string): string | undefined {
		const targets = ['goblin', 'orc', 'dragon', 'skeleton', 'door', 'chest'];
		return targets.find(target => input.toLowerCase().includes(target));
	}

	private extractWeapon(input: string): string | undefined {
		const weapons = ['sword', 'dagger', 'bow', 'staff', 'mace'];
		return weapons.find(weapon => input.toLowerCase().includes(weapon));
	}

	private extractSkill(input: string): string {
		const skills = ['perception', 'investigation', 'athletics', 'acrobatics', 'stealth'];
		return skills.find(skill => input.toLowerCase().includes(skill)) || 'investigation';
	}

	private extractDirection(input: string): string {
		const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
		return directions.find(dir => input.toLowerCase().includes(dir)) || 'forward';
	}

	private extractSpell(input: string): string | undefined {
		const spells = ['fireball', 'magic missile', 'cure wounds', 'shield'];
		return spells.find(spell => input.toLowerCase().includes(spell));
	}

	private generateId(): string {
		return `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Public methods for external access
	public updateContext(newContext: Partial<DMContext>): void {
		this.context = { ...this.context, ...newContext };
	}

	public getMessageHistory(): DMMessage[] {
		return [...this.messageHistory];
	}

	public clearHistory(): void {
		this.messageHistory = [];
	}
}
