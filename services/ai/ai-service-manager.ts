import type { LocalDMResponse, ResourceUsage } from './providers/local-dm-provider';
import { LocalDMProvider } from './providers/local-dm-provider';

export type ProviderType = 'local' | 'ollama' | 'rule-based' | 'fallback';

export interface ServiceStatus {
	primary: { available: boolean; latency?: number };
	local: { available: boolean; resourceUsage?: ResourceUsage };
	cache: { size: number; hitRate: number };
	overall: 'healthy' | 'degraded' | 'offline';
}

export interface DetailedServiceStatus {
	local: {
		ready: boolean;
		initialized: boolean;
		status?: { error?: string | null; resourceUsage?: ResourceUsage };
	};
	fallback: { ready: boolean };
	ollama?: { ready: boolean; status?: { error?: string | null } };
}

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
	providerSelection: { preferLocal: true, fallbackChain: ['local', 'ollama', 'fallback'] },
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

	private gameContextStates = new Map<string, GameContext>();
	private conversationHistory = new Map<string, Array<{ role: 'user' | 'assistant'; text: string }>>();
	private responseCache = new Map<string, any>();
	private providerHealthStatus: Record<'local', ProviderHealth> = {
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
	}

	getOptimalProvider(): ProviderType {
		return this.config.providerSelection.preferLocal ? 'local' : 'fallback';
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
			} else if (provider === 'rule-based' || provider === 'fallback') {
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

	getServiceStatus(): ServiceStatus {
		return {
			primary: { available: true, latency: 0 },
			local: {
				available: true,
				resourceUsage: {
					memory: { used: 0, available: 0, total: 0, percentage: 0, pressure: 'low' },
					cpu: { usage: 0, temperature: 0, cores: 0, frequency: 0, throttled: false },
					battery: {
						level: 100,
						isCharging: true,
						chargingState: 'charging',
						estimatedTimeRemaining: 0,
						powerSavingMode: false,
						lowPowerModeActive: false,
					},
					thermal: { state: 'nominal', temperature: 0, throttlingActive: false, recommendedAction: 'none' },
					timestamp: Date.now(),
				},
			},
			cache: { size: this.responseCache.size, hitRate: 1 },
			overall: 'healthy' as const,
		};
	}

	getDetailedStatus(): DetailedServiceStatus {
		return {
			local: { ready: true, initialized: true, status: { error: null } },
			fallback: { ready: true },
			ollama: { ready: false, status: { error: 'Not configured' } },
		};
	}

	async performHealthChecks() {
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
