import { beforeEach, vi } from 'vitest';

// Ensure __DEV__ is defined for modules that expect it
(globalThis as any).__DEV__ = false;

// Hoisted mocks so modules under test resolve to stubs during transform
vi.mock('react-native', () => ({
	Platform: {
		OS: 'ios',
		select: (obj: any) => obj.ios || obj.default,
	},
	AppState: {
		addEventListener: vi.fn().mockImplementation((_event: any, _callback: any) => ({
			remove: vi.fn(),
		})),
	},
}));

vi.mock('expo-modules-core', () => ({
	NativeModule: class {},
	requireOptionalNativeModule: (_name: string) => undefined,
	UnavailabilityError: class extends Error {},
	Platform: {
		OS: 'web',
	},
}));

vi.mock('expo-file-system', () => ({
	documentDirectory: '/tmp',
	cacheDirectory: '/tmp',
	writeAsStringAsync: vi.fn(),
	readAsStringAsync: vi.fn(),
	getInfoAsync: vi.fn().mockResolvedValue({ exists: true, isDirectory: false }),
	makeDirectoryAsync: vi.fn(),
	readDirectoryAsync: vi.fn().mockResolvedValue([]),
	downloadAsync: vi.fn().mockResolvedValue({ uri: '/tmp/mock.onnx' }),
	deleteAsync: vi.fn(),
	getFreeDiskStorageAsync: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		getAllKeys: vi.fn().mockResolvedValue([]),
		multiGet: vi.fn().mockResolvedValue([]),
		multiSet: vi.fn(),
		multiRemove: vi.fn(),
	},
}));

vi.mock('onnxruntime-react-native', () => ({}));

// Stub providers and model managers with simple mocks
vi.mock('@/services/ai/providers/local-dm-provider', () => {
	const LocalDMProvider = vi.fn().mockImplementation(() => ({
		initialize: vi.fn().mockResolvedValue(true),
		generateDnDResponse: vi.fn().mockResolvedValue({
			text: 'Mock local response',
			confidence: 0.9,
			toolCommands: [],
			processingTime: 1,
			source: 'local' as const,
		}),
		healthCheck: vi.fn().mockResolvedValue(true),
		isReady: vi.fn(() => true),
		getStatus: vi.fn(() => ({ isLoaded: true, isReady: true, error: null })),
		setPowerSavingMode: vi.fn(),
		cleanup: vi.fn().mockResolvedValue(undefined),
		getAvailableModels: vi.fn().mockResolvedValue([]),
		getModelRecommendations: vi.fn().mockResolvedValue([]),
		searchModels: vi.fn().mockResolvedValue([]),
		getCurrentModel: vi.fn(() => null),
		getCacheStats: vi.fn(() => ({ entries: 0 })),
		getPrivacySettings: vi.fn(() => ({})),
		downloadModel: vi.fn().mockResolvedValue(true),
		installModel: vi.fn().mockResolvedValue(true),
		isModelInstalled: vi.fn().mockResolvedValue(false),
		switchModel: vi.fn().mockResolvedValue(true),
		deleteModel: vi.fn().mockResolvedValue(true),
		clearCache: vi.fn().mockResolvedValue(undefined),
		performDataCleanup: vi.fn().mockResolvedValue(undefined),
		updatePrivacySettings: vi.fn(() => true),
		exportPrivacyData: vi.fn().mockResolvedValue({}),
		getResourceUsage: vi.fn(() => ({ memory: {} })),
	}));
	return { LocalDMProvider };
});

vi.mock('@/services/ai/models/model-download-manager', () => ({
	ModelDownloadManager: class {
		async initializeDirectories() { return true; }
		async downloadModel() { return { id: 'model', name: 'model', size: 0 }; }
		async getStorageInfo() { return { free: 1024, used: 0 }; }
	},
}));

vi.mock('@/services/ai/models/model-storage-manager', () => ({
	ModelStorageManager: class {
		getStorageStats() { return { total: 1024, free: 512 }; }
	},
}));

vi.mock('@/services/ai/models/model-cache-manager', () => ({
	ModelCacheManager: class {
		getCacheStats() { return { entries: 0 }; }
		clearCache() { return true; }
	},
}));

vi.mock('@/services/ai/models/model-privacy-manager', () => ({
	ModelPrivacyManager: class {
		getPrivacySettings() { return { dataSharing: false }; }
	},
}));

vi.mock('@/services/ai/models/model-catalog', () => ({
	ModelCatalog: class {
		getCatalog() { return []; }
	},
}));

