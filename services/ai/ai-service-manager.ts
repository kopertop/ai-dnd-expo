/**
 * AI Service Manager for D&D Platform
 *
 * Manages multiple AI providers with fallback strategies
 * Integrates Cactus + Gemma3 as primary, with local fallbacks
 */

import { CactusAIProvider, DnDSystemPrompts, GemmaModelConfigs } from './providers/cactus-provider';
import { DefaultLocalDMConfig, LocalDMModelConfigs, LocalDMProvider } from './providers/local-dm-provider';

export interface AIServiceConfig {
	cactus: {
		apiKey: string;
		endpoint?: string;
		modelName: string;
	};
	local: {
		enabled: boolean;
		modelPath: string;
		powerSavingMode?: boolean;
	};
	fallback: {
		enabled: boolean;
		useLocalModel: boolean;
	};
	performance: {
		timeout: number;
		retryAttempts: number;
		cacheResponses: boolean;
	};
}

export interface AIResponse {
	text: string;
	confidence: number;
	source: 'cactus' | 'local' | 'fallback';
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
}

export class AIServiceManager {
	private cactusProvider: CactusAIProvider | null = null;
	private localDMProvider: LocalDMProvider | null = null;
	private config: AIServiceConfig;
	private responseCache = new Map<string, AIResponse>();
	private isHealthy = false;
	private isLocalReady = false;

	constructor(config: AIServiceConfig) {
		this.config = config;
		this.initializeCactusProvider();
		if (config.local.enabled) {
			this.initializeLocalDMProvider();
		}
	}

	/**
	 * Initialize Cactus provider with error handling
	 */
	private async initializeCactusProvider(): Promise<void> {
		try {
			this.cactusProvider = new CactusAIProvider({
				apiKey: this.config.cactus.apiKey,
				endpoint: this.config.cactus.endpoint,
				modelName: this.config.cactus.modelName,
				maxTokens: 150,
				temperature: 0.7,
				timeout: this.config.performance.timeout,
			});

			// Health check
			this.isHealthy = await this.cactusProvider.healthCheck();
			console.log(`🌵 Cactus provider initialized. Healthy: ${this.isHealthy}`);
		} catch (error) {
			console.error('Failed to initialize Cactus provider:', error);
			this.isHealthy = false;
		}
	}

	/**
	 * Initialize Local DM provider with error handling
	 * Requirement 1: Initialize local model with progress tracking
	 */
	private async initializeLocalDMProvider(): Promise<void> {
		try {
			this.localDMProvider = new LocalDMProvider({
				modelPath: this.config.local.modelPath,
				contextSize: 2048,
				maxTokens: 150,
				temperature: 0.7,
				enableResourceMonitoring: true,
				powerSavingMode: this.config.local.powerSavingMode || false,
			});

			// Initialize with progress callback
			this.isLocalReady = await this.localDMProvider.initialize((progress) => {
				console.log(`🤖 Local DM: ${progress.status}${progress.progress ? ` (${progress.progress}%)` : ''}`);
			});

			console.log(`🤖 Local DM provider initialized. Ready: ${this.isLocalReady}`);
		} catch (error) {
			console.error('Failed to initialize Local DM provider:', error);
			this.isLocalReady = false;
		}
	}

	/**
	 * Generate D&D response with intelligent fallback
	 */
	async generateDnDResponse(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
	): Promise<AIResponse> {
		const startTime = Date.now();
		const cacheKey = this.generateCacheKey(prompt, context);

		// Check cache first
		if (this.config.performance.cacheResponses && this.responseCache.has(cacheKey)) {
			const cached = this.responseCache.get(cacheKey)!;
			console.log('📦 Using cached response');
			return cached;
		}

		// Try Cactus + Gemma3 first (distributed)
		if (this.cactusProvider && this.isHealthy) {
			try {
				const response = await this.tryWithRetry(async () => {
					return await this.cactusProvider!.generateDnDResponse({
						prompt,
						context,
						systemPrompt: DnDSystemPrompts.DUNGEON_MASTER,
					});
				});

				const aiResponse: AIResponse = {
					text: response.text,
					confidence: 0.9,
					source: 'cactus',
					toolCommands: response.metadata?.toolCommands || [],
					processingTime: Date.now() - startTime,
				};

				this.cacheResponse(cacheKey, aiResponse);
				return aiResponse;
			} catch (error) {
				console.warn('🌵 Cactus provider failed, trying local AI:', error);
				this.isHealthy = false;
			}
		}

		// Try Local DM Provider second (on-device)
		if (this.localDMProvider && this.isLocalReady) {
			try {
				console.log('🤖 Using local DM provider');
				const localContext = {
					playerName: context.playerName,
					playerClass: context.playerClass,
					playerRace: context.playerRace,
					currentScene: context.currentScene,
					gameHistory: context.gameHistory,
				};

				const response = await this.localDMProvider.generateDnDResponse(
					prompt,
					localContext,
					this.config.performance.timeout,
				);

				const aiResponse: AIResponse = {
					text: response.text,
					confidence: response.confidence,
					source: 'local',
					toolCommands: response.toolCommands,
					processingTime: response.processingTime,
				};

				this.cacheResponse(cacheKey, aiResponse);
				return aiResponse;
			} catch (error) {
				console.warn('🤖 Local DM provider failed, falling back to rules:', error);
				this.isLocalReady = false;
			}
		}

		// Fallback to rule-based responses
		console.log('📋 Using fallback response system');
		const fallbackResponse = await this.generateFallbackResponse(prompt, context);

		const aiResponse: AIResponse = {
			text: fallbackResponse.text,
			confidence: 0.7,
			source: 'fallback',
			toolCommands: fallbackResponse.toolCommands,
			processingTime: Date.now() - startTime,
		};

		this.cacheResponse(cacheKey, aiResponse);
		return aiResponse;
	}

