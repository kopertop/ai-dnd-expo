/**
 * Cactus Compute Provider for AI D&D Platform
 *
 * Integrates with Cactus React Native for local model inference
 * https://github.com/cactus-compute/cactus
 */
import { CactusLM } from 'cactus-react-native';

export interface CactusConfig {
	modelPath: string;
	contextSize?: number;
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
}

export interface DnDInferenceRequest {
	prompt: string;
	context: {
		playerName: string;
		playerClass: string;
		playerRace: string;
		currentScene: string;
		gameHistory: string[];
	};
	systemPrompt: string;
}

export interface CactusResponse {
	text: string;
	metadata?: {
		toolCommands?: Array<{ type: string; params: string }>;
		processingTime?: number;
	};
}

export class CactusAIProvider {
	private lm: any = null; // TODO: Add proper CactusLM type when available
	private config: CactusConfig;
	private isInitialized = false;

	constructor(config: CactusConfig) {
		this.config = config;
	}

	/**
	 * Initialize the Cactus LM model
	 */
	async initialize(): Promise<boolean> {
		try {
			const { lm, error } = await CactusLM.init({
				model: this.config.modelPath,
				n_ctx: this.config.contextSize || 2048,
			});

			if (error) {
				console.error('Failed to initialize Cactus LM:', error);
				return false;
			}

			this.lm = lm;
			this.isInitialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize Cactus LM:', error);
			return false;
		}
	}

	/**
	 * Generate D&D response using local model via Cactus LM
	 */
	async generateDnDResponse(request: DnDInferenceRequest): Promise<CactusResponse> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('Cactus LM not initialized. Call initialize() first.');
		}

		const prompt = this.buildDnDPrompt(request);
		const startTime = Date.now();

		try {
			const messages = [{ role: 'user', content: prompt }];
			const params = {
				n_predict: this.config.maxTokens || 150,
				temperature: this.config.temperature || 0.7,
			};

			const response = await this.lm.completion(messages, params);
			const processingTime = Date.now() - startTime;

			return this.processDnDResponse(response, processingTime);
		} catch (error: unknown) {
			console.error('Cactus inference error:', error);
			throw new Error(`AI generation failed: ${error.message}`);
		}
	}

	/**
	 * Build D&D-specific prompt for Gemma3
	 */
	private buildDnDPrompt(request: DnDInferenceRequest): string {
		const { context, systemPrompt } = request;

		return `${systemPrompt}

Character: ${context.playerName} (${context.playerRace} ${context.playerClass})
Scene: ${context.currentScene}
Recent History: ${context.gameHistory.slice(-3).join(' ')}

Player Action: ${request.prompt}

DM Response:`;
	}

	/**
	 * Process and validate D&D response
	 */
	private processDnDResponse(response: string, processingTime: number): CactusResponse {
		let text = response.trim();

		// Clean up common artifacts
		text = text.replace(/^DM:\s*/i, '');
		text = text.replace(/^\*.*?\*\s*/, ''); // Remove action descriptions

		// Parse tool commands
		const toolCommands = this.extractToolCommands(text);
		text = this.removeToolCommands(text);

		return {
			text,
			metadata: {
				toolCommands,
				processingTime,
			},
		};
	}

	/**
	 * Extract D&D tool commands like [ROLL:1d20+3]
	 * Now uses the centralized tool command parser
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const { ToolCommandParser } = require('../tools/tool-command-parser');
		return ToolCommandParser.extractToolCommands(text).map((cmd: { type: string; params: string }) => ({
			type: cmd.type,
			params: cmd.params,
		}));
	}

	/**
	 * Remove tool commands from display text
	 */
	private removeToolCommands(text: string): string {
		const { ToolCommandParser } = require('../tools/tool-command-parser');
		return ToolCommandParser.removeToolCommands(text);
	}

	/**
	 * Check if Cactus LM is available and ready
	 */
	async healthCheck(): Promise<boolean> {
		return this.isInitialized && this.lm !== null;
	}

	/**
	 * Get model information (for local models, this returns the configured model path)
	 */
	async getAvailableModels(): Promise<string[]> {
		if (this.isInitialized) {
			return [this.config.modelPath];
		}
		return [];
	}
}

/**
 * D&D-specific system prompts for different scenarios
 */
export const DnDSystemPrompts = {
	DUNGEON_MASTER: `You are an experienced Dungeon Master running a D&D 5e campaign.
Your responses should be:
- Engaging and immersive
- Consistent with D&D 5e rules
- Appropriate for the current scene and character
- Include dice rolls when needed using [ROLL:XdY+Z] format
- Keep responses concise (1-3 sentences)
- Maintain narrative flow

Always respond in character as the DM.`,

	COMBAT_NARRATOR: `You are narrating combat in a D&D game.
- Describe actions vividly but concisely
- Include appropriate dice rolls
- Maintain tension and excitement
- Follow D&D 5e combat rules`,

	NPC_DIALOGUE: `You are roleplaying as an NPC in a D&D campaign.
- Stay in character based on the NPC's background
- Respond naturally to player interactions
- Provide quest information when appropriate
- Maintain consistent personality`,
};

/**
 * Recommended Gemma3 model configurations for D&D
 */
export const GemmaModelConfigs = {
	GEMMA_3_2B: {
		name: 'gemma-3-2b-instruct',
		maxTokens: 150,
		temperature: 0.7,
		description: 'Fast responses, good for real-time gameplay',
	},

	GEMMA_3_9B: {
		name: 'gemma-3-9b-instruct',
		maxTokens: 200,
		temperature: 0.8,
		description: 'Higher quality responses, slower inference',
	},
};
