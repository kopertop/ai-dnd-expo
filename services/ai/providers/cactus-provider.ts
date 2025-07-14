/**
 * Cactus Compute Provider for AI D&D Platform
 *
 * Integrates with Cactus distributed compute network for running Gemma3 models
 * https://github.com/cactus-compute/cactus
 */

import { CactusClient, InferenceRequest, InferenceResponse, ModelConfig } from '@cactus-compute/client';

export interface CactusConfig {
	apiKey: string;
	endpoint?: string;
	modelName: string;
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
}

export interface DnDInferenceRequest extends InferenceRequest {
	context: {
		playerName: string;
		playerClass: string;
		playerRace: string;
		currentScene: string;
		gameHistory: string[];
	};
	systemPrompt: string;
}

export class CactusAIProvider {
	private client: CactusClient;
	private config: CactusConfig;

	constructor(config: CactusConfig) {
		this.config = config;
		this.client = new CactusClient({
			apiKey: config.apiKey,
			endpoint: config.endpoint || 'https://api.cactus-compute.com',
		});
	}

	/**
	 * Generate D&D response using Gemma3 via Cactus network
	 */
	async generateDnDResponse(request: DnDInferenceRequest): Promise<InferenceResponse> {
		const modelConfig: ModelConfig = {
			name: this.config.modelName,
			parameters: {
				max_tokens: this.config.maxTokens || 150,
				temperature: this.config.temperature || 0.7,
				top_p: 0.9,
				stop_sequences: ['[END]', '\n\nPlayer:', '\n\nDM:'],
			},
		};

		const prompt = this.buildDnDPrompt(request);

		try {
			const response = await this.client.inference({
				model: modelConfig,
				prompt,
				context: request.context,
				timeout: this.config.timeout || 30000,
			});

			return this.processDnDResponse(response);
		} catch (error: any) {
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
	private processDnDResponse(response: InferenceResponse): InferenceResponse {
		let text = response.text.trim();

		// Clean up common artifacts
		text = text.replace(/^DM:\s*/i, '');
		text = text.replace(/^\*.*?\*\s*/, ''); // Remove action descriptions

		// Parse tool commands
		const toolCommands = this.extractToolCommands(text);
		text = this.removeToolCommands(text);

		return {
			...response,
			text,
			metadata: {
				...response.metadata,
				toolCommands,
				processingTime: response.metadata?.processingTime || 0,
			},
		};
	}

	/**
	 * Extract D&D tool commands like [ROLL:1d20+3]
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			commands.push({
				type: match[1].toLowerCase(),
				params: match[2],
			});
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
	 * Check if Cactus service is available
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.health();
			return response.status === 'healthy';
		} catch {
			return false;
		}
	}

	/**
	 * Get available models on Cactus network
	 */
	async getAvailableModels(): Promise<string[]> {
		try {
			const models = await this.client.listModels();
			return models.filter(model => model.includes('gemma'));
		} catch (error) {
			console.error('Failed to fetch available models:', error);
			return [];
		}
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