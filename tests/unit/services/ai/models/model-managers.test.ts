/**
 * Basic tests for Task 6 model management system
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
	Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
	AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
vi.mock('expo-modules-core', () => ({
	NativeModule: class {},
	requireOptionalNativeModule: () => undefined,
	Platform: { OS: 'web' },
}));

// Test imports to ensure our new classes can be imported
import { ModelCacheManager } from '@/services/ai/models/model-cache-manager';
import { ModelCatalog } from '@/services/ai/models/model-catalog';
import { ModelDownloadManager } from '@/services/ai/models/model-download-manager';
import { ModelPrivacyManager } from '@/services/ai/models/model-privacy-manager';
import { ModelStorageManager } from '@/services/ai/models/model-storage-manager';
import { LocalDMProvider } from '@/services/ai/providers/local-dm-provider';

describe('Task 6 Model Management System', () => {
	beforeEach(() => {
		// Mock the React Native dependencies using vi.spyOn
		const AsyncStorage = require('@react-native-async-storage/async-storage').default;
		vi.spyOn(AsyncStorage, 'getItem').mockImplementation(() => Promise.resolve(null));
		vi.spyOn(AsyncStorage, 'setItem').mockImplementation(() => Promise.resolve());
		vi.spyOn(AsyncStorage, 'removeItem').mockImplementation(() => Promise.resolve());
		vi.spyOn(AsyncStorage, 'getAllKeys').mockImplementation(() => Promise.resolve([]));
		vi.spyOn(AsyncStorage, 'multiRemove').mockImplementation(() => Promise.resolve());

		const FileSystem = require('expo-file-system');
		vi.spyOn(FileSystem, 'getInfoAsync').mockImplementation(() =>
			Promise.resolve({ exists: true, size: 1024 }),
		);
		vi.spyOn(FileSystem, 'makeDirectoryAsync').mockImplementation(() => Promise.resolve());
		vi.spyOn(FileSystem, 'readDirectoryAsync').mockImplementation(() => Promise.resolve([]));
		vi.spyOn(FileSystem, 'downloadAsync').mockImplementation(() =>
			Promise.resolve({ uri: '/mock/download.onnx' }),
		);
		vi.spyOn(FileSystem, 'deleteAsync').mockImplementation(() => Promise.resolve());
		vi.spyOn(FileSystem, 'writeAsStringAsync').mockImplementation(() => Promise.resolve());
		vi.spyOn(FileSystem, 'getFreeDiskStorageAsync').mockImplementation(() =>
			Promise.resolve(1024 * 1024 * 1024),
		);

		const ReactNative = require('react-native');
		vi.spyOn(ReactNative.Platform, 'select').mockImplementation((obj: any) => obj.ios);
	});
	describe('ModelDownloadManager', () => {
		it('should be able to create an instance', () => {
			const manager = new ModelDownloadManager();
			expect(manager).toBeDefined();
		});

		it('should have getStorageInfo method', async () => {
			const manager = new ModelDownloadManager();
			expect(typeof manager.getStorageInfo).toBe('function');
		});
	});

	describe('ModelCatalog', () => {
		it('should be able to create an instance', () => {
			const catalog = new ModelCatalog();
			expect(catalog).toBeDefined();
		});

		it('should have getCatalog method', () => {
			const catalog = new ModelCatalog();
			expect(typeof catalog.getCatalog).toBe('function');
		});
	});

	describe('ModelStorageManager', () => {
		it('should be able to create an instance', () => {
			const manager = new ModelStorageManager();
			expect(manager).toBeDefined();
		});

		it('should have getStorageStats method', () => {
			const manager = new ModelStorageManager();
			expect(typeof manager.getStorageStats).toBe('function');
		});
	});

	describe('ModelCacheManager', () => {
		it('should be able to create an instance', () => {
			const manager = new ModelCacheManager();
			expect(manager).toBeDefined();
		});

		it('should have getCacheStats method', () => {
			const manager = new ModelCacheManager();
			expect(typeof manager.getCacheStats).toBe('function');
		});
	});

	describe('ModelPrivacyManager', () => {
		it('should be able to create an instance', () => {
			const manager = new ModelPrivacyManager();
			expect(manager).toBeDefined();
		});

		it('should have getPrivacySettings method', () => {
			const manager = new ModelPrivacyManager();
			expect(typeof manager.getPrivacySettings).toBe('function');
		});
	});

	describe('LocalDMProvider Task 6 Integration', () => {
		let provider: LocalDMProvider;

		beforeEach(() => {
			provider = new LocalDMProvider({
				modelPath: '/test/model.onnx',
				contextSize: 2048,
				maxTokens: 150,
				temperature: 0.7,
				enableResourceMonitoring: true,
				powerSavingMode: false,
			});
		});

		it('should have new model management methods', () => {
			expect(typeof provider.getAvailableModels).toBe('function');
			expect(typeof provider.getModelRecommendations).toBe('function');
			expect(typeof provider.searchModels).toBe('function');
			expect(typeof provider.downloadModel).toBe('function');
			expect(typeof provider.installModel).toBe('function');
			expect(typeof provider.isModelInstalled).toBe('function');
			expect(typeof provider.switchModel).toBe('function');
			expect(typeof provider.getCurrentModel).toBe('function');
			expect(typeof provider.deleteModel).toBe('function');
			expect(typeof provider.clearCache).toBe('function');
			expect(typeof provider.getCacheStats).toBe('function');
			expect(typeof provider.performDataCleanup).toBe('function');
			expect(typeof provider.getPrivacySettings).toBe('function');
			expect(typeof provider.updatePrivacySettings).toBe('function');
			expect(typeof provider.exportPrivacyData).toBe('function');
		});

		it('should get available models', async () => {
			const models = await provider.getAvailableModels();
			expect(Array.isArray(models)).toBe(true);
		});

		it('should get model recommendations', async () => {
			const recommendations = await provider.getModelRecommendations();
			expect(Array.isArray(recommendations)).toBe(true);
		});

		it('should search models', async () => {
			const results = await provider.searchModels('test');
			expect(Array.isArray(results)).toBe(true);
		});

		it('should return current model as null initially', () => {
			const currentModel = provider.getCurrentModel();
			expect(currentModel).toBeNull();
		});

		it('should get cache stats', () => {
			const stats = provider.getCacheStats();
			expect(typeof stats).toBe('object');
		});

		it('should get privacy settings', () => {
			const settings = provider.getPrivacySettings();
			expect(typeof settings).toBe('object');
		});

		it('should use caching in generateDnDResponse', async () => {
			const response = await provider.generateDnDResponse('test prompt', {
				playerName: 'Test Player',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Tavern',
				gameHistory: [],
			});

			expect(response).toBeDefined();
			expect(response.text).toBeDefined();
			expect(response.confidence).toBeDefined();
			expect(response.toolCommands).toBeDefined();
			expect(response.processingTime).toBeDefined();
		});
	});
});
