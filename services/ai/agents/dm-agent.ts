/**
 * DM Agent for AI D&D Platform
 *
 * Provides intelligent D&D gameplay assistance using Cactus Compute's LLM
 * Handles player actions, rule integration, and narrative generation
 */
import { CactusMessage, CactusProvider, CactusProviderInterface } from '../providers/cactus-provider';

import { Character } from '@/types/character';
import { GameState } from '@/types/game';

// Core interfaces for DMAgent
export interface DMAgent {
	// Core functionality
	processPlayerAction(action: string, context: GameContext): Promise<DMResponse>;
	generateNarration(scene: string, context: GameContext): Promise<string>;

	// Model lifecycle
	initialize(config: DMConfig): Promise<boolean>;
	unloadModel(): Promise<void>;

	// Performance optimization
	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void;
	enableBatteryOptimization(enabled: boolean): void;

	// Privacy and security
	clearModelCache(): Promise<void>;
}

export interface GameContext {
	// Player information
	playerCharacter: Character;
	gameState: GameState;

	// Scene context
	currentScene: string;
	currentLocation: string;

	// Game history
	recentActions: string[];
	conversationHistory: string[];

	// Combat state
	inCombat: boolean;
	combatRound?: number;
	initiative?: number;

	// Environmental factors
	timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
	weather: string;

	// Story context
	activeQuests: string[];
	importantNPCs: string[];
	worldState: Record<string, any>;
}

export interface DMResponse {
	// Response content
	text: string;
	narration?: string;

	// Game mechanics
	toolCommands: Array<{ type: string; params: string }>;
	ruleApplications: RuleApplication[];

	// Context updates
	sceneUpdates?: Partial<GameContext>;
	characterUpdates?: Partial<Character>;

	// Metadata
	confidence: number;
	processingTime: number;
	responseType: 'narrative' | 'combat' | 'dialogue' | 'exploration' | 'skill_check';
}

export interface RuleApplication {
	rule: string;
	description: string;
	effect: string;
	diceRoll?: string;
	modifier?: number;
	result?: number;
}

export interface DMConfig {
	modelUrl?: string;
	contextSize?: number;
	temperature?: number;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
}

/**
 * DMAgent implementation with D&D-specific processing
 */
export class DMAgentImpl implements DMAgent {
	private cactusProvider: CactusProviderInterface;
	private isInitialized = false;
	private performanceMode: 'performance' | 'balanced' | 'quality' = 'balanced';
	private batteryOptimizationEnabled = false;
	private responseCache = new Map<string, DMResponse>();
	private performanceMetrics = {
		totalInferences: 0,
		totalTime: 0,
		successfulInferences: 0,
	};

	constructor() {
		this.cactusProvider = new CactusProvider();
	}

	/**
	 * Initialize the DM Agent
	 */
	async initialize(config: DMConfig): Promise<boolean> {
		try {
			// Initialize the Cactus provider
			await this.cactusProvider.initialize((progress) => {
				console.log(`DM Agent initialization progress: ${Math.round(progress * 100)}%`);
			});

			this.isInitialized = true;
			console.log('✅ DMAgent: Initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ DMAgent: Failed to initialize:', error);
			this.isInitialized = false;
			return false;
		}
	}

	/**
	 * Process player action with Cactus LLM
	 */
	async processPlayerAction(action: string, context: GameContext): Promise<DMResponse> {
		const startTime = Date.now();

		try {
			if (!this.isInitialized) {
				throw new Error('DMAgent not initialized');
			}

			// Check cache for similar actions
			const cacheKey = this.generateCacheKey(action, context);
			if (this.responseCache.has(cacheKey) && !this.batteryOptimizationEnabled) {
				console.log('🔄 DMAgent: Using cached response');
				return this.responseCache.get(cacheKey)!;
			}

			// Prepare context for the LLM
			const messages = this.prepareMessagesForAction(action, context);

			// Generate response using Cactus LLM
			const response = await this.cactusProvider.completion(messages, {
				temperature: this.getTemperatureForMode(),
				n_predict: 512,
			});

			// Process the response
			const { text, toolCommands, ruleApplications, responseType } = this.processResponse(response, context);

			// Build the DM response
			const dmResponse: DMResponse = {
				text,
				toolCommands,
				ruleApplications,
				confidence: 0.85, // Default confidence
				processingTime: Date.now() - startTime,
				responseType,
			};

			// Update performance metrics
			this.updatePerformanceMetrics(dmResponse.processingTime, true);

			// Cache response for potential reuse
			if (!this.batteryOptimizationEnabled) {
				this.responseCache.set(cacheKey, dmResponse);
			}

			return dmResponse;
		} catch (error) {
			console.error('❌ DMAgent: Failed to process player action:', error);
			const processingTime = Date.now() - startTime;
			this.updatePerformanceMetrics(processingTime, false);

			// Return fallback response
			return this.generateFallbackResponse(action, context, processingTime);
		}
	}

