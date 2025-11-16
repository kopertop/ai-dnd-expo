/**
 * Local DM Provider for AI D&D Platform
 *
 * Provides on-device AI-powered Dungeon Master functionality using local models
 * Integrates with ONNX Runtime and comprehensive model management system
 *
 * Requirements: 1.1, 4.1, 6.1, 6.2, 6.3
 */

import { Platform } from 'react-native';

import { DeviceResourceManager } from '../models/device-resource-manager';
import { InferenceContext, ModelCacheManager } from '../models/model-cache-manager';
import { ModelCatalog, ModelRecommendation } from '../models/model-catalog';
import { ModelDownloadManager, ModelMetadata } from '../models/model-download-manager';
import { ModelPrivacyManager } from '../models/model-privacy-manager';
import { ModelStorageManager } from '../models/model-storage-manager';
import { ONNXModelManager } from '../models/onnx-model-manager';

// Base interfaces for local AI provider
export interface AIProvider {
	initialize(progressCallback?: (progress: InitializationProgress) => void): Promise<boolean>;
	generateDnDResponse(prompt: string, context: DnDContext, timeout?: number): Promise<AIResponse>;
	healthCheck(): Promise<boolean>;
	isReady(): boolean;
	getStatus(): ProviderStatus;
	cleanup(): Promise<void>;
}

export interface InitializationProgress {
	status: 'loading' | 'initializing' | 'ready' | 'error';
	progress?: number; // 0-100
	message?: string;
}

export interface DnDContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
}

export interface AIResponse {
	text: string;
	confidence: number;
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
}

export interface ProviderStatus {
	isLoaded: boolean;
	isReady: boolean;
	error: string | null;
	modelInfo?: {
		name: string;
		size: number;
		quantization: string;
		memoryUsage: number;
	};
	performance?: {
		averageInferenceTime: number;
		tokensPerSecond: number;
		lastInferenceTime: number;
	};
	resourceUsage?: ResourceUsage;
}

// Local model configuration interfaces
export interface LocalModelConfig {
	modelPath: string;
	contextSize: number;
	maxTokens: number;
	temperature: number;
	enableResourceMonitoring: boolean;
	powerSavingMode: boolean;
	quantization?: 'int8' | 'int4' | 'fp16' | 'fp32';
	numThreads?: number;
	memoryLimit?: number; // in MB
	enableGPU?: boolean;
	cacheSize?: number;
}

export interface ModelStatus {
	isLoaded: boolean;
	isReady: boolean;
	loadingProgress: number;
	error: string | null;
	modelInfo: {
		name: string;
		size: number;
		quantization: string;
		memoryUsage: number;
	};
	performance: {
		averageInferenceTime: number;
		tokensPerSecond: number;
		lastInferenceTime: number;
	};
}

export interface ResourceUsage {
	memory: {
		used: number;
		available: number;
		percentage: number;
	};
	cpu: {
		usage: number;
		temperature: number;
	};
	battery: {
		level: number;
		isCharging: boolean;
		estimatedTimeRemaining: number;
	};
	thermal: {
		state: 'nominal' | 'fair' | 'serious' | 'critical';
		temperature: number;
	};
}

/**
 * Local DM Provider implementation
 * Uses ONNX Runtime with comprehensive model management system
 */
export class LocalDMProvider implements ILocalDMProvider {
	private config: LocalModelConfig;
	private isInitialized = false;
	private isModelReady = false;
	private lastError: string | null = null;
	private modelStatus: ModelStatus;
	private performanceMetrics: {
		totalInferences: number;
		totalTime: number;
		averageTime: number;
		successRate: number;
	};

	// Model management system components
	private downloadManager: ModelDownloadManager;
	private catalog: ModelCatalog;
	private storageManager: ModelStorageManager;
	private cacheManager: ModelCacheManager;
	private privacyManager: ModelPrivacyManager;
	private onnxManager: ONNXModelManager;
	private deviceResourceManager: DeviceResourceManager;

