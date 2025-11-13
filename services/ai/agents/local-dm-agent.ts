/**
 * Local DM Agent for AI D&D Platform
 *
 * Provides intelligent D&D gameplay assistance with local model inference
 * Handles player actions, rule integration, and narrative generation
 *
 * Requirements: 2.1, 2.2, 2.3
 */
import {
	DefaultQualityFilterConfig,
	QualityFilterConfig,
	QualityValidationResult,
	ResponseQualityFilter,
} from '../tools/response-quality-filter';
import { ExecutionContext, ToolCommandExecutor } from '../tools/tool-command-executor';

import { Character } from '@/types/character';
import { GameState } from '@/types/game';

// Core interfaces for LocalDMAgent
export interface LocalDMAgent {
	// Core functionality
	processPlayerAction(action: string, context: GameContext): Promise<DMResponse>;
	generateNarration(scene: string, context: GameContext): Promise<string>;

	// Model lifecycle
	loadModel(config: LocalModelConfig): Promise<boolean>;
	unloadModel(): Promise<void>;

	// Performance optimization
	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void;
	enableBatteryOptimization(enabled: boolean): void;

	// Privacy and security
	clearModelCache(): Promise<void>;
	exportModelData(): Promise<ModelData>;
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

export interface LocalModelConfig {
	modelPath: string;
	contextSize: number;
	maxTokens: number;
	temperature: number;
	quantization: 'int8' | 'int4' | 'fp16' | 'fp32';
	enableGPU: boolean;
	memoryLimit: number;
}

export interface ModelData {
	modelInfo: {
		name: string;
		version: string;
		size: number;
	};
	cacheData: any[];
	performanceMetrics: {
		totalInferences: number;
		averageTime: number;
		successRate: number;
	};
}

/**
 * LocalDMAgent implementation with D&D-specific processing
 */
export class LocalDMAgentImpl implements LocalDMAgent {
	private modelConfig: LocalModelConfig | null = null;
	private isModelLoaded = false;
	private performanceMode: 'performance' | 'balanced' | 'quality' = 'balanced';
	private batteryOptimizationEnabled = false;
	private responseCache = new Map<string, DMResponse>();
	private performanceMetrics = {
		totalInferences: 0,
		totalTime: 0,
		successfulInferences: 0,
	};

	// D&D rule system integration
	private dndRules = new DnDRuleEngine();
	private narrativeGenerator = new NarrativeGenerator();
	private contextAnalyzer = new ContextAnalyzer();

	// Response quality filtering
	private qualityFilter: ResponseQualityFilter;
	private qualityConfig: QualityFilterConfig = DefaultQualityFilterConfig;
	private regenerationAttempts = 0;

	constructor() {
		this.qualityFilter = new ResponseQualityFilter(this.qualityConfig);
	}

