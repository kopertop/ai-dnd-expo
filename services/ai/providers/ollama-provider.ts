/**
 * Ollama Provider for AI D&D Platform
 * 
 * Web-safe provider that uses Ollama API for AI inference
 * Supports both streaming and non-streaming completions
 */

import { OllamaClient, OllamaMessage, OllamaCompletionParams } from '@/services/api/ollama-client';

export interface OllamaProviderConfig {
	baseUrl?: string;
	defaultModel?: string;
	timeout?: number;
}

export interface OllamaProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: OllamaMessage[],
		params?: OllamaCompletionParams,
	) => Promise<string>;
	streamingCompletion: (
		messages: OllamaMessage[],
		params?: OllamaCompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	healthCheck: () => Promise<boolean>;
	rewind: () => void;
}

export class OllamaProvider implements OllamaProviderInterface {
	private client: OllamaClient;
	private config: OllamaProviderConfig;
	private conversationHistory: OllamaMessage[] = [];

	isInitialized: boolean = false;

	constructor(config: OllamaProviderConfig = {}) {
		this.config = config;
		this.client = new OllamaClient({
			baseUrl: config.baseUrl,
			defaultModel: config.defaultModel,
			timeout: config.timeout,
		});
	}

	/**
	 * Initialize the Ollama provider
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			return true;
		}

		try {
			if (onProgress) onProgress(0.3);

			// Check if Ollama is available
			const isHealthy = await this.client.healthCheck();
			
			if (onProgress) onProgress(0.7);

			if (!isHealthy) {
				console.warn('Ollama server is not available');
				// Still mark as initialized to allow fallback
				this.isInitialized = true;
				return false;
			}

			if (onProgress) onProgress(1.0);

			this.isInitialized = true;
			console.log('✅ Ollama provider initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ Failed to initialize Ollama provider:', error);
			this.isInitialized = true; // Mark as initialized to allow fallback
			return false;
		}
	}

	/**
	 * Generate a completion
	 */
	async completion(
		messages: OllamaMessage[],
		params: OllamaCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('Ollama provider not initialized');
		}

		try {
			const response = await this.client.completion(messages, params);
			
			// Add to conversation history
			if (messages.length > 0) {
				this.conversationHistory.push(...messages);
			}
			if (response) {
				this.conversationHistory.push({
					role: 'assistant',
					content: response,
				});
			}

			return response;
		} catch (error) {
			console.error('❌ Ollama completion failed:', error);
			throw error;
		}
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: OllamaMessage[],
		params: OllamaCompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('Ollama provider not initialized');
		}

		try {
			const response = await this.client.streamingCompletion(messages, params, onToken);
			
			// Add to conversation history
			if (messages.length > 0) {
				this.conversationHistory.push(...messages);
			}
			if (response) {
				this.conversationHistory.push({
					role: 'assistant',
					content: response,
				});
			}

			return response;
		} catch (error) {
			console.error('❌ Ollama streaming completion failed:', error);
			throw error;
		}
	}

	/**
	 * Check if provider is healthy
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.isInitialized) {
			return false;
		}

		try {
			return await this.client.healthCheck();
		} catch {
			return false;
		}
	}

	/**
	 * Reset conversation context
	 */
	rewind(): void {
		this.conversationHistory = [];
		console.log('🔄 Ollama conversation context reset');
	}
}

// Helper function to create a provider instance
export const createOllamaProvider = (config?: OllamaProviderConfig): OllamaProviderInterface => {
	return new OllamaProvider(config);
};

