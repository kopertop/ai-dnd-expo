/**
 * Simple Cactus DM Agent for AI D&D Platform
 *
 * Provides D&D gameplay assistance using Cactus Compute's LLM
 */
import { CactusMessage, CactusProviderSimple, createCactusProviderSimple } from '../providers/cactus-provider-simple';


// Core interfaces
export interface DMResponse {
	text: string;
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
}

export interface DMConfig {
	modelUrl?: string;
	apiKey?: string;
}

export interface GameContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
}

/**
 * Simple DM Agent implementation
 */
export class CactusDMAgentSimple {
	private provider: CactusProviderSimple;
	private isInitialized = false;

	constructor(config: DMConfig = {}) {
		this.provider = createCactusProviderSimple(config.modelUrl, config.apiKey);
	}

	/**
	 * Initialize the DM Agent
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		try {
			const success = await this.provider.initialize(onProgress);
			this.isInitialized = success;
			return success;
		} catch (error) {
			console.error('Failed to initialize DM agent:', error);
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
				throw new Error('DM agent not initialized');
			}

			// Prepare context for the LLM
			const messages = this.prepareMessagesForAction(action, context);

			// Generate response using Cactus LLM
			const response = await this.provider.completion(messages, {
				temperature: 0.7,
				n_predict: 512,
			});

			// Process the response
			const { text, toolCommands } = this.processResponse(response);

			return {
				text,
				toolCommands,
				processingTime: Date.now() - startTime,
			};
		} catch (error) {
			console.error('Failed to process player action:', error);
			return {
				text: "I'm having trouble processing that action. Could you try something else?",
				toolCommands: [],
				processingTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Generate narrative content for scenes
	 */
	async generateNarration(scene: string, context: GameContext): Promise<string> {
		try {
			if (!this.isInitialized) {
				throw new Error('DM agent not initialized');
			}

			// Prepare context for the LLM
			const messages = this.prepareMessagesForNarration(scene, context);

			// Generate narration using Cactus LLM
			const narration = await this.provider.completion(messages, {
				temperature: 0.7,
				n_predict: 256,
			});

			return narration;
		} catch (error) {
			console.error('Failed to generate narration:', error);
			return `You find yourself in ${scene}. What would you like to do?`;
		}
	}

	/**
	 * Check if the agent is initialized
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Clean up resources
	 */
	cleanup(): void {
		if (this.isInitialized) {
			this.provider.rewind();
		}
	}

	// Private helper methods

	/**
	 * Prepare messages for player action processing
	 */
	private prepareMessagesForAction(action: string, context: GameContext): CactusMessage[] {
		const { playerName, playerClass, playerRace, currentScene } = context;

		// Create system prompt
		const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to respond to player actions in a D&D game, maintaining narrative consistency and applying game rules correctly.
Provide engaging, descriptive responses that advance the story and create an immersive experience.

Game Context:
- Player Character: ${playerName}, a ${playerRace} ${playerClass}
- Current Scene: ${currentScene}

When appropriate, include tool commands in your response using the following format:
- [ROLL:1d20+5] for dice rolls
- [DAMAGE:2d6+3] for damage calculations
- [HEAL:1d8+2] for healing

Keep your responses concise, engaging, and true to D&D 5e rules.`;

		// Create conversation history
		const messages: CactusMessage[] = [
			{ role: 'system', content: systemPrompt },
		];

		// Add recent conversation history if available
		if (context.gameHistory && context.gameHistory.length > 0) {
			// Add up to 3 recent conversation turns for context
			const recentHistory = context.gameHistory.slice(-6);
			for (let i = 0; i < recentHistory.length; i++) {
				const role = i % 2 === 0 ? 'user' : 'assistant';
				messages.push({ role, content: recentHistory[i] });
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
		const { playerName, playerClass, playerRace } = context;

		// Create system prompt
		const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to create vivid, engaging scene descriptions for a D&D game.
Focus on creating an immersive atmosphere that sets the stage for adventure.

Scene Context:
- Player Character: ${playerName}, a ${playerRace} ${playerClass}
- Location: ${scene}

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
	private processResponse(response: string): {
		text: string;
		toolCommands: Array<{ type: string; params: string }>;
	} {
		// Extract tool commands
		const toolCommands = this.extractToolCommands(response);

		// Clean text by removing tool commands
		const text = this.removeToolCommands(response);

		return {
			text,
			toolCommands,
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
}

// Helper function to create a DM Agent instance
export const createCactusDMAgentSimple = (config?: DMConfig) => {
	return new CactusDMAgentSimple(config);
};