	/**
	 * Process player action with context awareness and tool command execution
	 * Requirement 2.1: Generate contextually appropriate responses
	 * Requirement 4.2: Tool command parsing and execution
	 */
	async processPlayerAction(action: string, context: GameContext): Promise<DMResponse> {
		const startTime = Date.now();

		try {
			// Analyze action context and intent
			const actionAnalysis = this.contextAnalyzer.analyzePlayerAction(action, context);

			// Apply D&D rules based on action type
			const ruleApplications = await this.dndRules.processAction(actionAnalysis, context);

			// Generate narrative response
			const narrativeResponse = await this.narrativeGenerator.generateResponse(
				actionAnalysis,
				context,
				ruleApplications,
			);

			// Process AI response and execute tool commands
			const executionContext: ExecutionContext = {
				character: context.playerCharacter,
				gameState: context.gameState,
				updateCharacter: async (updates: Partial<Character>) => {
					// This would be provided by the calling code to update character
					Object.assign(context.playerCharacter, updates);
				},
				updateGameState: async (updates: Partial<GameState>) => {
					// This would be provided by the calling code to update game state
					Object.assign(context.gameState, updates);
				},
			};

			const { cleanText, executionResult } = await ToolCommandExecutor.processAIResponse(
				narrativeResponse.text,
				executionContext,
			);

			// Apply response quality filtering and validation
			// Requirement 6.3: Content filtering and validation
			const qualityResult = await this.validateResponseQuality(
				cleanText,
				context,
				narrativeResponse.confidence,
			);

			// Handle quality validation results
			let finalText = cleanText;
			let finalConfidence = narrativeResponse.confidence;

			if (
				qualityResult.shouldRegenerate &&
				this.regenerationAttempts < this.qualityConfig.maxRegenerationAttempts
			) {
				// Attempt to regenerate response if quality is insufficient
				this.regenerationAttempts++;
				console.warn(
					`🔄 LocalDMAgent: Regenerating response (attempt ${this.regenerationAttempts})`,
				);

				// Recursive call with regeneration
				return await this.processPlayerAction(action, context);
			} else {
				// Use filtered text and reset regeneration attempts
				finalText = qualityResult.filteredText || cleanText;
				finalConfidence = Math.min(narrativeResponse.confidence, qualityResult.confidence);
				this.regenerationAttempts = 0;
			}

			// Build comprehensive DM response with tool command results
			const dmResponse: DMResponse = {
				text: finalText,
				narration: narrativeResponse.narration,
				toolCommands: executionResult.commands,
				ruleApplications,
				sceneUpdates: narrativeResponse.sceneUpdates,
				characterUpdates: narrativeResponse.characterUpdates,
				confidence: finalConfidence,
				processingTime: Date.now() - startTime,
				responseType: actionAnalysis.type,
			};

			// Update performance metrics
			this.updatePerformanceMetrics(dmResponse.processingTime, true);

			// Cache response for potential reuse
			this.cacheResponse(action, context, dmResponse);

			return dmResponse;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			this.updatePerformanceMetrics(processingTime, false);

			console.error('❌ LocalDMAgent: Failed to process player action:', error);

			// Return fallback response
			return this.generateFallbackResponse(action, context, processingTime);
		}
	}

	/**
	 * Generate narrative content for scenes
	 * Requirement 2.2: Maintain story consistency
	 */
	async generateNarration(scene: string, context: GameContext): Promise<string> {
		try {
			const narrativeContext = {
				scene,
				playerCharacter: context.playerCharacter,
				currentLocation: context.currentLocation,
				timeOfDay: context.timeOfDay,
				weather: context.weather,
				recentActions: context.recentActions,
				worldState: context.worldState,
			};

			return await this.narrativeGenerator.generateSceneNarration(narrativeContext);
		} catch (error) {
			console.error('❌ LocalDMAgent: Failed to generate narration:', error);

			// Return fallback narration
			return this.generateFallbackNarration(scene, context);
		}
	}

	/**
	 * Load and initialize local model
	 * Requirement 1.1: Model initialization
	 */
	async loadModel(config: LocalModelConfig): Promise<boolean> {
		try {
			this.modelConfig = config;

			// Initialize D&D rule engine
			await this.dndRules.initialize();

			// Initialize narrative generator with model config
			await this.narrativeGenerator.initialize(config);

			// Initialize context analyzer
			await this.contextAnalyzer.initialize();

			this.isModelLoaded = true;
			console.log('✅ LocalDMAgent: Model loaded successfully');

			return true;
		} catch (error) {
			console.error('❌ LocalDMAgent: Failed to load model:', error);
			this.isModelLoaded = false;
			return false;
		}
	}

	/**
	 * Unload model and free resources
	 */
	async unloadModel(): Promise<void> {
		try {
			await this.narrativeGenerator.cleanup();
			await this.contextAnalyzer.cleanup();
			await this.dndRules.cleanup();

			this.modelConfig = null;
			this.isModelLoaded = false;
			this.responseCache.clear();

			console.log('✅ LocalDMAgent: Model unloaded successfully');
		} catch (error) {
			console.error('❌ LocalDMAgent: Failed to unload model:', error);
			throw error;
		}
	}