	// Current model information
	private currentModelId: string | null = null;
	private currentModelPath: string | null = null;

	constructor(config: LocalModelConfig) {
		this.config = config;
		this.modelStatus = {
			isLoaded: false,
			isReady: false,
			loadingProgress: 0,
			error: null,
			modelInfo: {
				name: this.extractModelName(config.modelPath),
				size: 0,
				quantization: config.quantization || 'unknown',
				memoryUsage: 0,
			},
			performance: {
				averageInferenceTime: 0,
				tokensPerSecond: 0,
				lastInferenceTime: 0,
			},
		};
		this.performanceMetrics = {
			totalInferences: 0,
			totalTime: 0,
			averageTime: 0,
			successRate: 0,
		};

		// Initialize model management system
		this.deviceResourceManager = new DeviceResourceManager();
		this.downloadManager = new ModelDownloadManager();
		this.storageManager = new ModelStorageManager();
		this.cacheManager = new ModelCacheManager(this.deviceResourceManager);
		this.privacyManager = new ModelPrivacyManager(this.storageManager, this.cacheManager);
		this.catalog = new ModelCatalog();
		this.onnxManager = new ONNXModelManager();
	}

	/**
	 * Initialize the local DM provider with progress tracking
	 * Requirement 1.1: Initialize local model with progress tracking
	 */
	async initialize(
		progressCallback?: (progress: InitializationProgress) => void,
	): Promise<boolean> {
		try {
			this.lastError = null;

			// Report loading status
			progressCallback?.({
				status: 'loading',
				progress: 0,
				message: 'Loading local DM model...',
			});

			// Validate model path exists
			if (!this.config.modelPath) {
				throw new Error('Model path is required');
			}

			// Report initialization status
			progressCallback?.({
				status: 'initializing',
				progress: 50,
				message: 'Initializing model session...',
			});

			// TODO: Initialize Cactus LM in task 2.1
			// For now, simulate initialization
			await this.simulateModelLoading(progressCallback);

			this.isInitialized = true;
			this.isModelReady = true;
			this.modelStatus.isLoaded = true;
			this.modelStatus.isReady = true;
			this.modelStatus.loadingProgress = 100;

			// Report ready status
			progressCallback?.({
				status: 'ready',
				progress: 100,
				message: 'Local DM ready for gameplay',
			});

			// Local DM Provider initialized successfully
			return true;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown initialization error';
			this.lastError = errorMessage;
			this.modelStatus.error = errorMessage;

			progressCallback?.({
				status: 'error',
				progress: 0,
				message: errorMessage,
			});

			console.error('❌ Local DM Provider initialization failed:', error);
			return false;
		}
	}

	/**
	 * Generate D&D response using local model with caching
	 * Requirement 2.1: Generate contextually appropriate responses
	 * Requirement 6.2: Use caching for improved performance
	 */
	async generateDnDResponse(
		prompt: string,
		context: DnDContext,
		timeout: number = 10000,
	): Promise<AIResponse> {
		if (!this.isModelReady) {
			throw new Error('Local DM model is not ready. Please initialize first.');
		}

		const startTime = Date.now();

		try {
			// Build D&D-specific prompt
			const formattedPrompt = this.buildDnDPrompt(prompt, context);

			// Create inference context for caching
			const inferenceContext: InferenceContext = {
				modelId: this.currentModelId || 'default',
				input: formattedPrompt,
				sessionId: context.playerName, // Use player name as session ID
				gameContext: `${context.currentScene}|${context.playerClass}|${context.playerRace}`,
				priority: 'normal',
				cacheable: true,
				tags: ['dnd', 'roleplay'],
			};

			// Check cache first
			const cachedResponse = await this.cacheManager.getCachedResponse(inferenceContext);
			if (cachedResponse) {
				return {
					...cachedResponse,
					processingTime: Date.now() - startTime,
				};
			}

			// Generate new response using ONNX model or fallback
			let response: AIResponse;
			if (this.onnxManager && this.currentModelPath) {
				response = await this.generateWithONNX(formattedPrompt, timeout);
			} else {
				// Fallback to simulation
				response = await this.simulateInference(formattedPrompt, timeout);
			}

			// Cache the response
			await this.cacheManager.cacheResponse(inferenceContext, response);

			// Update performance metrics
			const processingTime = Date.now() - startTime;
			this.updatePerformanceMetrics(processingTime, true);
			this.modelStatus.performance.lastInferenceTime = processingTime;

			return response;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			this.updatePerformanceMetrics(processingTime, false);

			const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
			console.error('❌ Local DM inference failed:', error);
			throw new Error(`Local DM inference failed: ${errorMessage}`);
		}
	}

