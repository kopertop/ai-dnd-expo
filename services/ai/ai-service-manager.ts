/**
 * AI Service Manager for D&D Platform
 *
 * Manages multiple AI providers with fallback strategies
 * Integrates Ollama (web), Cactus (native), and local fallbacks
 */

import { Platform } from 'react-native';
import { createPlatformAwareProvider, PlatformAwareProviderInterface } from './providers/platform-aware-provider';
import {
	DefaultLocalDMConfig,
	LocalDMModelConfigs,
	LocalDMProvider,
	ResourceUsage,
} from './providers/local-dm-provider';

export interface AIServiceConfig {
	ollama: {
		enabled: boolean;
		baseUrl?: string;
		model?: string;
		timeout?: number;
	};
	cactus: {
		enabled: boolean;
		modelPath: string;
		contextSize?: number;
		apiKey?: string;
	};
	local: {
		enabled: boolean;
		modelPath: string;
		powerSavingMode?: boolean;
		priority?: number; // Higher number = higher priority
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
	providerSelection: {
		preferLocal: boolean;
		fallbackChain: ('ollama' | 'local' | 'cactus' | 'rule-based')[];
		healthCheckInterval: number; // ms
	};
}

export interface AIResponse {
	text: string;
	confidence: number;
	source: 'ollama' | 'cactus' | 'local' | 'fallback';
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
	contextId?: string; // For state synchronization
	metadata?: {
		modelUsed?: string;
		tokensGenerated?: number;
		resourceUsage?: any;
	};
}

export interface GameContextState {
	contextId: string;
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
	lastProvider: 'ollama' | 'cactus' | 'local' | 'fallback';
	timestamp: number;
	sessionData?: {
		conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
		worldState?: any;
		characterState?: any;
	};
}

export class AIServiceManager {
	private platformProvider: PlatformAwareProviderInterface | null = null;
	private cactusProvider: any | null = null;
	private localDMProvider: LocalDMProvider | null = null;
	private config: AIServiceConfig;
	private responseCache = new Map<string, AIResponse>();
	private isHealthy = false;
	private isOllamaReady = false;
	private isLocalReady = false;
	private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
	private providerHealthStatus = {
		ollama: { healthy: false, lastCheck: 0, consecutiveFailures: 0 },
		cactus: { healthy: false, lastCheck: 0, consecutiveFailures: 0 },
		local: { healthy: false, lastCheck: 0, consecutiveFailures: 0 },
	};
	private gameContextStates = new Map<string, GameContextState>();
	private currentContextId: string | null = null;
	private isOnline = true;

	constructor(config: AIServiceConfig) {
		this.config = config;
		this.initializePlatformProvider();
		if (Platform.OS !== 'web' && config.local.enabled) {
			this.initializeLocalDMProvider();
		}
		this.checkNetworkStatus();
		this.startHealthMonitoring();
	}

	/**
	 * Initialize platform-aware provider (Ollama for web, Cactus for native)
	 */
	private async initializePlatformProvider(): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				// Web: Use Ollama
				if (!this.config.ollama.enabled) {
					return;
				}

				this.platformProvider = createPlatformAwareProvider({
					ollamaBaseUrl: this.config.ollama.baseUrl,
					ollamaModel: this.config.ollama.model,
					ollamaTimeout: this.config.ollama.timeout || this.config.performance.timeout,
				});

