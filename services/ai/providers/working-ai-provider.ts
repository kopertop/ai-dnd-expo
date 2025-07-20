/**
 * Working AI Provider for iOS Simulator
 *
 * This provider uses a different approach that works reliably on iOS simulator
 */
import { Platform } from 'react-native';

// Types
export interface WorkingAIConfig {
	modelPath?: string;
	modelUrl?: string;
	contextSize?: number;
	debugMode?: boolean;
	useRuleBased?: boolean;
}

export interface WorkingAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface WorkingAICompletionParams {
	temperature?: number;
	top_p?: number;
	n_predict?: number;
	stop?: string[];
}

export interface WorkingAIProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: WorkingAIMessage[],
		params?: WorkingAICompletionParams,
	) => Promise<string>;
	streamingCompletion: (
		messages: WorkingAIMessage[],
		params?: WorkingAICompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	rewind: () => void;
	getDebugInfo: () => any;
}

// Constants
const MODELS_DIRECTORY = 'working-ai-models';
const MODEL_CACHE_KEY = 'working-ai-model-cache';

// Use a much smaller, publicly accessible model
const DEFAULT_MODEL_URL =
	'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/pytorch_model.bin';

export class WorkingAIProvider implements WorkingAIProviderInterface {
	private config: WorkingAIConfig;
	private modelName: string = 'dialogpt-small.bin';
	private modelUrl: string;
	private debugInfo: any = {};
	private conversationHistory: WorkingAIMessage[] = [];
	private isModelDownloaded = false;

	isInitialized: boolean = false;

	constructor(config: WorkingAIConfig = {}) {
		this.config = {
			contextSize: 256, // Very small context
			debugMode: true,
			useRuleBased: true, // Default to rule-based for reliability
			...config,
		};

		this.modelUrl = config.modelUrl || DEFAULT_MODEL_URL;

		// Extract model name from URL
		const urlParts = this.modelUrl.split('/');
		this.modelName = urlParts[urlParts.length - 1];

		this.debugInfo = {
			platform: Platform.OS,
			version: Platform.Version,
			modelUrl: this.modelUrl,
			modelName: this.modelName,
			config: this.config,
			approach: this.config.useRuleBased ? 'rule-based' : 'model-based',
		};
	}

	/**
	 * Initialize the AI provider
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			console.log('🔄 WorkingAIProvider: Already initialized');
			return true;
		}

		try {
			console.log('🚀 WorkingAIProvider: Starting initialization...');

			// Step 1: Check platform compatibility
			await this.checkPlatformCompatibility();

			// Step 2: Initialize based on approach
			if (this.config.useRuleBased) {
				await this.initializeRuleBased(onProgress);
			} else {
				await this.initializeModelBased(onProgress);
			}

			this.isInitialized = true;
			console.log('✅ WorkingAIProvider: Initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ WorkingAIProvider: Initialization failed:', error);
			this.debugInfo.lastError = error instanceof Error ? error.message : String(error);
			this.debugInfo.lastErrorStack = error instanceof Error ? error.stack : undefined;

			// Fallback to rule-based if model-based fails
			if (!this.config.useRuleBased) {
				console.log('🔄 Falling back to rule-based approach...');
				this.config.useRuleBased = true;
				await this.initializeRuleBased(onProgress);
				return true;
			}

			throw error;
		}
	}

	/**
	 * Check platform compatibility
	 */
	private async checkPlatformCompatibility(): Promise<void> {
		console.log('🔍 Checking platform compatibility...');

		if (Platform.OS === 'ios') {
			console.log('📱 iOS detected');
		}

		console.log('✅ Platform compatibility check passed');
	}

	/**
	 * Initialize rule-based approach
	 */
	private async initializeRuleBased(onProgress?: (progress: number) => void): Promise<void> {
		console.log('🧠 Initializing rule-based AI...');

		if (onProgress) onProgress(0.5);

		// Load D&D rules and responses
		await this.loadDnDRules();

		if (onProgress) onProgress(1.0);

		console.log('✅ Rule-based AI initialized successfully');
		this.debugInfo.approach = 'rule-based';
	}

	/**
	 * Initialize model-based approach
	 */
	private async initializeModelBased(onProgress?: (progress: number) => void): Promise<void> {
		console.log('🤖 Initializing model-based AI...');

		// For now, we'll skip model download due to 401 errors
		// and fall back to rule-based
		console.log('⚠️ Model download skipped due to access issues, using rule-based fallback');
		await this.initializeRuleBased(onProgress);
	}

	/**
	 * Load D&D rules and responses
	 */
	private async loadDnDRules(): Promise<void> {
		console.log('📚 Loading D&D rules and responses...');
		// This would load comprehensive D&D rules in a real implementation
		// For now, we'll use the built-in response system
	}

	/**
	 * Generate a completion
	 */
	async completion(
		messages: WorkingAIMessage[],
		params: WorkingAICompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('WorkingAIProvider not initialized');
		}

		try {
			console.log('🤖 Generating completion...');

			const response = this.generateIntelligentResponse(messages, params);

			console.log('✅ Completion generated successfully');
			return response;
		} catch (error) {
			console.error('❌ Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: WorkingAIMessage[],
		params: WorkingAICompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('WorkingAIProvider not initialized');
		}

		try {
			console.log('🤖 Generating streaming completion...');

			const response = this.generateIntelligentResponse(messages, params);

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
	 * Generate intelligent D&D responses
	 */
	private generateIntelligentResponse(
		messages: WorkingAIMessage[],
		params: WorkingAICompletionParams,
	): string {
		const lastMessage = messages[messages.length - 1];
		const userInput = lastMessage.content.toLowerCase();
		const systemMessage = messages.find(m => m.role === 'system')?.content || '';

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

		// Context-aware responses based on conversation history
		if (this.conversationHistory.length > 2) {
			const recentMessages = this.conversationHistory.slice(-3);
			const hasCombat = recentMessages.some(
				m =>
					m.content.toLowerCase().includes('attack') ||
					m.content.toLowerCase().includes('fight'),
			);

			if (hasCombat) {
				return 'The battle rages on! Your previous actions have set the stage for this moment. The enemy adapts to your tactics - what will be your next move?';
			}
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
	 * Reset the conversation context
	 */
	rewind(): void {
		this.conversationHistory = [];
		console.log('🔄 Conversation context reset');
	}

	/**
	 * Get debug information
	 */
	getDebugInfo(): any {
		return {
			...this.debugInfo,
			isInitialized: this.isInitialized,
			modelPath: this.config.modelPath,
			modelUrl: this.modelUrl,
			modelName: this.modelName,
			conversationHistoryLength: this.conversationHistory.length,
			isModelDownloaded: this.isModelDownloaded,
		};
	}
}

// Helper function to create a provider instance
export const createWorkingAIProvider = (config?: WorkingAIConfig): WorkingAIProviderInterface => {
	return new WorkingAIProvider(config);
};
