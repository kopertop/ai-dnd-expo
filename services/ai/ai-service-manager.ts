/**
 * Simplified AI Service Manager
 *
 * Provides a unified interface over the platform-aware (Ollama) provider,
 * the optional on-device LocalDMProvider, and a lightweight rule-based fallback.
 */

import { Platform } from 'react-native';

import { createPlatformAwareProvider, PlatformAwareProviderInterface } from './providers/platform-aware-provider';

type LocalProviderModule = typeof import('./providers/local-dm-provider');
type ResourceUsage = import('./providers/local-dm-provider').ResourceUsage;

const DEFAULT_LOCAL_MODEL_PATH = '/Documents/AIModels/gemma-3-2b-int8/model.gguf';
let LocalDMProviderCtor: LocalProviderModule['LocalDMProvider'] | null = null;

export interface AIServiceConfig {
	ollama: {
		enabled: boolean;
		baseUrl?: string;
		model?: string;
		timeout?: number;
	};
	local: {
		enabled: boolean;
		modelPath: string;
		powerSavingMode?: boolean;
		priority?: number;
	};
	fallback: {
		enabled: boolean;
	};
	performance: {
		timeout: number;
		retryAttempts: number;
		cacheResponses: boolean;
	};
	providerSelection: {
		preferLocal: boolean;
		fallbackChain: ('ollama' | 'local' | 'rule-based')[];
		healthCheckInterval: number;
	};
}

export interface AIResponse {
	text: string;
	confidence: number;
	source: 'ollama' | 'local' | 'fallback';
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
	contextId?: string;
	metadata?: {
		modelUsed?: string;
		resourceUsage?: ResourceUsage;
	};
}

export interface GameContextState {
	contextId: string;
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
	lastProvider: 'ollama' | 'local' | 'fallback';
	timestamp: number;
}

type ProviderType = 'ollama' | 'local' | 'rule-based';

export class AIServiceManager {
	private readonly config: AIServiceConfig;
	private platformProvider: PlatformAwareProviderInterface | null = null;
	private localProvider: InstanceType<LocalProviderModule['LocalDMProvider']> | null = null;
	private initializePromise: Promise<void> | null = null;

	private isPlatformReady = false;
	private isLocalReady = false;

	private responseCache = new Map<string, AIResponse>();
	private cacheHits = 0;
	private cacheMisses = 0;

	private lastPrimaryLatency: number | undefined;
	private lastLocalLatency: number | undefined;

	private contextStates = new Map<string, GameContextState>();

	constructor(config: AIServiceConfig) {
		this.config = config;
		this.initializePromise = this.initializeProviders();
	}

	private async initializeProviders(): Promise<void> {
		try {
				this.platformProvider = createPlatformAwareProvider({
					ollamaBaseUrl: this.config.ollama.baseUrl,
					ollamaModel: this.config.ollama.model,
					ollamaTimeout: this.config.ollama.timeout || this.config.performance.timeout,
				});
			if (this.config.ollama.enabled) {
				this.isPlatformReady = await this.platformProvider.initialize();
			}
				} catch (error) {
			console.warn('Failed to initialize platform provider:', error);
			this.isPlatformReady = false;
		}

		if (Platform.OS !== 'web' && this.config.local.enabled) {
			try {
				if (!LocalDMProviderCtor) {
					const module: LocalProviderModule = await import('./providers/local-dm-provider');
					LocalDMProviderCtor = module.LocalDMProvider;
				}

				this.localProvider = new LocalDMProviderCtor({
				modelPath: this.config.local.modelPath,
				contextSize: 2048,
				maxTokens: 150,
				temperature: 0.7,
				enableResourceMonitoring: true,
					powerSavingMode: this.config.local.powerSavingMode ?? false,
				});
				this.isLocalReady = await this.localProvider.initialize();
			} catch (error) {
				console.warn('Failed to initialize local provider:', error);
				this.isLocalReady = false;
				this.localProvider = null;
			}
		}
	}

	private async ensureInitialized(): Promise<void> {
		if (this.initializePromise) {
			await this.initializePromise;
			this.initializePromise = null;
		}
	}

	private buildFallbackChain(): ProviderType[] {
		const chain = [...this.config.providerSelection.fallbackChain];
		if (!chain.includes('rule-based')) {
			chain.push('rule-based');
		}
		return chain;
	}

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
		await this.ensureInitialized();

		const cacheKey = this.generateCacheKey(prompt, context);
		if (this.config.performance.cacheResponses && this.responseCache.has(cacheKey)) {
			const cached = this.responseCache.get(cacheKey);
			if (cached) {
				this.cacheHits++;
				return cached;
			}
		} else {
			this.cacheMisses++;
		}

		let lastError: Error | null = null;
		const startTime = Date.now();