	/**
	 * Check if the local DM provider is healthy and ready
	 */
	async healthCheck(): Promise<boolean> {
		try {
			if (!this.isInitialized || !this.isModelReady) {
				return false;
			}

			// TODO: Implement actual health check in task 2.1
			// For now, return basic readiness status
			return this.isModelReady && this.lastError === null;
		} catch (error) {
			console.error('❌ Local DM health check failed:', error);
			return false;
		}
	}

	/**
	 * Check if the provider is ready for inference
	 */
	isReady(): boolean {
		return this.isModelReady && this.lastError === null;
	}

	/**
	 * Get detailed status of the local DM provider
	 */
	getStatus(): ProviderStatus {
		return {
			isLoaded: this.modelStatus.isLoaded,
			isReady: this.modelStatus.isReady,
			error: this.lastError,
			modelInfo: this.modelStatus.modelInfo,
			performance: this.modelStatus.performance,
			// TODO: Implement resource monitoring in task 3.1
			resourceUsage: undefined,
		};
	}

	/**
	 * Enable or disable power saving mode
	 * Requirement 3.2: Battery optimization
	 */
	setPowerSavingMode(enabled: boolean): void {
		this.config.powerSavingMode = enabled;

		if (enabled) {
			// TODO: Implement power saving optimizations in task 3.3
			// Power saving mode enabled for Local DM
		} else {
			// Performance mode enabled for Local DM
		}
	}

	/**
	 * Clean up all resources and model data
	 * Requirement 5.4: Complete data removal
	 */
	async cleanup(): Promise<void> {
		try {
			// TODO: Implement proper cleanup in task 6.3
			// For now, reset internal state
			this.isInitialized = false;
			this.isModelReady = false;
			this.lastError = null;
			// Remove reference to cactusLM as it doesn't exist in this class

			// Reset model status
			this.modelStatus.isLoaded = false;
			this.modelStatus.isReady = false;
			this.modelStatus.error = null;

			// Local DM Provider cleaned up successfully
		} catch (error) {
			console.error('❌ Local DM cleanup failed:', error);
			throw error;
		}
	}

	// Private helper methods

	/**
	 * Build D&D-specific prompt for local model
	 */
	private buildDnDPrompt(prompt: string, context: DnDContext): string {
		const systemPrompt = `You are an experienced Dungeon Master running a D&D 5e campaign.
Your responses should be:
- Engaging and immersive
- Consistent with D&D 5e rules
- Appropriate for the current scene and character
- Include dice rolls when needed using [ROLL:XdY+Z] format
- Keep responses concise (1-3 sentences)
- Maintain narrative flow

Always respond in character as the DM.`;

		return `${systemPrompt}

Character: ${context.playerName} (${context.playerRace} ${context.playerClass})
Scene: ${context.currentScene}
Recent History: ${context.gameHistory.slice(-3).join(' ')}

Player Action: ${prompt}

DM Response:`;
	}