	/**
	 * Generate narrative content for scenes
	 */
	async generateNarration(scene: string, context: GameContext): Promise<string> {
		try {
			if (!this.isInitialized) {
				throw new Error('DMAgent not initialized');
			}

			// Prepare context for the LLM
			const messages = this.prepareMessagesForNarration(scene, context);

			// Generate narration using Cactus LLM
			const narration = await this.cactusProvider.completion(messages, {
				temperature: this.getTemperatureForMode(),
				n_predict: 256,
			});

			return narration;
		} catch (error) {
			console.error('❌ DMAgent: Failed to generate narration:', error);
			return this.generateFallbackNarration(scene, context);
		}
	}

	/**
	 * Unload model and free resources
	 */
	async unloadModel(): Promise<void> {
		try {
			this.cactusProvider.rewind();
			this.isInitialized = false;
			this.responseCache.clear();
			console.log('✅ DMAgent: Model unloaded successfully');
		} catch (error) {
			console.error('❌ DMAgent: Failed to unload model:', error);
			throw error;
		}
	}

	/**
	 * Set performance mode for optimization
	 */
	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void {
		this.performanceMode = mode;
		console.log(`🎛️ DMAgent: Performance mode set to ${mode}`);
	}

	/**
	 * Enable or disable battery optimization
	 */
	enableBatteryOptimization(enabled: boolean): void {
		this.batteryOptimizationEnabled = enabled;
		if (enabled) {
			this.responseCache.clear(); // Clear cache to save memory
		}
		console.log(`🔋 DMAgent: Battery optimization ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Clear model cache for privacy
	 */
	async clearModelCache(): Promise<void> {
		try {
			this.responseCache.clear();
			console.log('🗑️ DMAgent: Model cache cleared');
		} catch (error) {
			console.error('❌ DMAgent: Failed to clear cache:', error);
			throw error;
		}
	}

	// Private helper methods

	/**
	 * Prepare messages for player action processing
	 */
	private prepareMessagesForAction(action: string, context: GameContext): CactusMessage[] {
		const { playerCharacter, gameState, currentScene, currentLocation, inCombat } = context;

		// Create system prompt
		const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to respond to player actions in a D&D game, maintaining narrative consistency and applying game rules correctly.
Provide engaging, descriptive responses that advance the story and create an immersive experience.

Game Context:
- Player Character: ${playerCharacter.name}, Level ${playerCharacter.level} ${playerCharacter.race} ${playerCharacter.class}
- Current Location: ${currentLocation}
- Current Scene: ${currentScene}
- Combat Status: ${inCombat ? 'In combat' : 'Not in combat'}
- Game World: ${gameState.gameWorld}

When appropriate, include tool commands in your response using the following format:
- [ROLL:1d20+5] for dice rolls
- [DAMAGE:2d6+3] for damage calculations
- [HEAL:1d8+2] for healing
- [UPDATE:HP-5] for stat updates

Keep your responses concise, engaging, and true to D&D 5e rules.`;

		// Create conversation history
		const messages: CactusMessage[] = [
			{ role: 'system', content: systemPrompt },
		];

		// Add recent conversation history if available
		if (context.conversationHistory && context.conversationHistory.length > 0) {
			// Add up to 3 recent conversation turns for context
			const recentHistory = context.conversationHistory.slice(-6);
			for (let i = 0; i < recentHistory.length; i += 2) {
				if (i < recentHistory.length) {
					messages.push({ role: 'user', content: recentHistory[i] });
				}
				if (i + 1 < recentHistory.length) {
					messages.push({ role: 'assistant', content: recentHistory[i + 1] });
				}
			}
		}

		// Add current action
		messages.push({ role: 'user', content: action });

		return messages;
	}

	/**
	 * Prepare messages for scene narration
	 */
	private prepareMessagesForNarration(scene: string, context: GameContext): CactusMessage[] {
		const { playerCharacter, currentLocation, timeOfDay, weather } = context;

		// Create system prompt
		const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to create vivid, engaging scene descriptions for a D&D game.
Focus on creating an immersive atmosphere that sets the stage for adventure.

Scene Context:
- Player Character: ${playerCharacter.name}, Level ${playerCharacter.level} ${playerCharacter.race} ${playerCharacter.class}
- Location: ${currentLocation}
- Time of Day: ${timeOfDay}
- Weather: ${weather}

Keep your description concise (3-5 sentences) but rich in sensory details.`;

		// Create the user prompt
		const userPrompt = `Describe the following scene: ${scene}`;

		return [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		];
	}

	/**
	 * Process the LLM response
	 */
	private processResponse(response: string, context: GameContext): {
		text: string;
		toolCommands: Array<{ type: string; params: string }>;
		ruleApplications: RuleApplication[];
		responseType: DMResponse['responseType'];
	} {
		// Extract tool commands
		const toolCommands = this.extractToolCommands(response);

		// Clean text by removing tool commands
		const text = this.removeToolCommands(response);

		// Determine response type
		const responseType = this.determineResponseType(text, toolCommands);

		// Generate rule applications based on tool commands
		const ruleApplications = this.generateRuleApplications(toolCommands, context);

		return {
			text,
			toolCommands,
			ruleApplications,
			responseType,
		};
	}

	/**
	 * Extract tool commands from response text
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const type = match[1].toLowerCase();
			const params = match[2].trim();

			// Validate command types
			if (
				['roll', 'update', 'damage', 'heal', 'status', 'inventory', 'skill_check'].includes(
					type,
				)
			) {
				commands.push({ type, params });
			}
		}

		return commands;
	}

	/**
	 * Remove tool commands from display text
	 */
	private removeToolCommands(text: string): string {
		return text.replace(/\[(\w+):([^\]]+)\]/g, '').trim();
	}

	/**
	 * Determine response type based on content
	 */
	private determineResponseType(text: string, toolCommands: Array<{ type: string; params: string }>): DMResponse['responseType'] {
		const lowerText = text.toLowerCase();

		// Check tool commands first
		for (const command of toolCommands) {
			if (command.type === 'damage' || command.type === 'roll' && command.params.includes('attack')) {
				return 'combat';
			}
			if (command.type === 'skill_check') {
				return 'skill_check';
			}
		}

		// Check text content
		if (lowerText.includes('attack') || lowerText.includes('combat') || lowerText.includes('fight') || lowerText.includes('battle')) {
			return 'combat';
		}
		if (lowerText.includes('check') || lowerText.includes('skill') || lowerText.includes('ability')) {
			return 'skill_check';
		}
		if (lowerText.includes('talk') || lowerText.includes('speak') || lowerText.includes('conversation')) {
			return 'dialogue';
		}
		if (lowerText.includes('explore') || lowerText.includes('move') || lowerText.includes('travel')) {
			return 'exploration';
		}

		// Default to narrative
		return 'narrative';
	}

	/**
	 * Generate rule applications based on tool commands
	 */
	private generateRuleApplications(
		toolCommands: Array<{ type: string; params: string }>,
		context: GameContext,
	): RuleApplication[] {
		const ruleApplications: RuleApplication[] = [];

		for (const command of toolCommands) {
			switch (command.type) {
				case 'roll':
					ruleApplications.push({
						rule: 'Dice Roll',
						description: `Roll ${command.params}`,
						effect: 'Determines outcome of action',
						diceRoll: command.params,
					});
					break;

				case 'damage':
					ruleApplications.push({
						rule: 'Damage Calculation',
						description: `Deal ${command.params} damage`,
						effect: 'Reduces target hit points',
						diceRoll: command.params,
					});
					break;

				case 'heal':
					ruleApplications.push({
						rule: 'Healing',
						description: `Heal for ${command.params}`,
						effect: 'Restores hit points',
						diceRoll: command.params,
					});
					break;

				case 'skill_check':
					const skillName = command.params.split(' ')[0];
					const modifier = this.calculateSkillModifier(skillName, context.playerCharacter);

					ruleApplications.push({
						rule: 'Skill Check',
						description: `${skillName.charAt(0).toUpperCase() + skillName.slice(1)} check`,
						effect: 'Determines success of skill-based action',
						diceRoll: `1d20+${modifier}`,
						modifier,
					});
					break;
			}
		}

		return ruleApplications;
	}

	/**
	 * Calculate skill modifier for character
	 */
	private calculateSkillModifier(skill: string, character: Character): number {
		// Map skills to ability scores
		const skillAbilityMap: Record<string, keyof typeof character.stats> = {
			athletics: 'STR',
			acrobatics: 'DEX',
			stealth: 'DEX',
			investigation: 'INT',
			arcana: 'INT',
			history: 'INT',
			perception: 'WIS',
			insight: 'WIS',
			survival: 'WIS',
			persuasion: 'CHA',
			deception: 'CHA',
			intimidation: 'CHA',
		};

		const ability = skillAbilityMap[skill.toLowerCase()] || 'WIS';
		const abilityModifier = Math.floor((character.stats[ability] - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;
		const isProficient = character.skills.includes(skill);

		return abilityModifier + (isProficient ? proficiencyBonus : 0);
	}

	/**
	 * Generate fallback response when main processing fails
	 */
	private generateFallbackResponse(
		action: string,
		context: GameContext,
		processingTime: number,
	): DMResponse {
		const lowercaseAction = action.toLowerCase();
		let responseText = '';
		const toolCommands: Array<{ type: string; params: string }> = [];
		let responseType: DMResponse['responseType'] = 'narrative';

		// Combat actions
		if (lowercaseAction.includes('attack') || lowercaseAction.includes('hit')) {
			responseText = 'You attempt to strike your target! Roll for attack.';
			toolCommands.push({ type: 'roll', params: '1d20+5' });
			responseType = 'combat';
		}
		// Skill checks
		else if (lowercaseAction.includes('check') || lowercaseAction.includes('search')) {
			responseText = 'Make a skill check to determine the outcome.';
			toolCommands.push({ type: 'skill_check', params: 'perception' });
			responseType = 'skill_check';
		}
		// Dialogue
		else if (lowercaseAction.includes('talk') || lowercaseAction.includes('speak')) {
			responseText = 'The NPC listens to your words carefully.';
			responseType = 'dialogue';
		}
		// Exploration
		else if (lowercaseAction.includes('explore') || lowercaseAction.includes('move')) {
			responseText = `You venture forth into the ${context.currentLocation}.`;
			responseType = 'exploration';
		}
		// Generic fallback
		else {
			responseText = `Your action has consequences in the world of ${context.gameState.gameWorld}.`;
		}

		return {
			text: responseText,
			toolCommands,
			ruleApplications: [],
			confidence: 0.6, // Lower confidence for fallback
			processingTime,
			responseType,
		};
	}

	/**
	 * Generate fallback narration when main generation fails
	 */
	private generateFallbackNarration(scene: string, context: GameContext): string {
		const fallbackNarrations = [
			`The ${scene} stretches before you, filled with mystery and adventure.`,
			`As a ${context.playerCharacter.race} ${context.playerCharacter.class}, you sense the significance of this moment.`,
			`The atmosphere in ${context.currentLocation} is thick with anticipation.`,
			`Your journey through ${context.gameState.gameWorld} continues with new challenges ahead.`,
		];

		return fallbackNarrations[Math.floor(Math.random() * fallbackNarrations.length)];
	}

	/**
	 * Generate cache key for response caching
	 */
	private generateCacheKey(action: string, context: GameContext): string {
		return `${action.substring(0, 30)}_${context.currentScene}_${context.playerCharacter.class}`;
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(processingTime: number, success: boolean): void {
		this.performanceMetrics.totalInferences++;
		this.performanceMetrics.totalTime += processingTime;

		if (success) {
			this.performanceMetrics.successfulInferences++;
		}
	}

	/**
	 * Get temperature based on performance mode
	 */
	private getTemperatureForMode(): number {
		switch (this.performanceMode) {
			case 'performance':
				return 0.9; // Higher temperature for faster, more varied responses
			case 'quality':
				return 0.5; // Lower temperature for more predictable, higher quality responses
			case 'balanced':
			default:
				return 0.7; // Balanced temperature
		}
	}
}

// Helper function to create a DM Agent instance
export const createDMAgent = (): DMAgent => {
	return new DMAgentImpl();
};
