import type { LocalDMResponse } from './providers/local-dm-provider';
import { LocalDMProvider } from './providers/local-dm-provider';
import { OllamaProvider } from './providers/ollama-provider';

export type ProviderType = 'ollama' | 'local' | 'rule-based';

export interface AIServiceConfig {
	ollama: { enabled: boolean; apiKey?: string };
	local: { enabled: boolean; powerSavingMode?: boolean };
	fallback: { enabled: boolean };
	performance: { cacheResponses: boolean };
	providerSelection: { preferLocal: boolean; fallbackChain: ProviderType[] };
}

export const DefaultAIConfig: AIServiceConfig = {
	ollama: { enabled: true },
	local: { enabled: true, powerSavingMode: false },
	fallback: { enabled: true },
	performance: { cacheResponses: true },
	providerSelection: { preferLocal: true, fallbackChain: ['local', 'ollama', 'rule-based'] },
};

interface GameContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
}

interface ProviderHealth {
	healthy: boolean;
	consecutiveFailures: number;
}

export class AIServiceManager {
	private config: AIServiceConfig;
	private localDMProvider: LocalDMProvider;
	private ollamaProvider: OllamaProvider;

	private gameContextStates = new Map<string, GameContext>();
	private conversationHistory = new Map<string, Array<{ role: 'user' | 'assistant'; text: string }>>();
	private responseCache = new Map<string, any>();
	private providerHealthStatus: Record<'ollama' | 'local', ProviderHealth> = {
		ollama: { healthy: true, consecutiveFailures: 0 },
		local: { healthy: true, consecutiveFailures: 0 },
	};

	constructor(config: Partial<AIServiceConfig> = {}) {
		this.config = { ...DefaultAIConfig, ...config };
		this.localDMProvider = new LocalDMProvider({
			modelPath: '/stub',
			contextSize: 0,
			maxTokens: 0,
			temperature: 0.7,
			enableResourceMonitoring: false,
			powerSavingMode: this.config.local.powerSavingMode ?? false,
		});
		this.ollamaProvider = new OllamaProvider({
			baseUrl: process.env.EXPO_PUBLIC_OLLAMA_HOST || 'https://ollama.com',
			defaultModel: process.env.EXPO_PUBLIC_OLLAMA_MODEL || 'gpt-oss:120b-cloud',
			timeout: 30000,
			apiKey: config.ollama?.apiKey || process.env.EXPO_PUBLIC_OLLAMA_API_KEY,
		});
	}

	getOptimalProvider(): ProviderType {
		return this.config.providerSelection.preferLocal ? 'local' : 'ollama';
	}

	async switchProvider(update: Partial<AIServiceConfig>): Promise<boolean> {
		this.config = { ...this.config, ...update };
		return true;
	}

	async switchProviderWithContext(provider: ProviderType, contextId: string) {
		return { success: true, newProvider: provider, contextPreserved: this.gameContextStates.has(contextId) };
	}

	createGameContext(id: string, ctx: GameContext) {
		this.gameContextStates.set(id, { ...ctx });
		this.conversationHistory.set(id, []);
	}

	getGameContext(id: string) {
		return this.gameContextStates.get(id);
	}

	updateGameContext(id: string, patch: Partial<GameContext>) {
		const current = this.gameContextStates.get(id);
		if (!current) return false;
		this.gameContextStates.set(id, { ...current, ...patch });
		return true;
	}

	getConversationHistory(id: string) {
		return this.conversationHistory.get(id) ?? [];
	}

	getProviderRecommendation(_id: string) {
		return { recommended: this.getOptimalProvider(), reason: 'stub', confidence: 0.5 };
	}

	async generateDnDResponseWithContext(prompt: string, contextId: string, fallbackCtx: GameContext) {
		if (!this.gameContextStates.has(contextId)) {
			this.createGameContext(contextId, fallbackCtx);
		}
		const response = await this.generateDnDResponse(prompt, fallbackCtx);
		const history = this.conversationHistory.get(contextId) ?? [];
		history.push({ role: 'user', text: prompt });
		history.push({ role: 'assistant', text: response.text });
		this.conversationHistory.set(contextId, history);
		return { ...response, contextId };
	}

	async generateDnDResponse(prompt: string, _ctx: GameContext): Promise<LocalDMResponse> {
		const cacheKey = this.generateCacheKey(prompt, _ctx);
		if (this.config.performance.cacheResponses && this.responseCache.has(cacheKey)) {
			return this.responseCache.get(cacheKey);
		}
		const chain = this.config.providerSelection.fallbackChain;
		for (const provider of chain) {
			let result: LocalDMResponse | null = null;
			if (provider === 'local' && this.config.local.enabled) {
				result = await this.tryLocalProvider(prompt, _ctx);
			} else if (provider === 'ollama' && this.config.ollama.enabled && this.ollamaProvider) {
				const res = await this.ollamaProvider.completion([{
					role: 'user',
					content: prompt,
				}]);
				result = {
					text: res,
					confidence: 0.9,
					processingTime: 1,
					source: 'ollama',
					toolCommands: [],
					contextId: undefined,
				};
			} else if (provider === 'rule-based') {
				result = await this.tryRuleBasedProvider(prompt);
			}
			if (result) {
				if (this.config.performance.cacheResponses) {
					this.responseCache.set(cacheKey, result);
				}
				return result;
			}
		}
		return { text: 'No response', confidence: 0.1, toolCommands: [], processingTime: 1, source: 'fallback' };
	}

	private async tryRuleBasedProvider(prompt: string): Promise<LocalDMResponse> {
		return { text: `Rule-based: ${prompt}`, confidence: 0.5, toolCommands: [], processingTime: 1, source: 'fallback' };
	}

	private async tryLocalProvider(prompt: string, ctx: GameContext): Promise<LocalDMResponse | null> {
		return this.localDMProvider.generateDnDResponse(prompt, ctx);
	}

	getServiceStatus() {
		return {
			ollama: { status: 'ready' },
			local: { status: 'ready' },
			overall: 'healthy',
		};
	}

	getDetailedStatus() {
		return {
			ollama: { ready: true },
			local: { ready: true },
			fallback: { ready: true },
		};
	}

	async performHealthChecks() {
		this.providerHealthStatus.ollama.healthy = true;
		this.providerHealthStatus.local.healthy = true;
	}

	getProviderHealthStatus() {
		return {
			...this.providerHealthStatus,
			optimal: this.getOptimalProvider(),
		};
	}

	setPowerSavingMode(enabled: boolean) {
		this.config.local.powerSavingMode = enabled;
		this.localDMProvider.setPowerSavingMode(enabled);
	}

	getOptimalProviderStatus() {
		return this.getOptimalProvider();
	}

	async cleanup() {
		await this.localDMProvider.cleanup();
		this.gameContextStates.clear();
		this.responseCache.clear();
	}

	reset() {
		this.responseCache.clear();
	}

	protected generateCacheKey(prompt: string, ctx: Partial<GameContext>) {
		return `${prompt}:${ctx.currentScene ?? ''}:${ctx.playerClass ?? ''}`;
	}
}