vi.mock('@/services/ai/models/onnx-model-manager', () => ({
	ONNXModelManager: class {
		isModelReady() { return true; }
		async loadGemma3Model() { return {}; }
		async validateModel() { return true; }
		async runInference() { return { logits: new Float32Array([0.1, 0.2, 0.7]) }; }
		async cleanupSession() { return; }
		prepareInputTensors(input: any) { return input; }
		optimizeSession() { return; }
	},
	ONNXModelUtils: {
		validateInput: () => true,
	},
}));

vi.mock('@/services/ai/models/gemma3-tokenizer', () => ({
	Gemma3Tokenizer: class {
		async loadVocab() { return true; }
		isReady() { return true; }
		getVocabSize() { return 32000; }
		async encode(_text: string) { return [1, 2, 3]; }
		async decode(_tokens: number[]) { return 'Decoded text'; }
		getSpecialTokenId(token: string) { return token === '<eos>' ? 2 : undefined; }
	},
}));

vi.mock('@/services/ai/models/gemma3-inference-engine', () => ({
	Gemma3InferenceEngine: class {
		constructor(_config: any) {}
		async initialize() { return; }
		async generateText(prompt: string) {
			return { text: `Stub response: ${prompt}`, tokens: [1], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
		}
		async generateDnDResponse(req: { prompt: string }) {
			return this.generateText(req.prompt);
		}
		cleanup() { return; }
		sampleToken() { return 0; }
	},
}));

vi.mock('@/services/ai/models/model-quantization-manager', () => {
	class ModelQuantizationManager {
		deviceCapabilityManager = {
			getDeviceCapabilities: () => ({
				memory: { available: 2048 },
				supportedQuantizations: ['int4', 'int8', 'fp16', 'fp32'],
				availableMemory: 2048,
				performanceClass: 'medium',
				thermalState: 'nominal',
				batteryLevel: 100,
				isCharging: true,
			}),
		};
		getRecommendedQuantization() {
			const caps = this.deviceCapabilityManager.getDeviceCapabilities();
			const avail = (caps as any).availableMemory ?? 0;
			return avail >= 4000 ? 'fp16' : 'int8';
		}
		getQuantizationOptions() {
			return [{
				type: 'int8',
				sizeReduction: 0.5,
				speedImpact: 'medium',
				qualityImpact: 'medium',
			}];
		}
		estimateQuantizedSize(original: number, quant: string) {
			if (quant === 'int4') return original * 0.25;
			if (quant === 'int8') return original * 0.5;
			if (quant === 'fp16') return original * 0.75;
			return original;
		}
	}
	return { ModelQuantizationManager };
});

vi.mock('@/services/ai/models/device-resource-manager', () => ({
	DeviceResourceManager: class {
		isMonitoring = false;
		private usage = {
			memory: { used: 1024, available: 2048, total: 4096, percentage: 25, pressure: 'low' },
			cpu: { usage: 20, temperature: 40, cores: 4, frequency: 2000, throttled: false },
			thermal: { state: 'nominal', temperature: 40, throttlingActive: false, recommendedAction: 'none' },
			battery: { level: 80, isCharging: true, chargingState: 'charging', estimatedTimeRemaining: 120, powerSavingMode: false, lowPowerModeActive: false },
			timestamp: Date.now(),
		};
		async initialize() { return; }
		getConfig() { return { updateInterval: 1000 }; }
		updateConfig(_c: any) {}
		startMonitoring() { this.isMonitoring = true; }
		stopMonitoring() { this.isMonitoring = false; }
		async getCurrentResourceUsage() { return this.usage; }
		isResourcesHealthy() { return true; }
		getResourceHealthScore() { return 90; }
		async optimizeResources() { return; }
		updateMonitoringConfig(_c: any) {}
		checkThresholds() {}
		addEventListener() {}
		removeEventListener() {}
		getResourceUsage() { return this.usage; }
		emitEvent() {}
		clearNonEssentialCaches() {}
	},
	ResourceUtils: {
		formatMemorySize: () => '0MB',
		formatTemperature: () => '0C',
		formatTimeRemaining: () => '0m',
		getStatusColor: () => 'green',
		getThermalColor: () => 'green',
		estimateInferenceTime: () => 1000,
	},
}));

// Additional per-test cleanup/mocking
beforeEach(() => {
	vi.useFakeTimers();
});

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((_url: any) => Promise.resolve({
	ok: true,
	arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
	status: 200,
	statusText: 'OK',
}));

// Mock console methods for cleaner test output
global.console = {
	...console,
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(),
};