	/**
	 * Retry mechanism for network requests
	 */
	private async tryWithRetry<T>(operation: () => Promise<T>): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= this.config.performance.retryAttempts; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;
				if (attempt < this.config.performance.retryAttempts) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);

					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError!;
	}

	/**
	 * Enhanced fallback response system
	 */
	private async generateFallbackResponse(
		prompt: string,
		context: any,
	): Promise<{ text: string; toolCommands: Array<{ type: string; params: string }> }> {
		const lowercasePrompt = prompt.toLowerCase();
		const toolCommands: Array<{ type: string; params: string }> = [];

		// Combat scenarios
		if (lowercasePrompt.includes('attack') || lowercasePrompt.includes('hit')) {
			toolCommands.push({ type: 'roll', params: '1d20+5' });
			return {
				text: `You swing your weapon with determination! The ${this.getRandomEnemy()} braces for impact.`,
				toolCommands,
			};
		}

		// Skill checks
		if (lowercasePrompt.includes('check') || lowercasePrompt.includes('look')) {
			const skill = this.extractSkill(prompt);
			toolCommands.push({ type: 'roll', params: '1d20+3' });
			return {
				text: `Make a ${skill} check. Your ${context.playerRace} heritage gives you keen insight into your surroundings.`,
				toolCommands,
			};
		}

		// Exploration
		if (lowercasePrompt.includes('explore') || lowercasePrompt.includes('search')) {
			return {
				text: `You carefully examine the area. The ${context.currentScene} holds secrets waiting to be discovered.`,
				toolCommands,
			};
		}

		// Social interactions
		if (lowercasePrompt.includes('talk') || lowercasePrompt.includes('speak')) {
			return {
				text: `The NPC regards you with interest. Your words as a ${context.playerClass} carry weight in this situation.`,
				toolCommands,
			};
		}

		// Generic responses with character context
		const genericResponses = [
			`The adventure continues, ${context.playerName}. Your ${context.playerClass} training serves you well.`,
			`As a ${context.playerRace}, you sense something significant about to unfold in ${context.currentScene}.`,
			`Your decision echoes through the realm. What will you do next, brave ${context.playerClass}?`,
		];

		return {
			text: genericResponses[Math.floor(Math.random() * genericResponses.length)],
			toolCommands,
		};
	}

	/**
	 * Utility methods
	 */
	private generateCacheKey(prompt: string, context: any): string {
		return `${prompt.substring(0, 50)}_${context.currentScene}_${context.playerClass}`;
	}

	private cacheResponse(key: string, response: AIResponse): void {
		if (this.config.performance.cacheResponses) {
			this.responseCache.set(key, response);
			// Limit cache size
			if (this.responseCache.size > 100) {
				const firstKey = this.responseCache.keys().next().value;
				this.responseCache.delete(firstKey);
			}
		}
	}

	private getRandomEnemy(): string {
		const enemies = ['goblin', 'orc', 'skeleton', 'bandit', 'wolf'];
		return enemies[Math.floor(Math.random() * enemies.length)];
	}

	private extractSkill(prompt: string): string {
		const skills = ['Perception', 'Investigation', 'Athletics', 'Stealth', 'Insight'];
		const found = skills.find(skill => prompt.toLowerCase().includes(skill.toLowerCase()));
		return found || 'Perception';
	}

	/**
	 * Health check and diagnostics
	 */
	async getServiceStatus(): Promise<{
		cactus: { available: boolean; latency?: number };
		local: { available: boolean; resourceUsage?: any };
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
	}> {
		let cactusLatency: number | undefined;
		let cactusAvailable = false;
		let localAvailable = false;
		let localResourceUsage: any;

		// Check Cactus provider
		if (this.cactusProvider) {
			const start = Date.now();
			try {
				cactusAvailable = await this.cactusProvider.healthCheck();
				cactusLatency = Date.now() - start;
			} catch {
				cactusAvailable = false;
			}
		}

		// Check Local DM provider
		if (this.localDMProvider) {
			localAvailable = this.localDMProvider.isReady();
			if (localAvailable) {
				const status = this.localDMProvider.getStatus();
				localResourceUsage = status.resourceUsage;
			}
		}

		const overall = cactusAvailable ? 'healthy' :
			localAvailable ? 'degraded' :
				this.config.fallback.enabled ? 'degraded' : 'offline';

		return {
			cactus: { available: cactusAvailable, latency: cactusLatency },
			local: { available: localAvailable, resourceUsage: localResourceUsage },
			cache: { size: this.responseCache.size, hitRate: 0.8 }, // TODO: Track actual hit rate
			overall,
		};
	}

	/**
	 * Clear cache and reset connections
	 */
	async reset(): Promise<void> {
		this.responseCache.clear();
		await this.initializeCactusProvider();
		if (this.config.local.enabled) {
			await this.initializeLocalDMProvider();
		}
	}

	/**
	 * Enable/disable power saving mode for local AI
	 * Requirement 3: Power management
	 */
	setPowerSavingMode(enabled: boolean): void {
		if (this.localDMProvider) {
			this.localDMProvider.setPowerSavingMode(enabled);
		}
		this.config.local.powerSavingMode = enabled;
	}

	/**
	 * Get detailed status of all AI providers
	 */
	getDetailedStatus(): {
		cactus: { initialized: boolean; healthy: boolean };
		local: { initialized: boolean; ready: boolean; status?: any };
		fallback: { enabled: boolean };
		} {
		return {
			cactus: {
				initialized: !!this.cactusProvider,
				healthy: this.isHealthy,
			},
			local: {
				initialized: !!this.localDMProvider,
				ready: this.isLocalReady,
				status: this.localDMProvider?.getStatus(),
			},
			fallback: {
				enabled: this.config.fallback.enabled,
			},
		};
	}

	/**
	 * Cleanup all resources
	 * Requirement 5: Complete data removal
	 */
	async cleanup(): Promise<void> {
		this.responseCache.clear();

		if (this.localDMProvider) {
			await this.localDMProvider.cleanup();
			this.localDMProvider = null;
		}

		this.cactusProvider = null;
		this.isHealthy = false;
		this.isLocalReady = false;
	}
}

