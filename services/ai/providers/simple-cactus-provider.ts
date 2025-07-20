/**
 * Simple Cactus Provider
 *
 * Follows the official Cactus documentation exactly
 */
import { CactusLM } from 'cactus-react-native';

// Types
export interface SimpleCactusConfig {
	modelPath?: string;
	contextSize?: number;
	debugMode?: boolean;
}

export interface SimpleCactusMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface SimpleCactusCompletionParams {
	maxTokens?: number;
	temperature?: number;
}

export interface SimpleCactusProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: SimpleCactusMessage[],
		params?: SimpleCactusCompletionParams,
	) => Promise<string>;
	rewind: () => void;
	getDebugInfo: () => any;
}

export class SimpleCactusProvider implements SimpleCactusProviderInterface {
	private config: SimpleCactusConfig;
	private lm: any = null;
	private debugInfo: any = {};

	isInitialized: boolean = false;

	constructor(config: SimpleCactusConfig = {}) {
		this.config = {
			contextSize: 2048,
			debugMode: true,
			...config,
		};

		this.debugInfo = {
			config: this.config,
			approach: 'simple-cactus',
		};
	}

	/**
	 * Initialize the Cactus LM following official documentation
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			console.log('🔄 SimpleCactusProvider: Already initialized');
			return true;
		}

		try {
			console.log('🚀 SimpleCactusProvider: Starting initialization...');
			console.log('📊 Config:', this.config);

			// Use the exact pattern from the documentation
			const modelPath = this.config.modelPath || 'assets/models/gemma-3n-E2B-it-Q4_K_S.gguf';

			console.log('📁 Using model path:', modelPath);

			// Initialize Cactus LM exactly as shown in documentation
			const result = await CactusLM.init(
				{
					model: modelPath,
					n_ctx: this.config.contextSize || 2048,
				},
				onProgress,
			);

			console.log('📊 CactusLM.init result:', result);

			if (result.error) {
				throw new Error(`Cactus LM initialization failed: ${result.error}`);
			}

			this.lm = result.lm;
			this.isInitialized = true;
			this.debugInfo.lmInitialized = true;
			this.debugInfo.modelPath = modelPath;

			console.log('✅ SimpleCactusProvider: Initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ SimpleCactusProvider: Initialization failed:', error);
			this.debugInfo.lastError = error instanceof Error ? error.message : String(error);
			this.debugInfo.lastErrorStack = error instanceof Error ? error.stack : undefined;
			throw error;
		}
	}

	/**
	 * Generate completion following official documentation
	 */
	async completion(
		messages: SimpleCactusMessage[],
		params: SimpleCactusCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('SimpleCactusProvider not initialized');
		}

		try {
			console.log('🤖 Generating completion...');
			console.log('📝 Messages:', messages);
			console.log('⚙️ Params:', params);

			// Use the exact pattern from the documentation
			const response = await this.lm.completion(messages, {
				n_predict: params.maxTokens || 100,
				temperature: params.temperature || 0.7,
			});

			console.log('📊 Completion response:', response);

			// Extract the text from the response
			const text = response.text || response.content || '';

			console.log('✅ Completion successful:', text);
			return text;
		} catch (error) {
			console.error('❌ Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Reset the conversation context
	 */
	rewind(): void {
		if (this.lm) {
			this.lm.rewind();
		}
		console.log('🔄 Conversation context reset');
	}

	/**
	 * Get debug information
	 */
	getDebugInfo(): any {
		return {
			...this.debugInfo,
			isInitialized: this.isInitialized,
			hasLM: !!this.lm,
			config: this.config,
		};
	}
}

// Helper function to create a provider instance
export const createSimpleCactusProvider = (
	config?: SimpleCactusConfig,
): SimpleCactusProviderInterface => {
	return new SimpleCactusProvider(config);
};