	/**
	 * Extract tool commands from model response
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const type = match[1].toLowerCase();
			const params = match[2].trim();

			if (['roll', 'update', 'damage', 'heal', 'status', 'inventory'].includes(type)) {
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
	 * Generate response using ONNX model
	 */
	private async generateWithONNX(prompt: string, timeout: number): Promise<AIResponse> {
		const startTime = Date.now();

		try {
			// Load the model and run inference
			const session = await this.onnxManager.loadGemma3Model(this.currentModelPath || '');
			const result = await this.onnxManager.runInference(session, {
				input_ids: [], // Tokenization would happen here
				attention_mask: [],
			});

			// Convert ONNX output to AI response format
			const text = this.convertONNXOutputToText(result);
			const cleanText = this.removeToolCommands(text);
			const toolCommands = this.extractToolCommands(text);

			const processingTime = Date.now() - startTime;

			return {
				text: cleanText,
				confidence: 0.85, // Would be calculated from model output
				toolCommands,
				processingTime,
			};
		} catch (error) {
			console.error('ONNX inference failed:', error);
			// Fallback to simulation
			return await this.simulateInference(prompt, timeout);
		}
	}

	/**
	 * Convert ONNX model output to readable text
	 */
	private convertONNXOutputToText(output: any): string {
		// This would implement actual tokenization/detokenization
		// For now, return a placeholder
		return 'The DM considers your action carefully...';
	}

