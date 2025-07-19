/**
 * Cactus AI Provider for AI Service Manager
 *
 * This file provides compatibility with the existing AI Service Manager
 */

import { CactusMessage, CactusProvider } from './cactus-provider';

// System prompts for different roles
export const DnDSystemPrompts = {
	DUNGEON_MASTER: 'You are an expert Dungeons & Dragons Dungeon Master. Your task is to respond to player actions in a D&D game, maintaining narrative consistency and applying game rules correctly.',
	PLAYER_COMPANION: 'You are a helpful D&D player companion. Your task is to provide advice and suggestions to the player based on D&D rules and best practices.',
	RULES_ADVISOR: 'You are a D&D rules expert. Your task is to provide accurate information about D&D rules when asked.',
};

// Configuration interface
export interface CactusAIProviderConfig {
	modelPath: string;
	contextSize?: number;
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
}

// Response interface
export interface CactusAIResponse {
	text: string;
	metadata?: {
		toolCommands?: Array<{ type: string; params: string }>;
	};
}

/**
 * CactusAIProvider - Adapter for the AI Service Manager
 */
export class CactusAIProvider {
	private provider: CactusProvider;
	private config: CactusAIProviderConfig;

	constructor(config: CactusAIProviderConfig) {
		this.config = config;
		this.provider = new CactusProvider({
			modelPath: config.modelPath,
			contextSize: config.contextSize,
		});
	}

	/**
	 * Initialize the provider
	 */
	async initialize(): Promise<boolean> {
		try {
			await this.provider.initialize();
			return this.provider.isInitialized;
		} catch (error) {
			console.error('Failed to initialize CactusAIProvider:', error);
			return false;
		}
	}

	/**
	 * Generate D&D response
	 */
	async generateDnDResponse(params: {
		prompt: string;
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		};
		systemPrompt: string;
	}): Promise<CactusAIResponse> {
		if (!this.provider.isInitialized) {
			throw new Error('CactusAIProvider not initialized');
		}

		const { prompt, context, systemPrompt } = params;

		// Create messages for the provider
		const messages: CactusMessage[] = [
			{ role: 'system', content: systemPrompt },
		];

		// Add conversation history
		for (let i = 0; i < context.gameHistory.length; i++) {
			const role = i % 2 === 0 ? 'user' : 'assistant';
			messages.push({
				role: role as 'user' | 'assistant',
				content: context.gameHistory[i],
			});
		}

		// Add current prompt
		messages.push({ role: 'user', content: prompt });

		// Extract tool commands using regex
		const extractToolCommands = (text: string): Array<{ type: string; params: string }> => {
			const commands: Array<{ type: string; params: string }> = [];
			const regex = /\[(\w+):([^\]]+)\]/g;
			let match;

			while ((match = regex.exec(text)) !== null) {
				const type = match[1].toLowerCase();
				const params = match[2].trim();
				commands.push({ type, params });
			}

			return commands;
		};

		// Generate completion
		const text = await this.provider.completion(messages, {
			temperature: this.config.temperature || 0.7,
			n_predict: this.config.maxTokens || 150,
		});

		// Extract tool commands
		const toolCommands = extractToolCommands(text);

		return {
			text,
			metadata: {
				toolCommands,
			},
		};
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<boolean> {
		return this.provider.isInitialized;
	}
}
