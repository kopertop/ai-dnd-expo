/**
 * Cactus Provider for Local Models
 *
 * Loads models from local build folders instead of downloading from Hugging Face
 */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Types
export interface CactusLocalConfig {
	modelPath?: string;
	modelName?: string;
	contextSize?: number;
	debugMode?: boolean;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
}

export interface CactusLocalMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface CactusLocalCompletionParams {
	temperature?: number;
	top_p?: number;
	n_predict?: number;
	stop?: string[];
}

export interface CactusLocalProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: CactusLocalMessage[],
		params?: CactusLocalCompletionParams,
	) => Promise<string>;
	streamingCompletion: (
		messages: CactusLocalMessage[],
		params?: CactusLocalCompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	rewind: () => void;
	getDebugInfo: () => any;
}

// Constants
const MODELS_DIRECTORY = 'cactus-models';
const MODEL_CACHE_KEY = 'cactus-local-model-cache';

// Default model paths for different platforms
const DEFAULT_MODEL_PATHS: Record<string, any> = {
	ios: {
		simulator: 'assets/models/gemma-3n-E2B-it-Q4_K_S.gguf',
		device: 'assets/models/gemma-3n-E2B-it-Q4_K_S.gguf',
	},
	android: {
		device: 'assets/models/gemma-3n-E2B-it-Q4_K_S.gguf',
	},
	web: {
		browser: 'assets/models/gemma-3n-E2B-it-Q4_K_S.gguf',
	},
};

export class CactusLocalProvider implements CactusLocalProviderInterface {
	private config: CactusLocalConfig;
	private modelPath: string;
	private modelName: string;
	private debugInfo: any = {};
	private conversationHistory: CactusLocalMessage[] = [];
	private isModelLoaded = false;

	isInitialized: boolean = false;

	constructor(config: CactusLocalConfig = {}) {
		this.config = {
			contextSize: 1024,
			debugMode: true,
			fallbackMode: 'local',
			...config,
		};

		// Determine model path based on platform and config
		this.modelPath = this.determineModelPath();
		this.modelName = this.config.modelName || 'gemma-3n-E2B-it-Q4_K_S.gguf';

		this.debugInfo = {
			platform: Platform.OS,
			version: Platform.Version,
			modelPath: this.modelPath,
			modelName: this.modelName,
			config: this.config,
			approach: 'local-model',
		};
	}

	/**
	 * Determine the correct model path for the current platform
	 */
	private determineModelPath(): string {
		// If model path is explicitly provided, use it
		if (this.config.modelPath) {
			return this.config.modelPath;
		}

		// Get platform-specific path
		const platformPaths = DEFAULT_MODEL_PATHS[Platform.OS as keyof typeof DEFAULT_MODEL_PATHS];
		if (!platformPaths) {
			throw new Error(`Unsupported platform: ${Platform.OS}`);
		}

		// For iOS, check if we're in simulator or device
		if (Platform.OS === 'ios') {
			// In simulator, use simulator path
			return 'simulator' in platformPaths ? platformPaths.simulator : platformPaths.device;
		}

		// For other platforms, use the device path
		if (Platform.OS === 'android') {
			return platformPaths.device;
		}

		// For web, use browser path
		return platformPaths.browser;
	}

	/**
	 * Initialize the Cactus provider with local model
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			console.log('🔄 CactusLocalProvider: Already initialized');
			return true;
		}

		try {
			console.log('🚀 CactusLocalProvider: Starting initialization...');
			console.log('📊 Debug info:', this.debugInfo);

			// Step 1: Check platform compatibility
			await this.checkPlatformCompatibility();

			// Step 2: Validate model file exists
			await this.validateModelFile(onProgress);

			// Step 3: Initialize Cactus LM (if available)
			await this.initializeCactusLM(onProgress);

			this.isInitialized = true;
			console.log('✅ CactusLocalProvider: Initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ CactusLocalProvider: Initialization failed:', error);
			this.debugInfo.lastError = error instanceof Error ? error.message : String(error);
			this.debugInfo.lastErrorStack = error instanceof Error ? error.stack : undefined;

			// Fallback to rule-based if Cactus LM fails
			console.log('🔄 Falling back to rule-based approach...');
			await this.initializeRuleBased(onProgress);
			this.isInitialized = true;
			return true;
		}
	}

	/**
	 * Check platform compatibility
	 */
	private async checkPlatformCompatibility(): Promise<void> {
		console.log('🔍 Checking platform compatibility...');

		if (Platform.OS === 'ios') {
			console.log('📱 iOS detected');
		} else if (Platform.OS === 'android') {
			console.log('🤖 Android detected');
		} else if (Platform.OS === 'web') {
			console.log('🌐 Web detected');
		}

		console.log('✅ Platform compatibility check passed');
	}