/**
 * Default configuration for production use
 */
export const DefaultAIConfig: AIServiceConfig = {
	cactus: {
		apiKey: process.env.CACTUS_API_KEY || '',
		endpoint: 'https://api.cactus-compute.com',
		modelName: GemmaModelConfigs.GEMMA_3_2B.name,
	},
	local: {
		enabled: true, // Enable local AI by default for iOS
		modelPath: DefaultLocalDMConfig.modelPath,
		powerSavingMode: false,
	},
	fallback: {
		enabled: true,
		useLocalModel: true, // Updated to use local model in fallback
	},
	performance: {
		timeout: 15000,
		retryAttempts: 2,
		cacheResponses: true,
	},
};

/**
 * Configuration presets for different use cases
 */
export const AIConfigPresets = {
	/**
	 * Cloud-first configuration (requires internet)
	 */
	CLOUD_FIRST: {
		...DefaultAIConfig,
		local: {
			enabled: false,
			modelPath: '',
		},
	},

	/**
	 * Local-first configuration (offline capable)
	 */
	LOCAL_FIRST: {
		...DefaultAIConfig,
		cactus: {
			apiKey: '',
			endpoint: '',
			modelName: '',
		},
		local: {
			enabled: true,
			modelPath: DefaultLocalDMConfig.modelPath,
			powerSavingMode: false,
		},
	},

	/**
	 * Performance-optimized configuration
	 */
	PERFORMANCE: {
		...DefaultAIConfig,
		local: {
			enabled: true,
			modelPath: LocalDMModelConfigs.PERFORMANCE.modelPath,
			powerSavingMode: false,
		},
		performance: {
			timeout: 10000,
			retryAttempts: 1,
			cacheResponses: true,
		},
	},

	/**
	 * Battery-optimized configuration
	 */
	BATTERY_SAVER: {
		...DefaultAIConfig,
		local: {
			enabled: true,
			modelPath: LocalDMModelConfigs.POWER_SAVING.modelPath,
			powerSavingMode: true,
		},
		performance: {
			timeout: 20000,
			retryAttempts: 1,
			cacheResponses: true,
		},
	},
};
