import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	DefaultLocalDMConfig,
	LocalDMProvider,
} from '../../../../../services/ai/providers/local-dm-provider';

describe('LocalDMProvider', () => {
	beforeEach(() => {
		// Mock dependencies using vi.spyOn
		const {
			DeviceResourceManager,
		} = require('../../../../../services/ai/models/device-resource-manager');
		vi.spyOn(DeviceResourceManager.prototype, 'initialize').mockResolvedValue(undefined);
		vi.spyOn(DeviceResourceManager.prototype, 'startMonitoring').mockImplementation(() => {});
		vi.spyOn(DeviceResourceManager.prototype, 'stopMonitoring').mockImplementation(() => {});
		vi.spyOn(DeviceResourceManager.prototype, 'getCurrentResourceUsage').mockResolvedValue({
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
		});

		const {
			ModelCacheManager,
		} = require('../../../../../services/ai/models/model-cache-manager');
		vi.spyOn(ModelCacheManager.prototype, 'getCachedResponse').mockResolvedValue(null);
		vi.spyOn(ModelCacheManager.prototype, 'cacheResponse').mockResolvedValue(undefined);
		vi.spyOn(ModelCacheManager.prototype, 'clearCache').mockResolvedValue(undefined);
		vi.spyOn(ModelCacheManager.prototype, 'getCacheStats').mockReturnValue({
			size: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
		});

		const { ModelCatalog } = require('../../../../../services/ai/models/model-catalog');
		vi.spyOn(ModelCatalog.prototype, 'updateCatalog').mockResolvedValue(undefined);
		vi.spyOn(ModelCatalog.prototype, 'getCatalog').mockResolvedValue([]);
		vi.spyOn(ModelCatalog.prototype, 'initialize').mockResolvedValue(undefined);
		vi.spyOn(ModelCatalog.prototype, 'getRecommendations').mockResolvedValue([]);
		vi.spyOn(ModelCatalog.prototype, 'searchModels').mockResolvedValue([]);
		vi.spyOn(ModelCatalog.prototype, 'getModel').mockReturnValue(null);

		const {
			ModelDownloadManager,
		} = require('../../../../../services/ai/models/model-download-manager');
		vi.spyOn(ModelDownloadManager.prototype, 'downloadModel').mockResolvedValue(
			'/path/to/downloaded/model.onnx',
		);

		const {
			ModelPrivacyManager,
		} = require('../../../../../services/ai/models/model-privacy-manager');
		vi.spyOn(ModelPrivacyManager.prototype, 'performDataCleanup').mockResolvedValue(undefined);
		vi.spyOn(ModelPrivacyManager.prototype, 'getPrivacySettings').mockReturnValue({
			secureDeleteEnabled: true,
			dataRetentionDays: 30,
			analyticsEnabled: false,
		});
		vi.spyOn(ModelPrivacyManager.prototype, 'updatePrivacySettings').mockResolvedValue(
			undefined,
		);
		vi.spyOn(ModelPrivacyManager.prototype, 'exportPrivacyData').mockResolvedValue({});

		const {
			ModelStorageManager,
		} = require('../../../../../services/ai/models/model-storage-manager');
		vi.spyOn(ModelStorageManager.prototype, 'getModelPath').mockResolvedValue(
			'/path/to/model.onnx',
		);
		vi.spyOn(ModelStorageManager.prototype, 'isModelStored').mockResolvedValue(true);
		vi.spyOn(ModelStorageManager.prototype, 'deleteModel').mockResolvedValue(undefined);

		const {
			ONNXModelManager,
		} = require('../../../../../services/ai/models/onnx-model-manager');
		vi.spyOn(ONNXModelManager.prototype, 'loadGemma3Model').mockResolvedValue({});
		vi.spyOn(ONNXModelManager.prototype, 'validateModel').mockResolvedValue(true);
		vi.spyOn(ONNXModelManager.prototype, 'runInference').mockResolvedValue({
			logits: new Float32Array([0.1, 0.2, 0.7]),
		});
		vi.spyOn(ONNXModelManager.prototype, 'cleanupSession').mockResolvedValue(undefined);

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
					expect(progressCallback).toHaveBeenLastCalledWith(
						expect.objectContaining({
							status: 'ready',
							progress: 100,
						}),
					);
				});

				it('should provide status information', () => {
					const status = provider.getStatus();

					expect(status).toEqual(
						expect.objectContaining({
							isLoaded: expect.any(Boolean),
							isReady: expect.any(Boolean),
							error: null,
							modelInfo: expect.objectContaining({
								name: expect.any(String),
								quantization: expect.any(String),
							}),
						}),
					);
				});

				it('should handle initialization errors gracefully', async () => {
					// Mock implementation to throw an error
					vi.spyOn(provider as any, 'simulateModelLoading').mockRejectedValueOnce(
						new Error('Test error'),
					);

					const progressCallback = vi.fn();
					const result = await provider.initialize(progressCallback);

					expect(result).toBe(false);
					expect(provider.isReady()).toBe(false);
					expect(progressCallback).toHaveBeenLastCalledWith(
						expect.objectContaining({
							status: 'error',
						}),
					);
				});
			});

			// Task 2.1: Create ONNXModelManager class for model lifecycle management
			describe('ONNX Model Management (Task 2.1)', () => {
				it('should use ONNXModelManager for model operations', async () => {
					await provider.initialize();

					// Verify ONNXModelManager was instantiated
					expect(
						vi.mocked(
							require('../../../../../services/ai/models/onnx-model-manager')
								.ONNXModelManager,
						),
					).toHaveBeenCalled();
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

					expect(response).toEqual(
						expect.objectContaining({
							text: expect.any(String),
							confidence: expect.any(Number),
							toolCommands: expect.any(Array),
							processingTime: expect.any(Number),
						}),
					);
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
					expect(buildPrompt.mock.results[0].value).toContain(
						'Character: TestPlayer (Elf Wizard)',
					);
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
					expect(
						vi.mocked(
							require('../../../../../services/ai/models/device-resource-manager')
								.DeviceResourceManager,
						),
					).toHaveBeenCalled();
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

					expect((provider as unknown).currentModelId).toBe('test-model');
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