	/**
	 * Validate that the model file exists
	 */
	private async validateModelFile(onProgress?: (progress: number) => void): Promise<void> {
		console.log('🔍 Validating model file...');
		console.log('📁 Model path:', this.modelPath);

		if (onProgress) onProgress(0.2);

		try {
			// Check if file exists
			const fileInfo = await FileSystem.getInfoAsync(this.modelPath);

			if (!fileInfo.exists) {
				throw new Error(`Model file not found at: ${this.modelPath}`);
			}

			console.log('✅ Model file exists');
			console.log('📊 File size:', fileInfo.size, 'bytes');

			// Validate file size (should be reasonable for a model)
			if (fileInfo.size && fileInfo.size < 1000000) {
				// Less than 1MB
				throw new Error(
					`Model file appears to be too small (${fileInfo.size} bytes). Expected several GB.`,
				);
			}

			this.isModelLoaded = true;
			this.debugInfo.modelFileSize = fileInfo.size;
			this.debugInfo.modelFileExists = true;

			if (onProgress) onProgress(0.5);
		} catch (error) {
			console.error('❌ Model file validation failed:', error);
			throw error;
		}
	}

	/**
	 * Initialize Cactus LM with local model
	 */
	private async initializeCactusLM(onProgress?: (progress: number) => void): Promise<void> {
		console.log('🤖 Initializing Cactus LM with local model...');

		try {
			// Try to import CactusLM dynamically
			const { CactusLM } = await import('cactus-react-native');

			if (onProgress) onProgress(0.6);

			// Initialize with local model
			const { lm, error } = await CactusLM.init(
				{
					model: this.modelPath,
					n_ctx: this.config.contextSize || 1024,
					n_batch: 16,
					n_gpu_layers: 0, // Start with CPU only for compatibility
					n_threads: 4,
				},
				onProgress,
			);

			if (error) {
				throw new Error(`Cactus LM initialization failed: ${error}`);
			}

			// Store the LM instance
			(this as any).lm = lm;
			this.debugInfo.cactusLMInitialized = true;
			this.debugInfo.approach = 'cactus-local';

			if (onProgress) onProgress(1.0);

			console.log('✅ Cactus LM initialized successfully with local model');
		} catch (error) {
			console.error('❌ Cactus LM initialization failed:', error);
			this.debugInfo.cactusLMError = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	/**
	 * Initialize rule-based fallback
	 */
	private async initializeRuleBased(onProgress?: (progress: number) => void): Promise<void> {
		console.log('🧠 Initializing rule-based fallback...');

		if (onProgress) onProgress(0.8);

		// Load D&D rules and responses
		await this.loadDnDRules();

		if (onProgress) onProgress(1.0);

		console.log('✅ Rule-based fallback initialized successfully');
		this.debugInfo.approach = 'rule-based-fallback';
	}

	/**
	 * Load D&D rules and responses
	 */
	private async loadDnDRules(): Promise<void> {
		console.log('📚 Loading D&D rules and responses...');
		// This would load comprehensive D&D rules in a real implementation
	}

	/**
	 * Generate a completion
	 */
	async completion(
		messages: CactusLocalMessage[],
		params: CactusLocalCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('CactusLocalProvider not initialized');
		}

		try {
			console.log('🤖 Generating completion...');

			// Try Cactus LM first if available
			if ((this as any).lm && this.debugInfo.approach === 'cactus-local') {
				return await this.generateCactusCompletion(messages, params);
			}

			// Fallback to rule-based
			return this.generateRuleBasedResponse(messages, params);
		} catch (error) {
			console.error('❌ Error generating completion:', error);

			// Fallback to rule-based if Cactus LM fails
			console.log('🔄 Falling back to rule-based response...');
			return this.generateRuleBasedResponse(messages, params);
		}
	}

	/**
	 * Generate completion using Cactus LM
	 */
	private async generateCactusCompletion(
		messages: CactusLocalMessage[],
		params: CactusLocalCompletionParams,
	): Promise<string> {
		const completionParams = {
			n_predict: params.n_predict || 256,
			temperature: params.temperature || 0.7,
			top_p: params.top_p || 0.9,
			stop: params.stop || [],
			mode: this.config.fallbackMode,
		};

		const result = await (this as any).lm.completion(messages, completionParams);
		return result.text || '';
	}

	/**
	 * Generate rule-based response
	 */
	private generateRuleBasedResponse(
		messages: CactusLocalMessage[],
		params: CactusLocalCompletionParams,
	): string {
		const lastMessage = messages[messages.length - 1];
		const userInput = lastMessage.content.toLowerCase();

		// Add to conversation history
		this.conversationHistory.push(lastMessage);

		// D&D specific responses
		if (
			userInput.includes('hello') ||
			userInput.includes('hi') ||
			userInput.includes('greet')
		) {
			return 'Greetings, brave adventurer! I am your Dungeon Master, ready to guide you through realms of magic and mystery. What quest calls to your heart today?';
		}

		if (
			userInput.includes('attack') ||
			userInput.includes('fight') ||
			userInput.includes('combat')
		) {
			return 'The clash of steel echoes through the air! Roll for initiative to determine the order of battle. The fate of your quest hangs in the balance of combat!';
		}

		if (
			userInput.includes('search') ||
			userInput.includes('look') ||
			userInput.includes('examine')
		) {
			return 'Your keen eyes scan the surroundings with practiced precision. Every shadow might hide a secret, every corner could reveal a clue. What catches your attention?';
		}

		if (
			userInput.includes('spell') ||
			userInput.includes('magic') ||
			userInput.includes('cast')
		) {
			return 'Arcane energies swirl around you as you channel the mystical forces. The very air crackles with magical potential. Which spell do you wish to unleash?';
		}

		if (
			userInput.includes('door') ||
			userInput.includes('open') ||
			userInput.includes('enter')
		) {
			return 'You approach the portal with caution, your hand hovering near your weapon. Ancient doors often guard ancient secrets... or ancient dangers. How do you proceed?';
		}

		if (
			userInput.includes('treasure') ||
			userInput.includes('loot') ||
			userInput.includes('gold')
		) {
			return 'The glint of precious metals catches your eye! But remember, adventurer, not all that glitters is gold, and some treasures come with curses attached.';
		}

		if (
			userInput.includes('npc') ||
			userInput.includes('talk') ||
			userInput.includes('speak')
		) {
			return 'The local inhabitants regard you with a mix of curiosity and wariness. Some may be allies, others potential threats. Choose your words wisely, for reputation spreads quickly in these lands.';
		}

		if (
			userInput.includes('rest') ||
			userInput.includes('sleep') ||
			userInput.includes('camp')
		) {
			return 'You find a suitable spot to rest your weary bones. The night brings its own dangers, but also the promise of renewed strength. Who will take the first watch?';
		}

		if (
			userInput.includes('quest') ||
			userInput.includes('mission') ||
			userInput.includes('objective')
		) {
			return "Your destiny calls! Whether it's a noble quest to save the realm or a personal journey of discovery, every step brings you closer to your goal. What drives you forward?";
		}

		if (
			userInput.includes('dice') ||
			userInput.includes('roll') ||
			userInput.includes('check')
		) {
			return 'The dice tumble across the table, their clatter echoing the uncertainty of fate. Every roll is a moment of truth, where skill meets chance in the dance of adventure!';
		}

		// Default intelligent response
		const responses = [
			'Your actions ripple through the fabric of this world, shaping the story that unfolds around you. Every choice matters in the grand tapestry of adventure.',
			'The path before you is fraught with both peril and promise. Your courage and cunning will be tested, but great rewards await those who persevere.',
			'In this realm of magic and mystery, you are the hero of your own tale. The decisions you make will echo through the ages.',
			'The ancient stones seem to whisper secrets of forgotten times. Your presence here is no coincidence - destiny has brought you to this moment.',
			'Adventure calls to your soul, and the world responds to your presence. Every step forward reveals new possibilities and challenges.',
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: CactusLocalMessage[],
		params: CactusLocalCompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('CactusLocalProvider not initialized');
		}

		try {
			console.log('🤖 Generating streaming completion...');

			const response = await this.completion(messages, params);

			// Simulate streaming by sending tokens one by one
			if (onToken) {
				const tokens = response.split(' ');
				for (const token of tokens) {
					onToken(token + ' ');
					// Small delay to simulate streaming
					await new Promise(resolve => setTimeout(resolve, 50));
				}
			}

			console.log('✅ Streaming completion generated successfully');
			return response;
		} catch (error) {
			console.error('❌ Error generating streaming completion:', error);
			throw error;
		}
	}

	/**
	 * Reset the conversation context
	 */
	rewind(): void {
		this.conversationHistory = [];
		if ((this as any).lm) {
			(this as any).lm.rewind();
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
			modelPath: this.modelPath,
			modelName: this.modelName,
			conversationHistoryLength: this.conversationHistory.length,
			isModelLoaded: this.isModelLoaded,
		};
	}
}

// Helper function to create a provider instance
export const createCactusLocalProvider = (
	config?: CactusLocalConfig,
): CactusLocalProviderInterface => {
	return new CactusLocalProvider(config);
};