				this.isOllamaReady = await this.platformProvider.initialize();
				this.isHealthy = this.isOllamaReady;
			} else {
				// Native: Try Cactus
				if (!this.config.cactus.enabled) {
					return;
				}

				try {
					// Dynamic import to avoid bundling on web
					const { CactusAIProvider } = await import('./providers/cactus-ai-provider');
					this.cactusProvider = new CactusAIProvider({
						modelPath: this.config.cactus.modelPath,
						contextSize: this.config.cactus.contextSize || 2048,
						maxTokens: 150,
						temperature: 0.7,
						timeout: this.config.performance.timeout,
					});

					this.isHealthy = await this.cactusProvider.initialize();
				} catch (error) {
					console.warn('Failed to load Cactus provider:', error);
					// Fallback to platform-aware provider
					this.platformProvider = createPlatformAwareProvider({
						cactusModelUrl: this.config.cactus.modelPath,
						cactusApiKey: this.config.cactus.apiKey,
					});
					this.isHealthy = await this.platformProvider.initialize();
				}
			}
		} catch (error) {
			console.error('Failed to initialize platform provider:', error);
			this.isHealthy = false;
			this.isOllamaReady = false;
		}
	}

	/**
	 * Check network status
	 */
	private async checkNetworkStatus(): Promise<void> {
		try {
			if (Platform.OS === 'web') {
				// Web: Use navigator.onLine
				this.isOnline = navigator.onLine;
				
				// Listen for online/offline events
				if (typeof window !== 'undefined') {
					window.addEventListener('online', () => {
						this.isOnline = true;
					});
					window.addEventListener('offline', () => {
						this.isOnline = false;
					});
				}
			} else {
				// Native: Try to use expo-network if available
				try {
					const Network = await import('expo-network');
					const networkState = await Network.getNetworkStateAsync();
					this.isOnline = networkState.isConnected ?? true;
				} catch {
					// Fallback: assume online
					this.isOnline = true;
				}
			}
		} catch (error) {
			console.warn('Failed to check network status:', error);
			this.isOnline = true; // Default to online
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
			this.isLocalReady = await this.localDMProvider.initialize(progress => {
				if (progress.status === 'error') {
					console.error(`🤖 Local DM: ${progress.message || 'Unknown error'}`);
				}
			});

			if (!this.isLocalReady) {
				console.warn('🤖 Local DM provider initialized but not ready');
			}
		} catch (error) {
			console.error('Failed to initialize Local DM provider:', error);
			this.isLocalReady = false;
		}
	}

	/**
	 * Generate D&D response with intelligent fallback chain
	 * Requirement 4.1, 4.2, 6.1: Seamless fallback chain: ollama/local → cactus → rule-based
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
			const cached = this.responseCache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		// Adjust fallback chain based on platform and network status
		let fallbackChain = [...this.config.providerSelection.fallbackChain];
		
		// If offline, prioritize local/fallback providers
		if (!this.isOnline) {
			fallbackChain = fallbackChain.filter(p => p === 'local' || p === 'rule-based');
		}

		// If web, ensure ollama is in chain
		if (Platform.OS === 'web' && !fallbackChain.includes('ollama')) {
			fallbackChain.unshift('ollama');
		}

		let lastError: Error | null = null;

		for (const providerType of fallbackChain) {
			try {
				const response = await this.tryProvider(providerType, prompt, context, startTime);
				if (response) {
					this.cacheResponse(cacheKey, response);
					return response;
				}
			} catch (error) {
				lastError = error as Error;
				console.warn(`🔄 Provider ${providerType} failed, trying next in chain:`, error);

				// Update provider health status
				if (providerType === 'ollama') {
					this.isOllamaReady = false;
				} else if (providerType === 'cactus') {
					this.isHealthy = false;
				} else if (providerType === 'local') {
					this.isLocalReady = false;
				}
			}
		}

		// If all providers in chain failed, throw the last error
		throw lastError || new Error('All providers in fallback chain failed');
	}

	/**
	 * Try a specific provider type
	 */
	private async tryProvider(
		providerType: 'ollama' | 'local' | 'cactus' | 'rule-based',
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		startTime: number,
	): Promise<AIResponse | null> {
		switch (providerType) {
			case 'ollama':
				return await this.tryOllamaProvider(prompt, context, startTime);
			case 'local':
				return await this.tryLocalProvider(prompt, context, startTime);
			case 'cactus':
				return await this.tryCactusProvider(prompt, context, startTime);
			case 'rule-based':
				return await this.tryRuleBasedProvider(prompt, context, startTime);
			default:
				throw new Error(`Unknown provider type: ${providerType}`);
		}
	}

	/**
	 * Try Ollama Provider (web)
	 */
	private async tryOllamaProvider(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		startTime: number,
	): Promise<AIResponse | null> {
		if (!this.platformProvider || !this.isOllamaReady || !this.config.ollama.enabled) {
			return null;
		}

		try {
			const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to respond to player actions in a D&D game, maintaining narrative consistency and applying game rules correctly.
Provide engaging, descriptive responses that advance the story and create an immersive experience.

Game Context:
- Player Character: ${context.playerName}, a ${context.playerRace} ${context.playerClass}
- Current Scene: ${context.currentScene}

When appropriate, include tool commands in your response using the following format:
- [ROLL:1d20+5] for dice rolls
- [DAMAGE:2d6+3] for damage calculations
- [HEAL:1d8+2] for healing

Keep your responses concise, engaging, and true to D&D 5e rules.`;

			const messages = [
				{ role: 'system' as const, content: systemPrompt },
				...context.gameHistory.slice(-6).map((msg, i) => ({
					role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
					content: msg,
				})),
				{ role: 'user' as const, content: prompt },
			];

			const response = await this.platformProvider.completion(messages, {
				temperature: 0.7,
				num_predict: 512,
			});

			// Extract tool commands
			const toolCommands = this.extractToolCommands(response);
			const cleanText = this.removeToolCommands(response);

			return {
				text: cleanText,
				confidence: 0.9,
				source: 'ollama',
				toolCommands,
				processingTime: Date.now() - startTime,
				metadata: {
					modelUsed: this.config.ollama.model || 'llama3.2',
					provider: 'ollama',
				},
			};
		} catch (error) {
			console.error('Ollama provider failed:', error);
			return null;
		}
	}

	/**
	 * Extract tool commands from response
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const type = match[1].toLowerCase();
			const params = match[2].trim();

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

	/**
	 * Try Local DM Provider
	 */
	private async tryLocalProvider(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		startTime: number,
	): Promise<AIResponse | null> {
		if (!this.localDMProvider || !this.isLocalReady || !this.config.local.enabled) {
			return null;
		}

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

		return {
			text: response.text,
			confidence: response.confidence,
			source: 'local',
			toolCommands: response.toolCommands,
			processingTime: response.processingTime,
		};
	}

	/**
	 * Try Cactus Provider
	 */
	private async tryCactusProvider(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		startTime: number,
	): Promise<AIResponse | null> {
		if (Platform.OS === 'web') {
			// Cactus not available on web
			return null;
		}

		if (!this.cactusProvider && !this.platformProvider) {
			return null;
		}

		try {
			// Use platform provider if available, otherwise cactus provider
			const provider = this.platformProvider || this.cactusProvider;
			if (!provider) {
				return null;
			}

			// Try to use platform provider's completion method
			if (this.platformProvider && typeof this.platformProvider.completion === 'function') {
				const systemPrompt = `You are an expert Dungeons & Dragons Dungeon Master.
Your task is to respond to player actions in a D&D game, maintaining narrative consistency and applying game rules correctly.

Game Context:
- Player Character: ${context.playerName}, a ${context.playerRace} ${context.playerClass}
- Current Scene: ${context.currentScene}`;

				const messages = [
					{ role: 'system' as const, content: systemPrompt },
					{ role: 'user' as const, content: prompt },
				];

				const response = await this.platformProvider.completion(messages, {
					temperature: 0.7,
					n_predict: 512,
				});

				const toolCommands = this.extractToolCommands(response);
				const cleanText = this.removeToolCommands(response);

				return {
					text: cleanText,
					confidence: 0.9,
					source: 'cactus',
					toolCommands,
					processingTime: Date.now() - startTime,
				};
			}

			// Fallback to old cactus provider if it exists
			if (this.cactusProvider && typeof (this.cactusProvider as any).generateDnDResponse === 'function') {
				const response = await (this.cactusProvider as any).generateDnDResponse({
					prompt,
					context,
				});

				return {
					text: response.text,
					confidence: 0.9,
					source: 'cactus',
					toolCommands: response.metadata?.toolCommands || [],
					processingTime: Date.now() - startTime,
				};
			}

			return null;
		} catch (error) {
			console.error('Cactus provider failed:', error);
			return null;
		}
	}

	/**
	 * Try Rule-based Provider (always available as final fallback)
	 */
	private async tryRuleBasedProvider(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		startTime: number,
	): Promise<AIResponse> {
		const fallbackResponse = await this.generateFallbackResponse(prompt, context);

		return {
			text: fallbackResponse.text,
			confidence: 0.7,
			source: 'fallback',
			toolCommands: fallbackResponse.toolCommands,
			processingTime: Date.now() - startTime,
		};
	}

	/**
	 * Retry mechanism for network requests
	 */
	private async tryWithRetry<T>(operation: () => Promise<T>): Promise<T> {
		let lastError: Error | null = null;

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

		throw lastError || new Error('Operation failed after retries');
	}

	/**
	 * Enhanced fallback response system
	 */
	private async generateFallbackResponse(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
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
	private generateCacheKey(
		prompt: string,
		context: { currentScene: string; playerClass: string },
	): string {
		return `${prompt.substring(0, 50)}_${context.currentScene}_${context.playerClass}`;
	}

	private cacheResponse(key: string, response: AIResponse): void {
		if (this.config.performance.cacheResponses) {
			this.responseCache.set(key, response);
			// Limit cache size
			if (this.responseCache.size > 100) {
				const firstKey = this.responseCache.keys().next().value;
				if (firstKey) {
					this.responseCache.delete(firstKey);
				}
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
		local: { available: boolean; resourceUsage?: ResourceUsage };
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
	}> {
		let cactusLatency: number | undefined;
		let cactusAvailable = false;
		let localAvailable = false;
		let localResourceUsage: ResourceUsage | undefined;

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
				// Note: ResourceUsage types may not match exactly, but this is acceptable for now
				localResourceUsage = status.resourceUsage as ResourceUsage | undefined;
			}
		}

		const overall = cactusAvailable
			? 'healthy'
			: localAvailable
				? 'degraded'
				: this.config.fallback.enabled
					? 'degraded'
					: 'offline';

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
		ollama: { initialized: boolean; healthy: boolean };
		cactus: { initialized: boolean; healthy: boolean };
		local: {
			initialized: boolean;
			ready: boolean;
			status?: import('./providers/local-dm-provider').ProviderStatus;
		};
		fallback: { enabled: boolean };
		network: { isOnline: boolean };
		} {
		return {
			ollama: {
				initialized: !!this.platformProvider && Platform.OS === 'web',
				healthy: this.isOllamaReady,
			},
			cactus: {
				initialized: !!this.cactusProvider || (!!this.platformProvider && Platform.OS !== 'web'),
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
			network: {
				isOnline: this.isOnline,
			},
		};
	}

	/**
	 * Start health monitoring for all providers
	 * Requirement 6.4: Provider health monitoring and automatic switching
	 */
	private startHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		this.healthCheckInterval = setInterval(async () => {
			await this.performHealthChecks();
		}, this.config.providerSelection.healthCheckInterval);

		// Perform initial health check
		this.performHealthChecks();
	}

	/**
	 * Perform health checks on all providers
	 */
	private async performHealthChecks(): Promise<void> {
		const now = Date.now();

		// Check network status
		await this.checkNetworkStatus();

		// Check Ollama provider health (web)
		if (Platform.OS === 'web' && this.platformProvider && this.config.ollama.enabled) {
			try {
				const isHealthy = await this.platformProvider.healthCheck();
				this.providerHealthStatus.ollama.healthy = isHealthy;
				this.providerHealthStatus.ollama.lastCheck = now;

				if (isHealthy) {
					this.providerHealthStatus.ollama.consecutiveFailures = 0;
					this.isOllamaReady = true;
				} else {
					this.providerHealthStatus.ollama.consecutiveFailures++;
					if (this.providerHealthStatus.ollama.consecutiveFailures >= 3) {
						this.isOllamaReady = false;
					}
				}
			} catch (error) {
				this.providerHealthStatus.ollama.healthy = false;
				this.providerHealthStatus.ollama.consecutiveFailures++;
				this.isOllamaReady = false;
			}
		}

		// Check Cactus provider health (native)
		if (Platform.OS !== 'web' && this.cactusProvider && this.config.cactus.enabled) {
			try {
				const isHealthy = typeof this.cactusProvider.healthCheck === 'function'
					? await this.cactusProvider.healthCheck()
					: this.isHealthy;
				this.providerHealthStatus.cactus.healthy = isHealthy;
				this.providerHealthStatus.cactus.lastCheck = now;

				if (isHealthy) {
					this.providerHealthStatus.cactus.consecutiveFailures = 0;
					this.isHealthy = true;
				} else {
					this.providerHealthStatus.cactus.consecutiveFailures++;
					if (this.providerHealthStatus.cactus.consecutiveFailures >= 3) {
						this.isHealthy = false;
					}
				}
			} catch (error) {
				this.providerHealthStatus.cactus.healthy = false;
				this.providerHealthStatus.cactus.consecutiveFailures++;
				this.isHealthy = false;
			}
		}

		// Check Local DM provider health
		if (Platform.OS !== 'web' && this.localDMProvider && this.config.local.enabled) {
			try {
				const isHealthy = await this.localDMProvider.healthCheck();
				this.providerHealthStatus.local.healthy = isHealthy;
				this.providerHealthStatus.local.lastCheck = now;

				if (isHealthy) {
					this.providerHealthStatus.local.consecutiveFailures = 0;
					this.isLocalReady = true;
				} else {
					this.providerHealthStatus.local.consecutiveFailures++;
					if (this.providerHealthStatus.local.consecutiveFailures >= 3) {
						this.isLocalReady = false;
					}
				}
			} catch (error) {
				this.providerHealthStatus.local.healthy = false;
				this.providerHealthStatus.local.consecutiveFailures++;
				this.isLocalReady = false;
			}
		}
	}

	/**
	 * Get optimal provider based on current health and configuration
	 * Requirement 4.1: Prioritize local when available
	 */
	getOptimalProvider(): 'ollama' | 'local' | 'cactus' | 'fallback' {
		// If preferLocal is set and local is healthy, use local
		if (
			this.config.providerSelection.preferLocal &&
			this.isLocalReady &&
			this.config.local.enabled &&
			Platform.OS !== 'web'
		) {
			return 'local';
		}

		// Web: prefer Ollama
		if (Platform.OS === 'web' && this.isOllamaReady && this.config.ollama.enabled) {
			return 'ollama';
		}

		// Otherwise, use the first healthy provider in the fallback chain
		for (const provider of this.config.providerSelection.fallbackChain) {
			if (provider === 'ollama' && this.isOllamaReady && this.config.ollama.enabled) {
				return 'ollama';
			}
			if (provider === 'local' && this.isLocalReady && this.config.local.enabled && Platform.OS !== 'web') {
				return 'local';
			}
			if (provider === 'cactus' && this.isHealthy && this.config.cactus.enabled && Platform.OS !== 'web') {
				return 'cactus';
			}
			if (provider === 'rule-based') {
				return 'fallback';
			}
		}

		// Final fallback
		return 'fallback';
	}

	/**
	 * Switch provider configuration dynamically
	 * Requirement 4.2: Provider switching without losing game context
	 */
	async switchProvider(newConfig: Partial<AIServiceConfig>): Promise<boolean> {
		try {
			// Update configuration
			this.config = { ...this.config, ...newConfig };

			// Reinitialize providers if needed
			if (newConfig.cactus?.enabled !== undefined) {
				if (newConfig.cactus.enabled && !this.cactusProvider) {
					await this.initializeCactusProvider();
				} else if (!newConfig.cactus.enabled && this.cactusProvider) {
					this.cactusProvider = null;
					this.isHealthy = false;
				}
			}

			if (newConfig.local?.enabled !== undefined) {
				if (newConfig.local.enabled && !this.localDMProvider) {
					await this.initializeLocalDMProvider();
				} else if (!newConfig.local.enabled && this.localDMProvider) {
					await this.localDMProvider.cleanup();
					this.localDMProvider = null;
					this.isLocalReady = false;
				}
			}

			// Update health monitoring interval if changed
			if (newConfig.providerSelection?.healthCheckInterval) {
				this.startHealthMonitoring();
			}

			console.log('🔄 Provider configuration updated successfully');
			return true;
		} catch (error) {
			console.error('❌ Failed to switch provider configuration:', error);
			return false;
		}
	}

	/**
	 * Get comprehensive provider health status
	 */
	getProviderHealthStatus(): {
		ollama: { healthy: boolean; lastCheck: number; consecutiveFailures: number };
		cactus: { healthy: boolean; lastCheck: number; consecutiveFailures: number };
		local: { healthy: boolean; lastCheck: number; consecutiveFailures: number };
		optimal: 'ollama' | 'local' | 'cactus' | 'fallback';
		network: { isOnline: boolean };
		} {
		return {
			...this.providerHealthStatus,
			optimal: this.getOptimalProvider(),
			network: { isOnline: this.isOnline },
		};
	}

	/**
	 * Create or update game context state for provider switching
	 * Requirement 4.2: Provider switching without losing game context
	 */
	createGameContext(
		contextId: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		sessionData?: {
			conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
			worldState?: any;
			characterState?: any;
		},
	): void {
		const gameContextState: GameContextState = {
			contextId,
			playerName: context.playerName,
			playerClass: context.playerClass,
			playerRace: context.playerRace,
			currentScene: context.currentScene,
			gameHistory: [...context.gameHistory],
			lastProvider: this.getOptimalProvider(),
			timestamp: Date.now(),
			sessionData,
		};

		this.gameContextStates.set(contextId, gameContextState);
		this.currentContextId = contextId;
	}

	/**
	 * Update existing game context state
	 */
	updateGameContext(contextId: string, updates: Partial<GameContextState>): boolean {
		const existingContext = this.gameContextStates.get(contextId);
		if (!existingContext) {
			return false;
		}

		const updatedContext: GameContextState = {
			...existingContext,
			...updates,
			timestamp: Date.now(),
		};

		this.gameContextStates.set(contextId, updatedContext);
		return true;
	}

	/**
	 * Get game context state for provider switching
	 */
	getGameContext(contextId: string): GameContextState | null {
		return this.gameContextStates.get(contextId) || null;
	}

	/**
	 * Switch provider while preserving game context
	 * Requirement 4.2: State synchronization between local and cloud providers
	 */
	async switchProviderWithContext(
		newProviderType: 'ollama' | 'local' | 'cactus',
		contextId?: string,
	): Promise<{ success: boolean; newProvider: string; contextPreserved: boolean }> {
		try {
			const activeContextId = contextId || this.currentContextId;
			let contextPreserved = false;

			// Preserve current context if available
			if (activeContextId) {
				const currentContext = this.gameContextStates.get(activeContextId);
				if (currentContext) {
					// Update the context with the new provider preference
					this.updateGameContext(activeContextId, {
						lastProvider: newProviderType,
					});
					contextPreserved = true;
				}
			}

			// Update provider configuration to prefer the new provider
			const newConfig: Partial<AIServiceConfig> = {
				providerSelection: {
					...this.config.providerSelection,
					preferLocal: newProviderType === 'local',
					fallbackChain:
						newProviderType === 'local'
							? ['local', 'cactus', 'rule-based']
							: newProviderType === 'ollama'
								? ['ollama', 'rule-based']
								: ['cactus', 'local', 'rule-based'],
				},
			};

			const switchSuccess = await this.switchProvider(newConfig);

			return {
				success: switchSuccess,
				newProvider: this.getOptimalProvider(),
				contextPreserved,
			};
		} catch (error) {
			console.error('❌ Failed to switch provider with context:', error);
			return {
				success: false,
				newProvider: this.getOptimalProvider(),
				contextPreserved: false,
			};
		}
	}

	/**
	 * Generate response with context-aware provider selection
	 * Enhanced version that uses game context for better provider decisions
	 */
	async generateDnDResponseWithContext(
		prompt: string,
		contextId: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
	): Promise<AIResponse> {
		// Update or create game context
		this.createGameContext(contextId, context, {
			conversationHistory: [{ role: 'user', content: prompt }],
		});

		// Generate response using the standard method
		const response = await this.generateDnDResponse(prompt, context);

		// Update context with the response
		const gameContext = this.gameContextStates.get(contextId);
		if (gameContext && gameContext.sessionData) {
			gameContext.sessionData.conversationHistory.push({
				role: 'assistant',
				content: response.text,
			});
			gameContext.lastProvider = response.source;
			gameContext.timestamp = Date.now();
		}

		// Add context ID to response for tracking
		response.contextId = contextId;

		return response;
	}

	/**
	 * Get conversation history for a context
	 */
	getConversationHistory(
		contextId: string,
	): Array<{ role: 'user' | 'assistant'; content: string }> {
		const context = this.gameContextStates.get(contextId);
		return context?.sessionData?.conversationHistory || [];
	}

	/**
	 * Clear game context state
	 */
	clearGameContext(contextId: string): boolean {
		const deleted = this.gameContextStates.delete(contextId);
		if (this.currentContextId === contextId) {
			this.currentContextId = null;
		}
		return deleted;
	}

	/**
	 * Get all active game contexts
	 */
	getActiveContexts(): string[] {
		return Array.from(this.gameContextStates.keys());
	}

	/**
	 * Synchronize state between providers
	 * Requirement 6.1: State synchronization between local and cloud providers
	 */
	async synchronizeProviderState(contextId: string): Promise<boolean> {
		try {
			const context = this.gameContextStates.get(contextId);
			if (!context) {
				return false;
			}

			// Ensure both providers have the same context understanding
			// This is a placeholder for more sophisticated state sync
			const syncData = {
				gameHistory: context.gameHistory,
				conversationHistory: context.sessionData?.conversationHistory || [],
				lastProvider: context.lastProvider,
				timestamp: context.timestamp,
			};

			// In a real implementation, this would sync state between providers
			// For now, we just update the context timestamp to indicate sync
			this.updateGameContext(contextId, {
				timestamp: Date.now(),
			});

			return true;
		} catch (error) {
			console.error('❌ Failed to synchronize provider state:', error);
			return false;
		}
	}

	/**
	 * Get provider switching recommendations based on context
	 */
	getProviderRecommendation(contextId: string): {
		recommended: 'ollama' | 'local' | 'cactus' | 'fallback';
		reason: string;
		confidence: number;
	} {
		const context = this.gameContextStates.get(contextId);
		const healthStatus = this.getProviderHealthStatus();

		// Default recommendation
		let recommended: 'ollama' | 'local' | 'cactus' | 'fallback' = 'fallback';
		let reason = 'No providers available';
		let confidence = 0.5;

		// Web: prefer Ollama
		if (Platform.OS === 'web') {
			if (healthStatus.ollama.healthy && this.config.ollama.enabled) {
				recommended = 'ollama';
				reason = 'Ollama provider is healthy and available';
				confidence = 0.9;
			} else {
				recommended = 'fallback';
				reason = 'Ollama not available, using rule-based fallback';
				confidence = 0.6;
			}
		} else {
			// Native: prefer local if healthy and configured
			if (healthStatus.local.healthy && this.config.local.enabled) {
				recommended = 'local';
				reason = 'Local provider is healthy and provides privacy benefits';
				confidence = 0.9;
			}
			// Fall back to cactus if local is not available
			else if (healthStatus.cactus.healthy && this.config.cactus.enabled) {
				recommended = 'cactus';
				reason = 'Cactus provider is healthy, local provider unavailable';
				confidence = 0.8;
			}
		}

		// Consider context-specific factors
		if (context) {
			const conversationLength = context.sessionData?.conversationHistory?.length || 0;

			// For long conversations, prefer local for consistency (native only)
			if (Platform.OS !== 'web' && conversationLength > 10 && healthStatus.local.healthy) {
				recommended = 'local';
				reason = 'Long conversation benefits from local consistency';
				confidence = Math.min(confidence + 0.1, 1.0);
			}
		}

		return { recommended, reason, confidence };
	}

	/**
	 * Cleanup all resources
	 * Requirement 5: Complete data removal
	 */
	async cleanup(): Promise<void> {
		// Stop health monitoring
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}

		// Clear all caches and context states
		this.responseCache.clear();
		this.gameContextStates.clear();
		this.currentContextId = null;

		if (this.localDMProvider) {
			await this.localDMProvider.cleanup();
			this.localDMProvider = null;
		}

		if (this.platformProvider && typeof this.platformProvider.rewind === 'function') {
			this.platformProvider.rewind();
		}

		this.cactusProvider = null;
		this.platformProvider = null;
		this.isHealthy = false;
		this.isOllamaReady = false;
		this.isLocalReady = false;
	}
}

/**
 * Default configuration for production use
 */
export const DefaultAIConfig: AIServiceConfig = {
	ollama: {
		enabled: true,
		baseUrl: process.env.EXPO_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
		model: process.env.EXPO_PUBLIC_OLLAMA_MODEL || 'llama3.2',
		timeout: 30000,
	},
	cactus: {
		enabled: true,
		modelPath: '../assets/models/gemma-3n-E2B-it-Q4_K_S.gguf', // Use local GGUF model
		contextSize: 2048,
	},
	local: {
		enabled: true, // Enable local AI by default for iOS
		modelPath: DefaultLocalDMConfig.modelPath,
		powerSavingMode: false,
		priority: 2, // Higher priority than cactus for offline-first approach
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
	providerSelection: {
		preferLocal: true, // Prefer local for privacy and offline capability
		fallbackChain: Platform.OS === 'web' 
			? ['ollama', 'rule-based']
			: ['local', 'cactus', 'rule-based'],
		healthCheckInterval: 30000, // Check provider health every 30 seconds
	},
};

/**
 * Configuration presets for different use cases
 */
export const AIConfigPresets = {
	/**
	 * Cactus-first configuration (uses Cactus LM as primary)
	 */
	CACTUS_FIRST: {
		...DefaultAIConfig,
		cactus: {
			enabled: true,
			modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
			contextSize: 2048,
		},
		local: {
			enabled: false,
			modelPath: '',
			priority: 1,
		},
		providerSelection: {
			preferLocal: false,
			fallbackChain: ['cactus', 'rule-based'],
			healthCheckInterval: 30000,
		},
	},

	/**
	 * Local-first configuration (offline capable)
	 */
	LOCAL_FIRST: {
		...DefaultAIConfig,
		cactus: {
			enabled: false,
			modelPath: '',
		},
		local: {
			enabled: true,
			modelPath: DefaultLocalDMConfig.modelPath,
			powerSavingMode: false,
			priority: 3,
		},
		providerSelection: {
			preferLocal: true,
			fallbackChain: ['local', 'rule-based'],
			healthCheckInterval: 30000,
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
			priority: 3,
		},
		performance: {
			timeout: 10000,
			retryAttempts: 1,
			cacheResponses: true,
		},
		providerSelection: {
			preferLocal: true,
			fallbackChain: ['local', 'cactus', 'rule-based'],
			healthCheckInterval: 15000, // More frequent checks for performance mode
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
			priority: 2,
		},
		performance: {
			timeout: 20000,
			retryAttempts: 1,
			cacheResponses: true,
		},
		providerSelection: {
			preferLocal: true,
			fallbackChain: ['local', 'rule-based'], // Skip cactus to save battery
			healthCheckInterval: 60000, // Less frequent checks to save battery
		},
	},
};
