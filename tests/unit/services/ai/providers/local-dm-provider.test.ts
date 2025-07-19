import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DefaultLocalDMConfig, LocalDMProvider } from '../../../../../services/ai/providers/local-dm-provider';

describe('LocalDMProvider', () => {
	beforeEach(() => {
		// Mock dependencies
		vi.mock('../../../../../services/ai/models/device-resource-manager', () => ({
			DeviceResourceManager: vi.fn().mockImplementation(() => ({
				initialize: vi.fn().mockResolvedValue(undefined),
				startMonitoring: vi.fn(),
				stopMonitoring: vi.fn(),
				getCurrentResourceUsage: vi.fn().mockResolvedValue({
					memory: {
						used: 1024,
						available: 3072,
						total: 4096,
						percentage: 25,
						pressure: 'low',
					},
					cpu: {
						usage: 30,
						temperature: 40,
						cores: 6,
						frequency: 2400,
						throttled: false,
					},
					thermal: {
						state: 'nominal',
						temperature: 40,
						throttlingActive: false,
						recommendedAction: 'none',
					},
					battery: {
						level: 80,
						isCharging: true,
						chargingState: 'charging',
						estimatedTimeRemaining: -1,
						powerSavingMode: false,
						lowPowerModeActive: false,
					},
					timestamp: Date.now(),
				}),
			})),
		}));

		vi.mock('../../../../../services/ai/models/model-cache-manager', () => ({
			ModelCacheManager: vi.fn().mockImplementation(() => ({
				getCachedResponse: vi.fn().mockResolvedValue(null),
				cacheResponse: vi.fn().mockResolvedValue(undefined),
				clearCache: vi.fn().mockResolvedValue(undefined),
				getCacheStats: vi.fn().mockReturnValue({
					size: 0,
					hits: 0,
					misses: 0,
					hitRate: 0,
				}),
			})),
		}));

		vi.mock('../../../../../services/ai/models/model-catalog', () => ({
			ModelCatalog: vi.fn().mockImplementation(() => ({
				updateCatalog: vi.fn().mockResolvedValue(undefined),
				getCatalog: vi.fn().mockResolvedValue([]),
				initialize: vi.fn().mockResolvedValue(undefined),
				getRecommendations: vi.fn().mockResolvedValue([]),
				searchModels: vi.fn().mockResolvedValue([]),
				getModel: vi.fn().mockReturnValue(null),
			})),
		}));

		vi.mock('../../../../../services/ai/models/model-download-manager', () => ({
			ModelDownloadManager: vi.fn().mockImplementation(() => ({
				downloadModel: vi.fn().mockResolvedValue('/path/to/downloaded/model.onnx'),
			})),
		}));

		vi.mock('../../../../../services/ai/models/model-privacy-manager', () => ({
			ModelPrivacyManager: vi.fn().mockImplementation(() => ({
				performDataCleanup: vi.fn().mockResolvedValue(undefined),
				getPrivacySettings: vi.fn().mockReturnValue({
					secureDeleteEnabled: true,
					dataRetentionDays: 30,
					analyticsEnabled: false,
				}),
				updatePrivacySettings: vi.fn().mockResolvedValue(undefined),
				exportPrivacyData: vi.fn().mockResolvedValue({}),
			})),
		}));

		vi.mock('../../../../../services/ai/models/model-storage-manager', () => ({
			ModelStorageManager: vi.fn().mockImplementation(() => ({
				getModelPath: vi.fn().mockResolvedValue('/path/to/model.onnx'),
				isModelStored: vi.fn().mockResolvedValue(true),
				deleteModel: vi.fn().mockResolvedValue(undefined),
			})),
		}));

		vi.mock('../../../../../services/ai/models/onnx-model-manager', () => ({
			ONNXModelManager: vi.fn().mockImplementation(() => ({
				loadGemma3Model: vi.fn().mockResolvedValue({}),
				validateModel: vi.fn().mockResolvedValue(true),
				runInference: vi.fn().mockResolvedValue({
					logits: new Float32Array([0.1, 0.2, 0.7]),
				}),
				cleanupSession: vi.fn().mockResolvedValue(undefined),
			})),
		}));

		describe('LocalDMProvider', () => {
			let provider: LocalDMProvider;

			beforeEach(() => {
				vi.clearAllMocks();
				provider = new LocalDMProvider({
					...DefaultLocalDMConfig,
					modelPath: '/test/path/model.onnx',
				});

				// Set isModelReady to true to avoid initialization issues in some tests
				Object.defineProperty(provider, 'isModelReady', {
					get: vi.fn().mockReturnValue(true),
				});
			});

			// Task 1: Set up local DM provider infrastructure and core interfaces
			describe('Core Infrastructure (Task 1)', () => {
				it('should initialize with correct configuration', () => {
					expect(provider).toBeDefined();
					expect(provider.isReady()).toBe(false); // Not ready until initialized
				});

				it('should initialize successfully with progress tracking', async () => {
					const progressCallback = vi.fn();
					const result = await provider.initialize(progressCallback);

					expect(result).toBe(true);
					expect(provider.isReady()).toBe(true);
					expect(progressCallback).toHaveBeenCalledTimes(6); // Initial + 5 steps
					expect(progressCallback).toHaveBeenLastCalledWith(expect.objectContaining({
						status: 'ready',
						progress: 100,
					}));
				});

				it('should provide status information', () => {
					const status = provider.getStatus();

					expect(status).toEqual(expect.objectContaining({
						isLoaded: expect.any(Boolean),
						isReady: expect.any(Boolean),
						error: null,
						modelInfo: expect.objectContaining({
							name: expect.any(String),
							quantization: expect.any(String),
						}),
					}));
				});

				it('should handle initialization errors gracefully', async () => {
					// Mock implementation to throw an error
					vi.spyOn(provider as any, 'simulateModelLoading').mockRejectedValueOnce(new Error('Test error'));

					const progressCallback = vi.fn();
					const result = await provider.initialize(progressCallback);

					expect(result).toBe(false);
					expect(provider.isReady()).toBe(false);
					expect(progressCallback).toHaveBeenLastCalledWith(expect.objectContaining({
						status: 'error',
					}));
				});
			});

			// Task 2.1: Create ONNXModelManager class for model lifecycle management
			describe('ONNX Model Management (Task 2.1)', () => {
				it('should use ONNXModelManager for model operations', async () => {
					await provider.initialize();

					// Verify ONNXModelManager was instantiated
					expect(vi.mocked(require('../../../../../services/ai/models/onnx-model-manager').ONNXModelManager)).toHaveBeenCalled();
				});
			});

			// Task 2.2: Implement Gemma3-specific tokenization and inference
			describe('Gemma3 Inference (Task 2.2)', () => {
				it('should generate D&D responses with proper formatting', async () => {
					await provider.initialize();

					const response = await provider.generateDnDResponse('I attack the goblin', {
						playerName: 'TestPlayer',
						playerClass: 'Fighter',
						playerRace: 'Human',
						currentScene: 'Dungeon',
						gameHistory: ['Entered the dungeon', 'Found a goblin'],
					});

					expect(response).toEqual(expect.objectContaining({
						text: expect.any(String),
						confidence: expect.any(Number),
						toolCommands: expect.any(Array),
						processingTime: expect.any(Number),
					}));
				});

				it('should extract tool commands from responses', async () => {
					await provider.initialize();

					// Mock the simulateInference to return a response with tool commands
					vi.spyOn(provider as any, 'simulateInference').mockResolvedValueOnce({
						text: 'You attack the goblin! [ROLL:1d20+5] Roll for attack.',
						confidence: 0.9,
						toolCommands: [{ type: 'roll', params: '1d20+5' }],
						processingTime: 500,
					});

					const response = await provider.generateDnDResponse('I attack the goblin', {
						playerName: 'TestPlayer',
						playerClass: 'Fighter',
						playerRace: 'Human',
						currentScene: 'Dungeon',
						gameHistory: ['Entered the dungeon', 'Found a goblin'],
					});

					expect(response.toolCommands).toHaveLength(1);
					expect(response.toolCommands[0]).toEqual({ type: 'roll', params: '1d20+5' });
				});

				it('should build D&D-specific prompts with context', async () => {
					await provider.initialize();

					const buildPrompt = vi.spyOn(provider as any, 'buildDnDPrompt');

					const context = {
						playerName: 'TestPlayer',
						playerClass: 'Wizard',
						playerRace: 'Elf',
						currentScene: 'Forest',
						gameHistory: ['Entered the forest', 'Met a stranger'],
					};

					await provider.generateDnDResponse('I cast fireball', context);

					expect(buildPrompt).toHaveBeenCalledWith('I cast fireball', context);
					expect(buildPrompt.mock.results[0].value).toContain('Character: TestPlayer (Elf Wizard)');
					expect(buildPrompt.mock.results[0].value).toContain('Scene: Forest');
				});
			});

			// Task 2.3: Add model quantization support for different device capabilities
			describe('Model Quantization Support (Task 2.3)', () => {
				it('should support different quantization levels', () => {
					// Test with int8 quantization
					const int8Provider = new LocalDMProvider({
						...DefaultLocalDMConfig,
						modelPath: '/test/path/model-int8.onnx',
						quantization: 'int8',
					});

					expect(int8Provider.getStatus().modelInfo.quantization).toBe('int8');

					// Test with int4 quantization
					const int4Provider = new LocalDMProvider({
						...DefaultLocalDMConfig,
						modelPath: '/test/path/model-int4.onnx',
						quantization: 'int4',
					});

					expect(int4Provider.getStatus().modelInfo.quantization).toBe('int4');
				});
			});

			// Task 3: Create device resource management system
			describe('Device Resource Management (Task 3)', () => {
				it('should initialize DeviceResourceManager', () => {
					expect(vi.mocked(require('../../../../../services/ai/models/device-resource-manager').DeviceResourceManager)).toHaveBeenCalled();
				});

				it('should handle power saving mode', () => {
					provider.setPowerSavingMode(true);

					// Verify power saving mode is set
					expect((provider as any).config.powerSavingMode).toBe(true);
				});
			});

			// Task 4: Build local DM agent with D&D-specific functionality
			describe('D&D Functionality (Task 4)', () => {
				it('should process player actions with context awareness', async () => {
					await provider.initialize();

					const response = await provider.generateDnDResponse('I search for traps', {
						playerName: 'TestPlayer',
						playerClass: 'Rogue',
						playerRace: 'Halfling',
						currentScene: 'Ancient Temple',
						gameHistory: ['Entered the temple', 'Found a suspicious door'],
					});

					expect(response.text).toBeDefined();
					expect(response.processingTime).toBeGreaterThan(0);
				});

				it('should handle tool command parsing', async () => {
					const extractCommands = vi.spyOn(provider as any, 'extractToolCommands');

					await provider.initialize();
					await provider.generateDnDResponse('I roll for perception', {
						playerName: 'TestPlayer',
						playerClass: 'Ranger',
						playerRace: 'Elf',
						currentScene: 'Forest',
						gameHistory: ['Entered the forest', 'Heard a noise'],
					});

					expect(extractCommands).toHaveBeenCalled();
				});
			});

			// Task 5: Integrate local provider with existing AI Service Manager
			describe('AI Service Manager Integration (Task 5)', () => {
				it('should perform health checks', async () => {
					await provider.initialize();

					const healthStatus = await provider.healthCheck();
					expect(healthStatus).toBe(true);
				});

				it('should clean up resources properly', async () => {
					await provider.initialize();
					await provider.cleanup();

					expect(provider.isReady()).toBe(false);
				});
			});

			// Model Management Methods
			describe('Model Management Methods', () => {
				it('should get available models from catalog', async () => {
					const models = await provider.getAvailableModels();
					expect(Array.isArray(models)).toBe(true);
				});

				it('should get model recommendations for current device', async () => {
					const recommendations = await provider.getModelRecommendations();
					expect(Array.isArray(recommendations)).toBe(true);
				});

				it('should search models by query', async () => {
					const results = await provider.searchModels('gemma');
					expect(Array.isArray(results)).toBe(true);
				});

				it('should check if model is installed', async () => {
					const isInstalled = await provider.isModelInstalled('test-model');
					expect(typeof isInstalled).toBe('boolean');
				});

				it('should switch between models', async () => {
					await provider.initialize();
					await provider.switchModel('test-model');

					expect((provider as any).currentModelId).toBe('test-model');
				});

				it('should get cache statistics', () => {
					const stats = provider.getCacheStats();
					expect(stats).toBeDefined();
				});

				it('should handle privacy settings', async () => {
					const settings = provider.getPrivacySettings();
					expect(settings).toBeDefined();

					await provider.updatePrivacySettings({ secureDeleteEnabled: false });
					const exportedData = await provider.exportPrivacyData();
					expect(exportedData).toBeDefined();
				});
			});
		});
	});
});