	/**
	 * Set performance mode for optimization
	 * Requirement 3.1: Performance optimization
	 */
	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void {
		this.performanceMode = mode;

		// Update component configurations based on mode
		this.narrativeGenerator.setPerformanceMode(mode);
		this.contextAnalyzer.setPerformanceMode(mode);

		console.log(`🎛️ LocalDMAgent: Performance mode set to ${mode}`);
	}

	/**
	 * Enable or disable battery optimization
	 * Requirement 3.2: Battery optimization
	 */
	enableBatteryOptimization(enabled: boolean): void {
		this.batteryOptimizationEnabled = enabled;

		if (enabled) {
			// Reduce processing complexity for battery saving
			this.narrativeGenerator.enableBatteryOptimization(true);
			this.contextAnalyzer.enableBatteryOptimization(true);
			this.responseCache.clear(); // Clear cache to save memory
		} else {
			this.narrativeGenerator.enableBatteryOptimization(false);
			this.contextAnalyzer.enableBatteryOptimization(false);
		}

		console.log(`🔋 LocalDMAgent: Battery optimization ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Clear model cache for privacy
	 * Requirement 5.4: Privacy and data management
	 */
	async clearModelCache(): Promise<void> {
		try {
			this.responseCache.clear();
			await this.narrativeGenerator.clearCache();
			await this.contextAnalyzer.clearCache();

			console.log('🗑️ LocalDMAgent: Model cache cleared');
		} catch (error) {
			console.error('❌ LocalDMAgent: Failed to clear cache:', error);
			throw error;
		}
	}

	/**
	 * Export model data for backup or analysis
	 */
	async exportModelData(): Promise<ModelData> {
		if (!this.modelConfig) {
			throw new Error('No model loaded');
		}

		return {
			modelInfo: {
				name: this.extractModelName(this.modelConfig.modelPath),
				version: '1.0.0',
				size: this.modelConfig.memoryLimit,
			},
			cacheData: Array.from(this.responseCache.values()),
			performanceMetrics: {
				totalInferences: this.performanceMetrics.totalInferences,
				averageTime:
					this.performanceMetrics.totalTime /
					Math.max(this.performanceMetrics.totalInferences, 1),
				successRate:
					this.performanceMetrics.successfulInferences /
					Math.max(this.performanceMetrics.totalInferences, 1),
			},
		};
	}

	// Private helper methods

	/**
	 * Validate and process tool commands before execution
	 * Requirement 4.2: Tool command parsing and validation
	 */
	private async validateAndProcessToolCommands(
		responseText: string,
		context: GameContext,
	): Promise<{
		isValid: boolean;
		commands: Array<{ type: string; params: string }>;
		errors: string[];
		suggestions: string[];
	}> {
		// Use ToolCommandExecutor for validation
		const validation = ToolCommandExecutor.validateCommands(responseText);

		const suggestions: string[] = [];

		// Add context-aware suggestions for invalid commands
		if (!validation.valid) {
			for (const error of validation.errors) {
				if (error.includes('dice notation')) {
					suggestions.push('Use format like [ROLL:1d20+3] or [ROLL:2d6]');
				} else if (error.includes('update format')) {
					suggestions.push('Use format like [UPDATE:HP-5] or [UPDATE:STR+1]');
				} else if (error.includes('damage/heal format')) {
					suggestions.push('Use format like [DAMAGE:2d6] or [HEAL:1d8+2]');
				}
			}
		}

		return {
			isValid: validation.valid,
			commands: validation.commands,
			errors: validation.errors,
			suggestions,
		};
	}

	/**
	 * Generate context-aware tool commands based on action analysis
	 * Requirement 4.2: Intelligent tool command generation
	 */
	private generateContextualToolCommands(
		actionAnalysis: any,
		context: GameContext,
		ruleApplications: RuleApplication[],
	): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];

		// Generate commands based on action type and rules
		switch (actionAnalysis.type) {
			case 'combat':
				if (actionAnalysis.intent === 'attack') {
					// Add attack roll
					const attackBonus = this.calculateAttackBonus(context.playerCharacter);
					commands.push({ type: 'roll', params: `1d20+${attackBonus} attack` });

					// Add damage roll if weapon is specified
					if (actionAnalysis.weaponType) {
						const damageRoll = this.getWeaponDamageRoll(
							actionAnalysis.weaponType,
							context.playerCharacter,
						);
						commands.push({ type: 'damage', params: damageRoll });
					}
				}
				break;

			case 'skill_check':
				if (actionAnalysis.skill) {
					const skillModifier = this.calculateSkillModifier(
						actionAnalysis.skill,
						context.playerCharacter,
					);
					commands.push({
						type: 'roll',
						params: `1d20+${skillModifier} ${actionAnalysis.skill}`,
					});
				}
				break;

			case 'exploration': {
				// Add perception check for exploration
				const perceptionModifier = this.calculateSkillModifier(
					'perception',
					context.playerCharacter,
				);
				commands.push({
					type: 'roll',
					params: `1d20+${perceptionModifier} perception`,
				});
				break;
			}
		}

		// Add commands from rule applications
		for (const rule of ruleApplications) {
			if (rule.diceRoll) {
				commands.push({ type: 'roll', params: rule.diceRoll });
			}
		}

		return commands;
	}

	/**
	 * Calculate attack bonus for character
	 */
	private calculateAttackBonus(character: Character): number {
		// Simple calculation - would be more complex in full implementation
		const strModifier = Math.floor((character.stats.STR - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;
		return strModifier + proficiencyBonus;
	}

	/**
	 * Get weapon damage roll for character
	 */
	private getWeaponDamageRoll(weaponType: string, character: Character): string {
		const strModifier = Math.floor((character.stats.STR - 10) / 2);
		const weaponDamage: Record<string, string> = {
			sword: `1d8+${strModifier}`,
			dagger: `1d4+${strModifier}`,
			bow: `1d6+${Math.floor((character.stats.DEX - 10) / 2)}`,
			staff: `1d6+${strModifier}`,
			mace: `1d6+${strModifier}`,
		};

		return weaponDamage[weaponType.toLowerCase()] || `1d6+${strModifier}`;
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
	 * Extract tool commands from response text (legacy method for compatibility)
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
	 * Remove tool commands from display text (legacy method for compatibility)
	 */
	private removeToolCommands(text: string): string {
		return text.replace(/\[(\w+):([^\]]+)\]/g, '').trim();
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
	 * Cache response for potential reuse
	 */
	private cacheResponse(action: string, context: GameContext, response: DMResponse): void {
		if (this.batteryOptimizationEnabled) {
			return; // Skip caching in battery optimization mode
		}

		const cacheKey = this.generateCacheKey(action, context);
		this.responseCache.set(cacheKey, response);

		// Limit cache size
		if (this.responseCache.size > 50) {
			const firstKey = this.responseCache.keys().next().value;
			if (firstKey) {
				this.responseCache.delete(firstKey);
			}
		}
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
	 * Validate response quality and filter content
	 * Requirement 6.3: Content filtering and validation
	 */
	private async validateResponseQuality(
		responseText: string,
		context: GameContext,
		confidence: number,
	): Promise<QualityValidationResult> {
		try {
			// Convert GameContext to the format expected by ResponseQualityFilter
			const filterContext = {
				playerCharacter: {
					name: context.playerCharacter.name,
					class: context.playerCharacter.class,
					race: context.playerCharacter.race,
					level: context.playerCharacter.level,
				},
				currentScene: context.currentScene,
				gameWorld: context.gameState.gameWorld,
				recentActions: context.recentActions,
				activeQuests: context.activeQuests,
			};

			return await this.qualityFilter.validateResponse(
				responseText,
				filterContext,
				confidence,
			);
		} catch (error) {
			console.error('❌ LocalDMAgent: Response quality validation failed:', error);

			// Return a safe fallback validation result
			return {
				isValid: true, // Allow response to proceed
				confidence: Math.max(confidence * 0.8, 0.5), // Reduce confidence
				issues: [
					{
						type: 'quality',
						severity: 'low',
						description: 'Quality validation system unavailable',
					},
				],
				suggestions: ['Quality validation temporarily unavailable'],
				shouldRegenerate: false,
				filteredText: responseText,
			};
		}
	}

	/**
	 * Extract model name from file path
	 */
	private extractModelName(modelPath: string): string {
		const fileName = modelPath.split('/').pop() || 'unknown';
		return fileName.replace(/\.(gguf|onnx)$/, '');
	}
}

/**
 * D&D Rule Engine for processing game mechanics
 * Requirement 2.3: D&D rule integration
 */
class DnDRuleEngine {
	private rules: Map<string, any> = new Map();

	async initialize(): Promise<void> {
		// Initialize D&D 5e rules database
		this.loadCoreRules();
		this.loadCombatRules();
		this.loadSkillRules();
		console.log('✅ DnDRuleEngine: Initialized successfully');
	}

	async processAction(actionAnalysis: any, context: GameContext): Promise<RuleApplication[]> {
		const applications: RuleApplication[] = [];

		switch (actionAnalysis.type) {
			case 'combat':
				applications.push(...this.processCombatAction(actionAnalysis, context));
				break;
			case 'skill_check':
				applications.push(...this.processSkillCheck(actionAnalysis, context));
				break;
			case 'exploration':
				applications.push(...this.processExploration(actionAnalysis, context));
				break;
			default:
				// No specific rules to apply
				break;
		}

		return applications;
	}

	private loadCoreRules(): void {
		// Load basic D&D 5e rules
		this.rules.set('ability_check', {
			formula: '1d20 + ability_modifier',
			difficulty_classes: {
				easy: 10,
				medium: 15,
				hard: 20,
				very_hard: 25,
			},
		});
	}

	private loadCombatRules(): void {
		// Load combat-specific rules
		this.rules.set('attack_roll', {
			formula: '1d20 + attack_bonus',
			critical_hit: 20,
			critical_miss: 1,
		});

		this.rules.set('damage_roll', {
			weapon_damage: 'weapon_die + ability_modifier',
			critical_damage: 'double_dice',
		});
	}

	private loadSkillRules(): void {
		// Load skill check rules
		this.rules.set('skill_check', {
			formula: '1d20 + skill_modifier + ability_modifier',
			advantage: 'roll_twice_take_higher',
			disadvantage: 'roll_twice_take_lower',
		});
	}

	private processCombatAction(actionAnalysis: any, context: GameContext): RuleApplication[] {
		const applications: RuleApplication[] = [];

		if (actionAnalysis.intent === 'attack') {
			applications.push({
				rule: 'Attack Roll',
				description: 'Roll 1d20 + attack bonus to hit target',
				effect: 'Determines if attack hits',
				diceRoll: '1d20+5', // Placeholder modifier
			});

			if (actionAnalysis.weaponType) {
				applications.push({
					rule: 'Damage Roll',
					description: `Roll damage for ${actionAnalysis.weaponType}`,
					effect: 'Determines damage dealt',
					diceRoll: this.getWeaponDamage(actionAnalysis.weaponType),
				});
			}
		}

		return applications;
	}

	private processSkillCheck(actionAnalysis: any, context: GameContext): RuleApplication[] {
		const skill = actionAnalysis.skill || 'perception';
		const modifier = this.getSkillModifier(skill, context.playerCharacter);

		return [
			{
				rule: 'Skill Check',
				description: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
				effect: 'Determines success or failure of the action',
				diceRoll: `1d20+${modifier}`,
				modifier,
			},
		];
	}

	private processExploration(actionAnalysis: any, context: GameContext): RuleApplication[] {
		// Most exploration actions don't require specific rule applications
		return [];
	}

	private getWeaponDamage(weaponType: string): string {
		const weaponDamage: Record<string, string> = {
			sword: '1d8+3',
			dagger: '1d4+2',
			bow: '1d6+2',
			staff: '1d6+1',
			mace: '1d6+3',
		};

		return weaponDamage[weaponType.toLowerCase()] || '1d6+2';
	}

	private getSkillModifier(skill: string, character: Character): number {
		// Calculate skill modifier based on character stats and proficiencies
		const baseModifier = Math.floor((character.stats.INT - 10) / 2); // Placeholder
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Check if character is proficient in this skill
		const isProficient = character.skills.includes(skill);

		return baseModifier + (isProficient ? proficiencyBonus : 0);
	}

	async cleanup(): Promise<void> {
		this.rules.clear();
		console.log('✅ DnDRuleEngine: Cleaned up successfully');
	}
}

/**
 * Narrative Generator for creating story content
 * Requirement 2.2: Story consistency
 */
class NarrativeGenerator {
	private performanceMode: 'performance' | 'balanced' | 'quality' = 'balanced';
	private batteryOptimizationEnabled = false;
	private narrativeCache = new Map<string, string>();

	async initialize(config: LocalModelConfig): Promise<void> {
		// Initialize narrative generation system
		console.log('✅ NarrativeGenerator: Initialized successfully');
	}

	async generateResponse(
		actionAnalysis: any,
		context: GameContext,
		ruleApplications: RuleApplication[],
	): Promise<{
		text: string;
		narration?: string;
		confidence: number;
		sceneUpdates?: Partial<GameContext>;
		characterUpdates?: Partial<Character>;
	}> {
		// Generate contextually appropriate narrative response
		const baseResponse = this.generateBaseResponse(actionAnalysis, context);
		const ruleNarration = this.incorporateRules(baseResponse, ruleApplications);

		return {
			text: ruleNarration,
			confidence: 0.85,
			sceneUpdates: this.generateSceneUpdates(actionAnalysis, context),
		};
	}

	async generateSceneNarration(narrativeContext: any): Promise<string> {
		const cacheKey = `scene_${narrativeContext.scene}_${narrativeContext.currentLocation}`;

		if (this.narrativeCache.has(cacheKey)) {
			return this.narrativeCache.get(cacheKey)!;
		}

		const narration = this.createSceneDescription(narrativeContext);
		this.narrativeCache.set(cacheKey, narration);

		return narration;
	}

	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void {
		this.performanceMode = mode;
	}

	enableBatteryOptimization(enabled: boolean): void {
		this.batteryOptimizationEnabled = enabled;
		if (enabled) {
			this.narrativeCache.clear();
		}
	}

	async clearCache(): Promise<void> {
		this.narrativeCache.clear();
	}

	async cleanup(): Promise<void> {
		this.narrativeCache.clear();
		console.log('✅ NarrativeGenerator: Cleaned up successfully');
	}

	private generateBaseResponse(actionAnalysis: any, context: GameContext): string {
		const templates = this.getResponseTemplates(actionAnalysis.type);
		const template = templates[Math.floor(Math.random() * templates.length)];

		return this.fillTemplate(template, context);
	}

	private incorporateRules(baseResponse: string, ruleApplications: RuleApplication[]): string {
		let response = baseResponse;

		for (const rule of ruleApplications) {
			if (rule.diceRoll) {
				response += ` [ROLL:${rule.diceRoll}]`;
			}
		}

		return response;
	}

	private generateSceneUpdates(actionAnalysis: any, context: GameContext): Partial<GameContext> {
		// Generate updates to scene based on player action
		return {
			recentActions: [...context.recentActions.slice(-4), actionAnalysis.action],
		};
	}

	private createSceneDescription(narrativeContext: any): string {
		const { scene, currentLocation, timeOfDay, weather } = narrativeContext;

		const descriptions = [
			`The ${scene} unfolds before you in ${currentLocation}. ${this.getTimeDescription(timeOfDay)} ${this.getWeatherDescription(weather)}`,
			`You find yourself in ${currentLocation}, where ${scene} awaits. The ${timeOfDay} atmosphere is enhanced by ${weather}.`,
			`${currentLocation} presents ${scene} to your adventuring party. The ${timeOfDay} light reveals details enhanced by the ${weather}.`,
		];

		return descriptions[Math.floor(Math.random() * descriptions.length)];
	}

	private getResponseTemplates(actionType: string): string[] {
		const templates: Record<string, string[]> = {
			combat: [
				'Your attack strikes with determination!',
				'The battle intensifies as you engage your foe!',
				'Your weapon finds its mark in the heat of combat!',
			],
			skill_check: [
				'Your skills are put to the test.',
				'This requires careful application of your abilities.',
				'Your training serves you well in this moment.',
			],
			dialogue: [
				'The conversation takes an interesting turn.',
				'Your words carry weight in this exchange.',
				'The NPC considers your statement carefully.',
			],
			exploration: [
				'You venture deeper into the unknown.',
				'New discoveries await around every corner.',
				'The path ahead reveals fresh mysteries.',
			],
			narrative: [
				'The story continues to unfold.',
				'Your choices shape the world around you.',
				'Adventure calls to you once more.',
			],
		};

		return templates[actionType] || templates.narrative;
	}

	private fillTemplate(template: string, context: GameContext): string {
		return template
			.replace('{playerName}', context.playerCharacter.name)
			.replace('{playerClass}', context.playerCharacter.class)
			.replace('{playerRace}', context.playerCharacter.race)
			.replace('{currentLocation}', context.currentLocation)
			.replace('{gameWorld}', context.gameState.gameWorld);
	}

	private getTimeDescription(timeOfDay: string): string {
		const descriptions: Record<string, string> = {
			dawn: 'The first light of dawn breaks across the horizon.',
			morning: 'The morning sun illuminates the scene.',
			afternoon: 'The afternoon light casts long shadows.',
			evening: 'The evening light begins to fade.',
			night: 'The darkness of night envelops everything.',
		};

		return descriptions[timeOfDay] || 'The light reveals the scene before you.';
	}

	private getWeatherDescription(weather: string): string {
		if (!weather || weather === 'clear') {
			return 'The weather is pleasant and clear.';
		}

		return `The ${weather} adds atmosphere to your surroundings.`;
	}
}

/**
 * Context Analyzer for understanding player actions and game state
 */
class ContextAnalyzer {
	private performanceMode: 'performance' | 'balanced' | 'quality' = 'balanced';
	private batteryOptimizationEnabled = false;

	async initialize(): Promise<void> {
		console.log('✅ ContextAnalyzer: Initialized successfully');
	}

	analyzePlayerAction(
		action: string,
		context: GameContext,
	): {
		action: string;
		type: 'combat' | 'skill_check' | 'dialogue' | 'exploration' | 'narrative';
		intent: string;
		skill?: string;
		weaponType?: string;
		target?: string;
		difficulty?: 'easy' | 'medium' | 'hard';
	} {
		const lowercaseAction = action.toLowerCase();

		// Combat actions
		if (this.isCombatAction(lowercaseAction)) {
			return {
				action,
				type: 'combat',
				intent: 'attack',
				weaponType: this.extractWeaponType(lowercaseAction),
				target: this.extractTarget(lowercaseAction),
			};
		}

		// Skill checks
		if (this.isSkillCheck(lowercaseAction)) {
			return {
				action,
				type: 'skill_check',
				intent: 'check',
				skill: this.extractSkill(lowercaseAction),
				difficulty: this.estimateDifficulty(lowercaseAction, context),
			};
		}

		// Dialogue
		if (this.isDialogue(lowercaseAction)) {
			return {
				action,
				type: 'dialogue',
				intent: 'communicate',
			};
		}

		// Exploration
		if (this.isExploration(lowercaseAction)) {
			return {
				action,
				type: 'exploration',
				intent: 'explore',
			};
		}

		// Default to narrative
		return {
			action,
			type: 'narrative',
			intent: 'general',
		};
	}

	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void {
		this.performanceMode = mode;
	}

	enableBatteryOptimization(enabled: boolean): void {
		this.batteryOptimizationEnabled = enabled;
	}

	async clearCache(): Promise<void> {
		// No cache to clear in this implementation
	}

	async cleanup(): Promise<void> {
		console.log('✅ ContextAnalyzer: Cleaned up successfully');
	}

	private isCombatAction(action: string): boolean {
		const combatKeywords = [
			'attack',
			'hit',
			'strike',
			'fight',
			'battle',
			'swing',
			'shoot',
			'cast spell',
		];
		return combatKeywords.some(keyword => action.includes(keyword));
	}

	private isSkillCheck(action: string): boolean {
		const skillKeywords = [
			'check',
			'search',
			'look',
			'listen',
			'investigate',
			'perceive',
			'climb',
			'jump',
		];
		return skillKeywords.some(keyword => action.includes(keyword));
	}

	private isDialogue(action: string): boolean {
		const dialogueKeywords = [
			'talk',
			'speak',
			'say',
			'ask',
			'tell',
			'convince',
			'persuade',
			'intimidate',
		];
		return dialogueKeywords.some(keyword => action.includes(keyword));
	}

	private isExploration(action: string): boolean {
		const explorationKeywords = [
			'explore',
			'move',
			'go',
			'walk',
			'run',
			'enter',
			'exit',
			'travel',
		];
		return explorationKeywords.some(keyword => action.includes(keyword));
	}

	private extractWeaponType(action: string): string | undefined {
		const weapons = ['sword', 'dagger', 'bow', 'staff', 'mace', 'axe', 'spear'];
		return weapons.find(weapon => action.includes(weapon));
	}

	private extractTarget(action: string): string | undefined {
		const targets = ['goblin', 'orc', 'skeleton', 'dragon', 'bandit', 'wolf'];
		return targets.find(target => action.includes(target));
	}

	private extractSkill(action: string): string {
		const skillMap: Record<string, string> = {
			search: 'investigation',
			look: 'perception',
			listen: 'perception',
			climb: 'athletics',
			jump: 'athletics',
			sneak: 'stealth',
			hide: 'stealth',
		};

		for (const [keyword, skill] of Object.entries(skillMap)) {
			if (action.includes(keyword)) {
				return skill;
			}
		}

		return 'perception'; // Default skill
	}

	private estimateDifficulty(action: string, context: GameContext): 'easy' | 'medium' | 'hard' {
		// Simple difficulty estimation based on context
		if (context.inCombat) {
			return 'hard';
		}

		if (action.includes('difficult') || action.includes('hard')) {
			return 'hard';
		}

		if (action.includes('easy') || action.includes('simple')) {
			return 'easy';
		}

		return 'medium';
	}
}

/**
 * Default configuration for LocalDMAgent
 */
export const DefaultLocalDMAgentConfig: LocalModelConfig = {
	modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
	contextSize: 2048,
	maxTokens: 150,
	temperature: 0.7,
	quantization: 'int8',
	enableGPU: false,
	memoryLimit: 512,
};
