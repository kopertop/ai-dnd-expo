import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AIServiceManager, DefaultAIConfig } from '../../../../../services/ai/ai-service-manager';
import { CactusAIProvider } from '../../../../../services/ai/providers/cactus-provider';
import { LocalDMProvider } from '../../../../../services/ai/providers/local-dm-provider';

describe('AIServiceManager', () => {
	let serviceManager: AIServiceManager;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock LocalDMProvider
		vi.mock('../../../../../services/ai/providers/local-dm-provider', () => ({
			LocalDMProvider: vi.fn().mockImplementation(() => ({
				initialize: vi.fn().mockResolvedValue(true),
				generateDnDResponse: vi.fn().mockResolvedValue({
					text: 'Local DM response',
					confidence: 0.9,
					toolCommands: [],
					processingTime: 500,
				}),
				healthCheck: vi.fn().mockResolvedValue(true),
				isReady: vi.fn().mockReturnValue(true),
				getStatus: vi.fn().mockReturnValue({
					isLoaded: true,
					isReady: true,
					error: null,
					modelInfo: {
						name: 'test-model',
						quantization: 'int8',
					},
				}),
				setPowerSavingMode: vi.fn(),
				cleanup: vi.fn().mockResolvedValue(undefined),
			})),
			DefaultLocalDMConfig: {
				modelPath: '/test/path/model.onnx',
				contextSize: 2048,
				maxTokens: 150,
				temperature: 0.7,
				enableResourceMonitoring: true,
				powerSavingMode: false,
			},
		}));

		// Mock CactusAIProvider
		vi.mock('../../../../../services/ai/providers/cactus-provider', () => ({
			CactusAIProvider: vi.fn().mockImplementation(() => ({
				initialize: vi.fn().mockResolvedValue(true),
				generateDnDResponse: vi.fn().mockResolvedValue({
					text: 'Cactus response',
					metadata: {
						toolCommands: [],
					},
				}),
				healthCheck: vi.fn().mockResolvedValue(true),
				isReady: vi.fn().mockReturnValue(true),
				getStatus: vi.fn().mockReturnValue({
					isReady: true,
					error: null,
				}),
				cleanup: vi.fn().mockResolvedValue(undefined),
			})),
		}));

		serviceManager = new AIServiceManager({
			...DefaultAIConfig,
			cactus: {
				...DefaultAIConfig.cactus,
				enabled: true,
			},
			local: {
				...DefaultAIConfig.local,
				enabled: true,
			},
		});
	});

	// Task 5.1: Extend AI Service Manager to support local provider
	describe('Local Provider Integration (Task 5.1)', () => {
		it('should initialize both Cactus and Local providers', () => {
			expect(CactusAIProvider).toHaveBeenCalled();
			expect(LocalDMProvider).toHaveBeenCalled();
		});

		it('should get service status with both providers', async () => {
			const status = await serviceManager.getServiceStatus();

			expect(status.cactus).toBeDefined();
			expect(status.local).toBeDefined();
			expect(status.overall).toBe('healthy');
		});

		it('should get detailed status of all providers', () => {
			const status = serviceManager.getDetailedStatus();

			expect(status.cactus).toBeDefined();
			expect(status.local).toBeDefined();
			expect(status.fallback).toBeDefined();
		});
	});

	// Task 5.2: Add provider switching and state management
	describe('Provider Switching (Task 5.2)', () => {
		it('should get optimal provider based on configuration', () => {
			// Default config prefers local
			expect(serviceManager.getOptimalProvider()).toBe('local');

			// Create a service manager that prefers Cactus
			const cactusFirstManager = new AIServiceManager({
				...DefaultAIConfig,
				providerSelection: {
					...DefaultAIConfig.providerSelection,
					preferLocal: false,
					fallbackChain: ['cactus', 'local', 'rule-based'],
				},
			});

			expect(cactusFirstManager.getOptimalProvider()).toBe('cactus');
		});

		it('should switch provider configuration dynamically', async () => {
			const result = await serviceManager.switchProvider({
				providerSelection: {
					preferLocal: false,
					fallbackChain: ['cactus', 'local', 'rule-based'],
					healthCheckInterval: 60000,
				},
			});

			expect(result).toBe(true);
			expect(serviceManager.getOptimalProvider()).toBe('cactus');
		});

		it('should switch provider while preserving game context', async () => {
			// Create a game context
			serviceManager.createGameContext('test-context', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			const result = await serviceManager.switchProviderWithContext('cactus', 'test-context');

			expect(result.success).toBe(true);
			expect(result.newProvider).toBe('cactus');
			expect(result.contextPreserved).toBe(true);
		});
	});

	// Task 5.3: Update enhanced dungeon master hook integration
	describe('Game Context Management (Task 5.3)', () => {
		it('should create and update game context', () => {
			serviceManager.createGameContext('test-context', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			const context = serviceManager.getGameContext('test-context');
			expect(context).toBeDefined();
			expect(context?.playerName).toBe('TestPlayer');

			const updated = serviceManager.updateGameContext('test-context', {
				currentScene: 'Tavern',
			});

			expect(updated).toBe(true);
			expect(serviceManager.getGameContext('test-context')?.currentScene).toBe('Tavern');
		});

		it('should generate responses with context-aware provider selection', async () => {
			const response = await serviceManager.generateDnDResponseWithContext(
				'I look around',
				'test-context',
				{
					playerName: 'TestPlayer',
					playerClass: 'Fighter',
					playerRace: 'Human',
					currentScene: 'Dungeon',
					gameHistory: ['Entered the dungeon'],
				},
			);

			expect(response).toBeDefined();
			expect(response.contextId).toBe('test-context');

			// Check that conversation history was updated
			const history = serviceManager.getConversationHistory('test-context');
			expect(history).toHaveLength(2); // User message + AI response
		});

		it('should get provider recommendations based on context', () => {
			serviceManager.createGameContext('test-context', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			const recommendation = serviceManager.getProviderRecommendation('test-context');

			expect(recommendation).toEqual(expect.objectContaining({
				recommended: expect.any(String),
				reason: expect.any(String),
				confidence: expect.any(Number),
			}));
		});
	});

	// Test fallback chain
	describe('Fallback Chain', () => {
		it('should try providers in the configured order', async () => {
			const tryLocalSpy = vi.spyOn(serviceManager as any, 'tryLocalProvider');
			const tryCactusSpy = vi.spyOn(serviceManager as any, 'tryCactusProvider');
			const tryRuleBasedSpy = vi.spyOn(serviceManager as any, 'tryRuleBasedProvider');

			await serviceManager.generateDnDResponse('Hello', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			// With default config, local should be tried first
			expect(tryLocalSpy).toHaveBeenCalled();

			// Create a service manager with local provider failing
			const localFailManager = new AIServiceManager({
				...DefaultAIConfig,
				local: {
					...DefaultAIConfig.local,
					enabled: true,
				},
			});

			// Mock local provider to fail
			vi.spyOn(localFailManager as any, 'tryLocalProvider').mockResolvedValue(null);
			vi.spyOn(localFailManager as any, 'tryCactusProvider').mockImplementation(async (...args) => {
				return await serviceManager['tryCactusProvider'](...args);
			});

			await localFailManager.generateDnDResponse('Hello', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			// Cactus should be tried as fallback
			expect(localFailManager['tryCactusProvider']).toHaveBeenCalled();
		});

		it('should fall back to rule-based provider when all else fails', async () => {
			// Create a service manager with both providers failing
			const allFailManager = new AIServiceManager({
				...DefaultAIConfig,
				local: {
					...DefaultAIConfig.local,
					enabled: true,
				},
				cactus: {
					...DefaultAIConfig.cactus,
					enabled: true,
				},
			});

			// Mock providers to fail
			vi.spyOn(allFailManager as any, 'tryLocalProvider').mockResolvedValue(null);
			vi.spyOn(allFailManager as any, 'tryCactusProvider').mockResolvedValue(null);

			const response = await allFailManager.generateDnDResponse('Hello', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			expect(response.source).toBe('fallback');
		});
	});

	// Test health monitoring
	describe('Health Monitoring', () => {
		it('should perform health checks on providers', async () => {
			await (serviceManager as any).performHealthChecks();

			expect(serviceManager['providerHealthStatus'].cactus.healthy).toBe(true);
			expect(serviceManager['providerHealthStatus'].local.healthy).toBe(true);
		});

		it('should handle provider failures', async () => {
			// Mock Cactus provider to fail health check
			vi.spyOn(serviceManager['cactusProvider'] as any, 'healthCheck').mockResolvedValue(false);

			await (serviceManager as any).performHealthChecks();

			expect(serviceManager['providerHealthStatus'].cactus.healthy).toBe(false);
			expect(serviceManager['providerHealthStatus'].cactus.consecutiveFailures).toBe(1);
		});

		it('should get provider health status', () => {
			const status = serviceManager.getProviderHealthStatus();

			expect(status).toEqual(expect.objectContaining({
				cactus: expect.any(Object),
				local: expect.any(Object),
				optimal: expect.any(String),
			}));
		});
	});

	// Test resource management
	describe('Resource Management', () => {
		it('should set power saving mode', () => {
			serviceManager.setPowerSavingMode(true);

			expect(serviceManager['localDMProvider']?.setPowerSavingMode).toHaveBeenCalledWith(true);
			expect(serviceManager['config'].local.powerSavingMode).toBe(true);
		});

		it('should clean up resources', async () => {
			await serviceManager.cleanup();

			expect(serviceManager['localDMProvider']?.cleanup).toHaveBeenCalled();
			expect(serviceManager['cactusProvider']).toBeNull();
			expect(serviceManager['gameContextStates'].size).toBe(0);
		});
	});

	// Test response caching
	describe('Response Caching', () => {
		it('should cache responses when enabled', async () => {
			// Enable caching
			serviceManager['config'].performance.cacheResponses = true;

			const context = {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			};

			// First call should generate a response
			await serviceManager.generateDnDResponse('Hello', context);

			// Get the cache key
			const cacheKey = (serviceManager as any).generateCacheKey('Hello', {
				currentScene: context.currentScene,
				playerClass: context.playerClass,
			});

			// Verify response was cached
			expect(serviceManager['responseCache'].has(cacheKey)).toBe(true);

			// Mock the providers to track if they're called
			const localProviderSpy = vi.spyOn(serviceManager['localDMProvider'] as any, 'generateDnDResponse');

			// Second call with same input should use cache
			await serviceManager.generateDnDResponse('Hello', context);

			// Provider should not be called again
			expect(localProviderSpy).not.toHaveBeenCalled();
		});

		it('should reset cache on reset', async () => {
			// Add something to cache
			serviceManager['responseCache'].set('test-key', {
				text: 'Test response',
				confidence: 0.9,
				source: 'local',
				toolCommands: [],
				processingTime: 500,
			});

			await serviceManager.reset();

			expect(serviceManager['responseCache'].size).toBe(0);
		});
	});
});
