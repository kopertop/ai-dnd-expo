/**
 * Platform-Aware AI Provider Factory
 * 
 * Dynamically loads the appropriate AI provider based on platform
 * Web: Uses Ollama provider
 * Native: Falls back to lightweight rule-based provider
 */

import { Platform } from 'react-native';
import { createOllamaProvider, OllamaProviderInterface } from './ollama-provider';
import { AIMessage, AICompletionParams } from '@/types/ai';

export interface PlatformAwareProviderConfig {
	// Ollama config (web)
	ollamaBaseUrl?: string;
	ollamaModel?: string;
	ollamaTimeout?: number;
}

export interface PlatformAwareProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: AIMessage[],
		params?: AICompletionParams,
	) => Promise<string>;
	streamingCompletion: (
		messages: AIMessage[],
		params?: AICompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	healthCheck: () => Promise<boolean>;
	rewind: () => void;
	getProviderType: () => 'ollama' | 'local' | 'fallback';
}

export class PlatformAwareProvider implements PlatformAwareProviderInterface {
	private provider: OllamaProviderInterface | any = null;
	private providerType: 'ollama' | 'local' | 'fallback' = 'fallback';
	private config: PlatformAwareProviderConfig;

	isInitialized: boolean = false;

	constructor(config: PlatformAwareProviderConfig = {}) {
		this.config = config;
		this.initializeProvider();
	}

	/**
	 * Initialize the appropriate provider based on platform
	 */
	private async initializeProvider(): Promise<void> {
		if (Platform.OS === 'web') {
			// Web platform: Use Ollama
			this.provider = createOllamaProvider({
				baseUrl: this.config.ollamaBaseUrl,
				defaultModel: this.config.ollamaModel || 'llama3.2',
				timeout: this.config.ollamaTimeout || 30000,
			});
			this.providerType = 'ollama';
		} else {
			// Native platform (and default): use fallback provider
			this.provider = this.createFallbackProvider();
			this.providerType = 'fallback';
		}
	}

	/**
	 * Create a fallback rule-based provider
	 */
	private createFallbackProvider(): any {
		return {
			isInitialized: true,
			initialize: async () => true,
			completion: async (messages: AIMessage[]) => {
				return this.generateFallbackResponse(messages);
			},
			streamingCompletion: async (messages: AIMessage[], params?: any, onToken?: (token: string) => void) => {
				const response = this.generateFallbackResponse(messages);
				if (onToken) {
					// Simulate streaming
					for (const word of response.split(' ')) {
						onToken(word + ' ');
						await new Promise(resolve => setTimeout(resolve, 50));
					}
				}
				return response;
			},
			healthCheck: async () => true,
			rewind: () => {},
		};
	}

	/**
	 * Generate fallback response
	 */
	private generateFallbackResponse(messages: AIMessage[]): string {
		const lastMessage = messages[messages.length - 1];
		const userInput = lastMessage.content.toLowerCase();

		// D&D specific responses
		if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('greet')) {
			return 'Greetings, brave adventurer! I am your Dungeon Master, ready to guide you through realms of magic and mystery. What quest calls to your heart today?';
		}

		if (userInput.includes('attack') || userInput.includes('fight') || userInput.includes('combat')) {
			return 'The clash of steel echoes through the air! Roll for initiative to determine the order of battle. The fate of your quest hangs in the balance of combat!';
		}

		if (userInput.includes('search') || userInput.includes('look') || userInput.includes('examine')) {
			return 'Your keen eyes scan the surroundings with practiced precision. Every shadow might hide a secret, every corner could reveal a clue. What catches your attention?';
		}

		// Default intelligent response
		const responses = [
			'Your actions ripple through the fabric of this world, shaping the story that unfolds around you. Every choice matters in the grand tapestry of adventure.',
			'The path before you is fraught with both peril and promise. Your courage and cunning will be tested, but great rewards await those who persevere.',
			'In this realm of magic and mystery, you are the hero of your own tale. The decisions you make will echo through the ages.',
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	/**
	 * Initialize the provider
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (!this.provider) {
			await this.initializeProvider();
		}

		if (this.provider && typeof this.provider.initialize === 'function') {
			const result = await this.provider.initialize(onProgress);
			this.isInitialized = result;
			return result;
		}

		this.isInitialized = true;
		return true;
	}

	/**
	 * Generate a completion
	 */
	async completion(
		messages: AIMessage[],
		params?: AICompletionParams,
	): Promise<string> {
		if (!this.provider) {
			await this.initializeProvider();
		}

		if (!this.provider || !this.isInitialized) {
			throw new Error('Provider not initialized');
		}

		return await this.provider.completion(messages, params);
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: AIMessage[],
		params?: AICompletionParams,
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.provider) {
			await this.initializeProvider();
		}

		if (!this.provider || !this.isInitialized) {
			throw new Error('Provider not initialized');
		}

		return await this.provider.streamingCompletion(messages, params, onToken);
	}

	/**
	 * Check provider health
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.provider) {
			return false;
		}

		if (typeof this.provider.healthCheck === 'function') {
			return await this.provider.healthCheck();
		}

		return this.isInitialized;
	}

	/**
	 * Reset conversation context
	 */
	rewind(): void {
		if (this.provider && typeof this.provider.rewind === 'function') {
			this.provider.rewind();
		}
	}

	/**
	 * Get the current provider type
	 */
	getProviderType(): 'ollama' | 'local' | 'fallback' {
		return this.providerType;
	}
}

// Helper function to create a platform-aware provider
export const createPlatformAwareProvider = (
	config?: PlatformAwareProviderConfig,
): PlatformAwareProviderInterface => {
	return new PlatformAwareProvider(config);
};