		for (const providerType of this.buildFallbackChain()) {
			try {
				const response = await this.tryProvider(providerType, prompt, context, startTime);
				if (response) {
					this.cacheResponse(cacheKey, response);
					return response;
				}
			} catch (error) {
				lastError = error as Error;
				console.warn(`Provider ${providerType} failed:`, error);
			}
		}

		throw lastError ?? new Error('Unable to generate response with available providers');
	}

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
		const response = await this.generateDnDResponse(prompt, context);
		this.contextStates.set(contextId, {
			contextId,
			playerName: context.playerName,
			playerClass: context.playerClass,
			playerRace: context.playerRace,
			currentScene: context.currentScene,
			gameHistory: context.gameHistory,
			lastProvider: response.source,
			timestamp: Date.now(),
		});
		return { ...response, contextId };
	}

	private async tryProvider(
		providerType: ProviderType,
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
				return this.tryOllama(prompt, context, startTime);
			case 'local':
				return this.tryLocal(prompt, context, startTime);
			case 'rule-based':
			default:
				return this.tryRuleBased(prompt, context, startTime);
		}
	}

	private async tryOllama(
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
		if (!this.platformProvider || !this.config.ollama.enabled || !this.isPlatformReady) {
			return null;
		}

		try {
			const systemPrompt = this.buildSystemPrompt(context);
			const messages = [
				{ role: 'system' as const, content: systemPrompt },
				...context.gameHistory.slice(-6).map((msg, index) => ({
					role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
					content: msg,
				})),
				{ role: 'user' as const, content: prompt },
			];

			const response = await this.platformProvider.completion(messages, {
				temperature: 0.7,
				num_predict: 512,
			});

			const duration = Date.now() - startTime;
			this.lastPrimaryLatency = duration;

			const toolCommands = this.extractToolCommands(response);
			const cleanText = this.removeToolCommands(response);

			return {
				text: cleanText,
				confidence: 0.9,
				source: 'ollama',
				toolCommands,
				processingTime: duration,
				metadata: { modelUsed: this.config.ollama.model || 'llama3.2' },
			};
		} catch (error) {
			console.error('Ollama provider error:', error);
			this.isPlatformReady = false;
			return null;
		}
	}

	private async tryLocal(
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
		if (!this.localProvider || !this.isLocalReady) {
			return null;
		}

		try {
			const response = await this.localProvider.generateDnDResponse(
				prompt,
				{
			playerName: context.playerName,
			playerClass: context.playerClass,
			playerRace: context.playerRace,
			currentScene: context.currentScene,
			gameHistory: context.gameHistory,
				},
			this.config.performance.timeout,
		);

			const duration = Date.now() - startTime;
			this.lastLocalLatency = duration;

		return {
			text: response.text,
			confidence: response.confidence,
			source: 'local',
			toolCommands: response.toolCommands,
			processingTime: response.processingTime,
				metadata: {
					resourceUsage: this.localProvider.getStatus().resourceUsage,
				},
		};
		} catch (error) {
			console.error('Local provider error:', error);
			this.isLocalReady = false;
			return null;
		}
	}

	private async tryRuleBased(
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
		const response = this.generateFallbackResponse(prompt, context);
		return {
			text: response.text,
			confidence: 0.6,
			source: 'fallback',
			toolCommands: response.toolCommands,
			processingTime: Date.now() - startTime,
		};
	}

	private buildSystemPrompt(context: {
		playerName: string;
		playerClass: string;
		playerRace: string;
		currentScene: string;
	}): string {
		return `You are an expert Dungeons & Dragons Dungeon Master.
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
	}

	private cacheResponse(key: string, response: AIResponse): void {
		if (!this.config.performance.cacheResponses) return;
		this.responseCache.set(key, response);
	}

	private generateCacheKey(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
	): string {
		return `${prompt}|${context.playerName}|${context.playerClass}|${context.currentScene}|${context.gameHistory.slice(-3).join('-')}`;
	}

	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const [_, type, params] = match;

			if (
				['roll', 'damage', 'heal', 'update', 'status', 'inventory', 'skill_check'].includes(
					type.toLowerCase(),
				)
			) {
				commands.push({ type: type.toLowerCase(), params: params.trim() });
			}
		}

		return commands;
	}

	private removeToolCommands(text: string): string {
		return text.replace(/\[(\w+):([^\]]+)\]/g, '').trim();
	}

	private generateFallbackResponse(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
	): { text: string; toolCommands: Array<{ type: string; params: string }> } {
		const normalized = prompt.toLowerCase();
		const toolCommands: Array<{ type: string; params: string }> = [];
		let text = '';

		if (normalized.includes('attack') || normalized.includes('strike')) {
			text = `You ready your weapon and launch an attack within ${context.currentScene}.`;
			toolCommands.push({ type: 'roll', params: '1d20+5' });
		} else if (normalized.includes('heal') || normalized.includes('potion')) {
			text = `You take a moment to recover, drawing upon your resources to regain some vitality.`;
			toolCommands.push({ type: 'heal', params: '1d8+2' });
		} else if (normalized.includes('search') || normalized.includes('investigate')) {
			text = `You carefully examine your surroundings, searching for hidden details in ${context.currentScene}.`;
			toolCommands.push({ type: 'skill_check', params: 'perception' });
		} else {
			text = `The world reacts to your choices, ${context.playerName}. ${context.currentScene} awaits your next move.`;
		}

		return { text, toolCommands };
	}

	getServiceStatus(): {
		overall: 'healthy' | 'degraded' | 'offline';
		primary: { available: boolean; latency?: number };
		local: { available: boolean; latency?: number };
		cache: { size: number; hitRate: number };
	} {
		const overall = this.computeOverallStatus();
		return {
			overall,
			primary: { available: this.isPlatformReady, latency: this.lastPrimaryLatency },
			local: { available: this.isLocalReady, latency: this.lastLocalLatency },
			cache: { size: this.responseCache.size, hitRate: this.getCacheHitRate() },
		};
	}

	getDetailedStatus(): {
		overall: 'healthy' | 'degraded' | 'offline';
		primary: { ready: boolean; provider: string | null; error: string | null };
		local: {
			ready: boolean;
			initialized: boolean;
			status?: ReturnType<LocalDMProvider['getStatus']>;
		};
		cache: { hits: number; misses: number };
		} {
		return {
			overall: this.computeOverallStatus(),
			primary: {
				ready: this.isPlatformReady,
				provider: this.platformProvider?.getProviderType() ?? null,
				error: this.isPlatformReady ? null : 'Provider not ready',
			},
			local: {
				ready: this.isLocalReady,
				initialized: this.isLocalReady,
				status: this.localProvider?.getStatus(),
			},
			cache: { hits: this.cacheHits, misses: this.cacheMisses },
		};
	}

	getOptimalProvider(): 'ollama' | 'local' | 'fallback' {
		if (this.config.providerSelection.preferLocal && this.isLocalReady) {
			return 'local';
		}
		if (this.isPlatformReady) {
			return 'ollama';
		}
				return 'fallback';
	}

	async switchProviderWithContext(
		target: 'local' | 'ollama',
		contextId: string,
	): Promise<{ success: boolean; newProvider: 'local' | 'ollama' | 'fallback' }> {
		if (target === 'local') {
			this.config.providerSelection.preferLocal = true;
		} else {
			this.config.providerSelection.preferLocal = false;
		}

		const available = target === 'local' ? this.isLocalReady : this.isPlatformReady;
		const newProvider = available ? target : this.getOptimalProvider();
		if (this.contextStates.has(contextId)) {
			const state = this.contextStates.get(contextId)!;
			state.lastProvider = newProvider;
		}
		return { success: available, newProvider };
	}

	getProviderRecommendation(
		contextId: string,
	): { recommended: 'local' | 'ollama' | 'fallback'; reason: string; confidence: number } {
		const optimal = this.getOptimalProvider();
		const reason =
			optimal === 'local'
				? 'Local provider ready'
				: optimal === 'ollama'
					? 'Remote provider available'
					: 'Using rule-based fallback';

			return {
			recommended: optimal,
			reason,
			confidence: optimal === 'fallback' ? 0.4 : 0.8,
		};
	}

	async reset(): Promise<void> {
		this.responseCache.clear();
		this.cacheHits = 0;
		this.cacheMisses = 0;
		this.initializePromise = this.initializeProviders();
		await this.ensureInitialized();
	}

	private computeOverallStatus(): 'healthy' | 'degraded' | 'offline' {
		if (this.isPlatformReady || this.isLocalReady) {
			if (this.isPlatformReady && !this.isLocalReady && this.config.local.enabled) {
				return 'degraded';
			}
			return 'healthy';
		}
		return 'offline';
	}

	private getCacheHitRate(): number {
		const total = this.cacheHits + this.cacheMisses;
		if (total === 0) return 0;
		return Number(((this.cacheHits / total) * 100).toFixed(2));
	}
}

export const DefaultAIConfig: AIServiceConfig = {
	ollama: {
		enabled: true,
		baseUrl: 'http://localhost:11434',
		model: 'llama3.2',
		timeout: 30000,
	},
	local: {
		enabled: false,
		modelPath: DEFAULT_LOCAL_MODEL_PATH,
		powerSavingMode: false,
		priority: 2,
	},
	fallback: {
		enabled: true,
	},
	performance: {
		timeout: 20000,
		retryAttempts: 2,
		cacheResponses: true,
		},
		providerSelection: {
			preferLocal: false,
		fallbackChain: ['ollama', 'local', 'rule-based'],
		healthCheckInterval: 15000,
	},
};