	/**
	 * Extract model name from file path
	 */
	private extractModelName(modelPath: string): string {
		const fileName = modelPath.split('/').pop() || 'unknown';
		return fileName.replace(/\.(gguf|onnx)$/, '');
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(processingTime: number, success: boolean): void {
		this.performanceMetrics.totalInferences++;

		if (success) {
			this.performanceMetrics.totalTime += processingTime;
			this.performanceMetrics.averageTime =
				this.performanceMetrics.totalTime / this.performanceMetrics.totalInferences;

			// Estimate tokens per second (placeholder calculation)
			const estimatedTokens = 50; // Average response length
			this.modelStatus.performance.tokensPerSecond =
				(estimatedTokens / processingTime) * 1000;
		}

		this.performanceMetrics.successRate =
			(this.performanceMetrics.totalInferences -
				(this.performanceMetrics.totalInferences -
					this.performanceMetrics.totalTime / this.performanceMetrics.averageTime || 0)) /
			this.performanceMetrics.totalInferences;

		this.modelStatus.performance.averageInferenceTime = this.performanceMetrics.averageTime;
	}

	/**
	 * Simulate model loading for development (will be replaced in task 2.1)
	 */
	private async simulateModelLoading(
		progressCallback?: (progress: InitializationProgress) => void,
	): Promise<void> {
		const steps = [
			{ progress: 20, message: 'Validating model file...' },
			{ progress: 40, message: 'Loading model weights...' },
			{ progress: 60, message: 'Initializing tokenizer...' },
			{ progress: 80, message: 'Optimizing for device...' },
			{ progress: 100, message: 'Model ready!' },
		];

		for (const step of steps) {
			await new Promise(resolve => setTimeout(resolve, 200));
			progressCallback?.({
				status: 'initializing',
				progress: step.progress,
				message: step.message,
			});
		}
	}

	/**
	 * Simulate model inference for development (will be replaced in task 2.2)
	 */
	private async simulateInference(prompt: string, timeout: number): Promise<AIResponse> {
		// Simulate processing time
		await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

		// Generate a placeholder D&D response
		const responses = [
			'The ancient door creaks open, revealing a dimly lit chamber ahead. [ROLL:1d20+3] Make a Perception check to notice any details.',
			'Your attack strikes true! [ROLL:1d8+4] Roll for damage as your blade finds its mark.',
			'The merchant eyes you warily but seems willing to negotiate. What would you like to purchase?',
			'A mysterious fog begins to roll in from the forest. The air grows cold and you sense something watching you.',
			'Your spell illuminates the cavern, revealing ancient runes carved into the walls. [ROLL:1d20+2] Roll an Arcana check to decipher them.',
		];

		const text = responses[Math.floor(Math.random() * responses.length)];
		const toolCommands = this.extractToolCommands(text);
		const cleanText = this.removeToolCommands(text);

		return {
			text: cleanText,
			confidence: 0.85,
			toolCommands,
			processingTime: Math.random() * 2000 + 500,
		};
	}

	/**
	 * Model Management Methods Implementation (Task 6)
	 */

	/**
	 * Get available models from catalog
	 */
	async getAvailableModels(): Promise<ModelMetadata[]> {
		await this.catalog.updateCatalog();
		return this.catalog.getCatalog();
	}

	/**
	 * Get model recommendations for current device
	 */
	async getModelRecommendations(limit: number = 5): Promise<ModelRecommendation[]> {
		// Create a DeviceInfo object from the resource usage
		const resourceUsage = await this.deviceResourceManager.getCurrentResourceUsage();

		// Convert ResourceUsage to DeviceInfo
		const deviceInfo = {
			platform: (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android' | 'web',
			totalMemory: resourceUsage.memory.total || 4096,
			availableMemory: resourceUsage.memory.available || 2048,
			cpuCores: resourceUsage.cpu.cores || 4,
			hasGPU: true, // Assume GPU is available
			thermalState: resourceUsage.thermal.state,
		};

		await this.catalog.initialize(deviceInfo);
		return this.catalog.getRecommendations(limit);
	}

	/**
	 * Search models by query
	 */
	async searchModels(query: string): Promise<ModelMetadata[]> {
		return this.catalog.searchModels(query);
	}

	/**
	 * Download model with progress tracking
	 */
	async downloadModel(
		modelId: string,
		progressCallback?: (progress: any) => void,
	): Promise<string> {
		const model = this.catalog.getModel(modelId);
		if (!model) {
			throw new Error(`Model ${modelId} not found in catalog`);
		}

		return await this.downloadManager.downloadModel(model, {
			progressCallback,
			checksumValidation: true,
			resumable: true,
		});
	}

	/**
	 * Install model (no-op if already stored)
	 */
	async installModel(modelId: string): Promise<void> {
		const modelPath = await this.storageManager.getModelPath(modelId);
		if (!modelPath) {
			throw new Error(`Model ${modelId} not found in storage`);
		}

		// Model is already installed if it exists in storage
		return;
	}

	/**
	 * Check if model is installed
	 */
	async isModelInstalled(modelId: string): Promise<boolean> {
		return await this.storageManager.isModelStored(modelId);
	}

	/**
	 * Switch to different model
	 */
	async switchModel(modelId: string): Promise<void> {
		const modelPath = await this.storageManager.getModelPath(modelId);
		if (!modelPath) {
			throw new Error(`Model ${modelId} not installed`);
		}

		// Cleanup current model
		if (this.onnxManager) {
			// Use cleanupSession instead of cleanup
			const session = await this.onnxManager.loadGemma3Model(this.currentModelPath || '');
			await this.onnxManager.cleanupSession(session);
		}

		// Load new model
		// Get device info using getCurrentResourceUsage instead of getDeviceInfo
		const deviceInfo = await this.deviceResourceManager.getCurrentResourceUsage();
		// Initialize and load model using the correct methods
		const session = await this.onnxManager.loadGemma3Model(modelPath);
		await this.onnxManager.validateModel(session);

		this.currentModelId = modelId;
		this.currentModelPath = modelPath;
		this.isModelReady = true;
	}

	/**
	 * Get current model metadata
	 */
	getCurrentModel(): ModelMetadata | null {
		if (!this.currentModelId) {
			return null;
		}
		return this.catalog.getModel(this.currentModelId);
	}

	/**
	 * Delete model from storage
	 */
	async deleteModel(modelId: string): Promise<void> {
		await this.storageManager.deleteModel(
			modelId,
			this.privacyManager.getPrivacySettings().secureDeleteEnabled,
		);
	}

	/**
	 * Clear inference cache
	 */
	async clearCache(options?: any): Promise<void> {
		await this.cacheManager.clearCache(options);
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): any {
		return this.cacheManager.getCacheStats();
	}

	/**
	 * Perform data cleanup
	 */
	async performDataCleanup(options?: any): Promise<void> {
		await this.privacyManager.performDataCleanup(options);
	}

	/**
	 * Get privacy settings
	 */
	getPrivacySettings(): any {
		return this.privacyManager.getPrivacySettings();
	}

	/**
	 * Update privacy settings
	 */
	async updatePrivacySettings(settings: any): Promise<void> {
		await this.privacyManager.updatePrivacySettings(settings);
	}

	/**
	 * Export privacy data
	 */
	async exportPrivacyData(): Promise<any> {
		return await this.privacyManager.exportPrivacyData();
	}
}

/**
 * Default configuration for Local DM Provider
 */
export const DefaultLocalDMConfig: LocalModelConfig = {
	modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
	contextSize: 2048,
	maxTokens: 150,
	temperature: 0.7,
	enableResourceMonitoring: true,
	powerSavingMode: false,
	quantization: 'int8',
	numThreads: 4,
	memoryLimit: 512, // 512MB limit
	enableGPU: false, // Start with CPU-only
	cacheSize: 100, // Cache 100 responses
};

/**
 * Model configuration presets for different device capabilities
 */
export const LocalDMModelConfigs = {
	/**
	 * High performance configuration for powerful devices (iPhone 15 Pro+, iPad Pro)
	 */
	PERFORMANCE: {
		...DefaultLocalDMConfig,
		modelPath: '/Documents/AIModels/gemma-3-9b-int4/model.gguf',
		contextSize: 4096,
		maxTokens: 200,
		temperature: 0.8,
		quantization: 'int4' as const,
		numThreads: 8,
		memoryLimit: 1024,
		enableGPU: true,
		cacheSize: 200,
	},

	/**
	 * Balanced configuration for mid-range devices (iPhone 13+, iPad Air)
	 */
	BALANCED: {
		...DefaultLocalDMConfig,
		modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
		contextSize: 2048,
		maxTokens: 150,
		temperature: 0.7,
		quantization: 'int8' as const,
		numThreads: 6,
		memoryLimit: 512,
		enableGPU: false,
		cacheSize: 150,
	},

	/**
	 * Power saving configuration for battery optimization
	 */
	POWER_SAVING: {
		...DefaultLocalDMConfig,
		modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
		contextSize: 1024,
		maxTokens: 100,
		temperature: 0.6,
		quantization: 'int8' as const,
		numThreads: 2,
		memoryLimit: 256,
		enableGPU: false,
		cacheSize: 50,
		powerSavingMode: true,
	},

	/**
	 * Minimal configuration for older devices
	 */
	MINIMAL: {
		...DefaultLocalDMConfig,
		modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.gguf',
		contextSize: 512,
		maxTokens: 75,
		temperature: 0.5,
		quantization: 'int8' as const,
		numThreads: 2,
		memoryLimit: 128,
		enableGPU: false,
		cacheSize: 25,
		powerSavingMode: true,
	},
};

/**
 * Extended LocalDMProvider methods for model management (Task 6)
 */
export interface ILocalDMProvider extends AIProvider {
	// Model catalog and discovery
	getAvailableModels(): Promise<ModelMetadata[]>;
	getModelRecommendations(limit?: number): Promise<ModelRecommendation[]>;
	searchModels(query: string): Promise<ModelMetadata[]>;

	// Model download and installation
	downloadModel(modelId: string, progressCallback?: (progress: any) => void): Promise<string>;
	installModel(modelId: string): Promise<void>;
	isModelInstalled(modelId: string): Promise<boolean>;

	// Model switching and management
	switchModel(modelId: string): Promise<void>;
	getCurrentModel(): ModelMetadata | null;
	deleteModel(modelId: string): Promise<void>;

	// Cache management
	clearCache(options?: any): Promise<void>;
	getCacheStats(): any;

	// Privacy and compliance
	performDataCleanup(options?: any): Promise<void>;
	getPrivacySettings(): any;
	updatePrivacySettings(settings: any): Promise<void>;
	exportPrivacyData(): Promise<unknown>;
}
