/**
 * Model Quantization Manager for Local AI D&D Platform
 *
 * Manages different quantization levels and handles model loading
 * based on device capabilities and user preferences.
 *
 * Requirements: 1.4, 3.1
 */

import { InferenceSession } from 'onnxruntime-react-native';

import {
	DeviceCapabilities,
	DeviceCapabilityManager,
	ModelVariant,
	QuantizationType,
} from './device-capability-manager';
import { ONNXModelManager } from './onnx-model-manager';

export interface QuantizationConfig {
	type: QuantizationType;
	modelPath: string;
	configPath?: string;
	tokenizerPath?: string;
	metadata: {
		size: number; // in MB
		memoryRequirement: number; // in MB
		expectedSpeed: 'fast' | 'medium' | 'slow';
		qualityScore: number; // 0-100
	};
}

export interface ModelLoadingProgress {
	stage: 'downloading' | 'loading' | 'validating' | 'optimizing' | 'ready' | 'error';
	progress: number; // 0-100
	message: string;
	bytesLoaded?: number;
	totalBytes?: number;
}

export interface QuantizationPerformance {
	quantization: QuantizationType;
	averageInferenceTime: number;
	tokensPerSecond: number;
	memoryUsage: number;
	qualityScore: number;
	thermalImpact: 'low' | 'medium' | 'high';
	batteryImpact: 'low' | 'medium' | 'high';
}

/**
 * Model Quantization Manager
 * Handles loading and switching between different quantized model variants
 */
export class ModelQuantizationManager {
	private onnxManager: ONNXModelManager;
	private deviceManager: DeviceCapabilityManager;
	private availableConfigs: Map<QuantizationType, QuantizationConfig> = new Map();
	private currentConfig: QuantizationConfig | null = null;
	private currentSession: InferenceSession | null = null;
	private performanceHistory: QuantizationPerformance[] = [];
	private isInitialized = false;

	constructor(onnxManager: ONNXModelManager, deviceManager: DeviceCapabilityManager) {
		this.onnxManager = onnxManager;
		this.deviceManager = deviceManager;
	}

	/**
	 * Initialize quantization manager with available model variants
	 * Requirement 1.4: Support for different quantization levels
	 */
	async initialize(configs: QuantizationConfig[]): Promise<void> {
		try {
			console.log('⚙️ Initializing quantization manager...');

			// Store available configurations
			for (const config of configs) {
				this.availableConfigs.set(config.type, config);
			}

			// Ensure device manager is ready
			if (!this.deviceManager.isReady()) {
				await this.deviceManager.initialize();
			}

			this.isInitialized = true;
			console.log(`✅ Quantization manager initialized with ${configs.length} variants`);
		} catch (error) {
			console.error('❌ Failed to initialize quantization manager:', error);
			throw new Error(`Quantization manager initialization failed: ${error}`);
		}
	}

	/**
	 * Load optimal model based on device capabilities
	 * Requirement 3.1: Optimal quantization selection
	 */
	async loadOptimalModel(
		progressCallback?: (progress: ModelLoadingProgress) => void,
	): Promise<InferenceSession> {
		if (!this.isInitialized) {
			throw new Error('Quantization manager not initialized');
		}

		const capabilities = this.deviceManager.getCapabilities();
		if (!capabilities) {
			throw new Error('Device capabilities not available');
		}

		try {
			progressCallback?.({
				stage: 'loading',
				progress: 0,
				message: 'Analyzing device capabilities...',
			});

			// Get optimal quantization recommendation
			const availableVariants = this.getAvailableModelVariants();
			const recommendation =
				this.deviceManager.getQuantizationRecommendation(availableVariants);

			console.log(`🎯 Recommended quantization: ${recommendation.recommended}`);
			console.log(`📝 Reasoning: ${recommendation.reasoning}`);

			if (recommendation.warnings.length > 0) {
				console.warn('⚠️ Warnings:', recommendation.warnings);
			}

			// Load the recommended model
			const config = this.availableConfigs.get(recommendation.recommended);
			if (!config) {
				throw new Error(
					`Configuration not found for quantization: ${recommendation.recommended}`,
				);
			}

			return await this.loadSpecificModel(config, progressCallback);
		} catch (error) {
			progressCallback?.({
				stage: 'error',
				progress: 0,
				message: `Failed to load optimal model: ${error}`,
			});

			console.error('❌ Failed to load optimal model:', error);
			throw error;
		}
	}

	/**
	 * Load specific quantized model
	 * Requirement 1.4: Model variant loading
	 */
	async loadSpecificModel(
		config: QuantizationConfig,
		progressCallback?: (progress: ModelLoadingProgress) => void,
	): Promise<InferenceSession> {
		try {
			console.log(`🔄 Loading ${config.type} quantized model...`);

			progressCallback?.({
				stage: 'loading',
				progress: 10,
				message: `Loading ${config.type} model...`,
			});

			// Validate device compatibility
			const capabilities = this.deviceManager.getCapabilities();
			if (capabilities && !this.isModelCompatible(config, capabilities)) {
				throw new Error(`Model ${config.type} is not compatible with current device`);
			}

			progressCallback?.({
				stage: 'loading',
				progress: 30,
				message: 'Loading model file...',
			});

			// Load model using ONNX manager
			const session = await this.onnxManager.loadGemma3Model(config.modelPath);

			progressCallback?.({
				stage: 'validating',
				progress: 60,
				message: 'Validating model...',
			});

			// Validate model
			const isValid = await this.onnxManager.validateModel(session);
			if (!isValid) {
				throw new Error('Model validation failed');
			}

			progressCallback?.({
				stage: 'optimizing',
				progress: 80,
				message: 'Optimizing for device...',
			});

			// Optimize for current device
			if (capabilities) {
				this.onnxManager.optimizeSession(session, {
					platform: capabilities.platform,
					totalMemory: capabilities.totalMemory,
					availableMemory: capabilities.availableMemory,
					cpuCores: capabilities.cpuCores,
					hasGPU: capabilities.hasGPU,
					thermalState: capabilities.thermalState,
				});
			}

			// Clean up previous session
			if (this.currentSession) {
				await this.onnxManager.cleanupSession(this.currentSession);
			}

			// Store current configuration
			this.currentConfig = config;
			this.currentSession = session;

			progressCallback?.({
				stage: 'ready',
				progress: 100,
				message: `${config.type} model ready`,
			});

			console.log(`✅ ${config.type} model loaded successfully`);
			return session;
		} catch (error) {
			progressCallback?.({
				stage: 'error',
				progress: 0,
				message: `Failed to load ${config.type} model: ${error}`,
			});

			console.error(`❌ Failed to load ${config.type} model:`, error);
			throw error;
		}
	}

	/**
	 * Switch to different quantization level
	 * Requirement 1.4: Dynamic quantization switching
	 */
	async switchQuantization(
		targetQuantization: QuantizationType,
		progressCallback?: (progress: ModelLoadingProgress) => void,
	): Promise<InferenceSession> {
		if (this.currentConfig?.type === targetQuantization) {
			console.log(`Already using ${targetQuantization} quantization`);
			return this.currentSession!;
		}

		const config = this.availableConfigs.get(targetQuantization);
		if (!config) {
			throw new Error(`Quantization ${targetQuantization} not available`);
		}

		console.log(
			`🔄 Switching from ${this.currentConfig?.type || 'none'} to ${targetQuantization}`,
		);

		return await this.loadSpecificModel(config, progressCallback);
	}

	/**
	 * Get available model variants based on device capabilities
	 */
	getAvailableModelVariants(): ModelVariant[] {
		const variants: ModelVariant[] = [];

		for (const [quantization, config] of this.availableConfigs) {
			variants.push({
				name: `Gemma3-${quantization.toUpperCase()}`,
				quantization,
				modelSize: config.metadata.size,
				memoryRequirement: config.metadata.memoryRequirement,
				estimatedSpeed: config.metadata.expectedSpeed,
				qualityScore: config.metadata.qualityScore,
				supportedDevices: ['ios', 'android'], // Simplified
				minMemoryMB: config.metadata.memoryRequirement,
				recommendedMemoryMB: config.metadata.memoryRequirement * 1.5,
			});
		}

		return variants;
	}

	/**
	 * Get current quantization configuration
	 */
	getCurrentConfig(): QuantizationConfig | null {
		return this.currentConfig;
	}

	/**
	 * Get current model session
	 */
	getCurrentSession(): InferenceSession | null {
		return this.currentSession;
	}

	/**
	 * Record performance metrics for current quantization
	 */
	recordPerformance(metrics: {
		inferenceTime: number;
		tokenCount: number;
		memoryUsage: number;
		thermalImpact: 'low' | 'medium' | 'high';
	}): void {
		if (!this.currentConfig) {
			return;
		}

		const performance: QuantizationPerformance = {
			quantization: this.currentConfig.type,
			averageInferenceTime: metrics.inferenceTime,
			tokensPerSecond: (metrics.tokenCount / metrics.inferenceTime) * 1000,
			memoryUsage: metrics.memoryUsage,
			qualityScore: this.currentConfig.metadata.qualityScore,
			thermalImpact: metrics.thermalImpact,
			batteryImpact: this.estimateBatteryImpact(metrics),
		};

		// Update or add performance record
		const existingIndex = this.performanceHistory.findIndex(
			p => p.quantization === performance.quantization,
		);
		if (existingIndex >= 0) {
			// Average with existing performance
			const existing = this.performanceHistory[existingIndex];
			this.performanceHistory[existingIndex] = {
				...performance,
				averageInferenceTime:
					(existing.averageInferenceTime + performance.averageInferenceTime) / 2,
				tokensPerSecond: (existing.tokensPerSecond + performance.tokensPerSecond) / 2,
				memoryUsage: (existing.memoryUsage + performance.memoryUsage) / 2,
			};
		} else {
			this.performanceHistory.push(performance);
		}
	}

	/**
	 * Get performance history for all quantizations
	 */
	getPerformanceHistory(): QuantizationPerformance[] {
		return [...this.performanceHistory];
	}

	/**
	 * Get recommended quantization based on current conditions
	 */
	getRecommendedQuantization(): QuantizationType | null {
		const capabilities = this.deviceManager.getCapabilities();
		if (!capabilities) {
			return null;
		}

		const availableVariants = this.getAvailableModelVariants();
		const recommendation = this.deviceManager.getQuantizationRecommendation(availableVariants);

		return recommendation.recommended;
	}

	/**
	 * Check if model is compatible with device
	 */
	private isModelCompatible(
		config: QuantizationConfig,
		capabilities: DeviceCapabilities,
	): boolean {
		return (
			config.metadata.memoryRequirement <= capabilities.availableMemory &&
			capabilities.supportedQuantizations.includes(config.type)
		);
	}

	/**
	 * Estimate battery impact based on performance metrics
	 */
	private estimateBatteryImpact(metrics: {
		inferenceTime: number;
		thermalImpact: 'low' | 'medium' | 'high';
	}): 'low' | 'medium' | 'high' {
		if (metrics.thermalImpact === 'high' || metrics.inferenceTime > 5000) {
			return 'high';
		} else if (metrics.thermalImpact === 'medium' || metrics.inferenceTime > 2000) {
			return 'medium';
		} else {
			return 'low';
		}
	}

	/**
	 * Clean up all resources
	 */
	async cleanup(): Promise<void> {
		try {
			if (this.currentSession) {
				await this.onnxManager.cleanupSession(this.currentSession);
				this.currentSession = null;
			}

			this.currentConfig = null;
			this.performanceHistory = [];
			this.isInitialized = false;

			console.log('✅ Quantization manager cleaned up');
		} catch (error) {
			console.error('❌ Quantization manager cleanup failed:', error);
			throw error;
		}
	}

	/**
	 * Check if manager is ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.deviceManager.isReady();
	}
}

/**
 * Utility functions for quantization management
 */
export const QuantizationUtils = {
	/**
	 * Create quantization config from model variant
	 */
	createConfigFromVariant(variant: ModelVariant, basePath: string): QuantizationConfig {
		return {
			type: variant.quantization,
			modelPath: `${basePath}/${variant.name.toLowerCase()}/model.onnx`,
			configPath: `${basePath}/${variant.name.toLowerCase()}/config.json`,
			tokenizerPath: `${basePath}/${variant.name.toLowerCase()}/tokenizer.json`,
			metadata: {
				size: variant.modelSize,
				memoryRequirement: variant.memoryRequirement,
				expectedSpeed: variant.estimatedSpeed,
				qualityScore: variant.qualityScore,
			},
		};
	},

	/**
	 * Compare quantization performance
	 */
	compareQuantizations(
		a: QuantizationPerformance,
		b: QuantizationPerformance,
	): {
		faster: QuantizationType;
		higherQuality: QuantizationType;
		moreEfficient: QuantizationType;
		recommendation: QuantizationType;
	} {
		return {
			faster: a.tokensPerSecond > b.tokensPerSecond ? a.quantization : b.quantization,
			higherQuality: a.qualityScore > b.qualityScore ? a.quantization : b.quantization,
			moreEfficient: a.memoryUsage < b.memoryUsage ? a.quantization : b.quantization,
			recommendation: QuantizationUtils.getOverallBetter(a, b),
		};
	},

	/**
	 * Get overall better quantization based on weighted score
	 */
	getOverallBetter(a: QuantizationPerformance, b: QuantizationPerformance): QuantizationType {
		// Weighted scoring: speed (30%), quality (40%), efficiency (30%)
		const scoreA =
			(a.tokensPerSecond / 10) * 0.3 +
			(a.qualityScore / 100) * 0.4 +
			(1 - a.memoryUsage / 4000) * 0.3;
		const scoreB =
			(b.tokensPerSecond / 10) * 0.3 +
			(b.qualityScore / 100) * 0.4 +
			(1 - b.memoryUsage / 4000) * 0.3;

		return scoreA > scoreB ? a.quantization : b.quantization;
	},

	/**
	 * Get quantization display name
	 */
	getDisplayName(quantization: QuantizationType): string {
		const names = {
			int4: '4-bit Integer',
			int8: '8-bit Integer',
			fp16: '16-bit Float',
			fp32: '32-bit Float',
		};

		return names[quantization];
	},

	/**
	 * Get quantization description
	 */
	getDescription(quantization: QuantizationType): string {
		const descriptions = {
			int4: 'Fastest inference with good quality, lowest memory usage',
			int8: 'Balanced speed and quality, moderate memory usage',
			fp16: 'High quality with moderate speed, higher memory usage',
			fp32: 'Highest quality but slowest, highest memory usage',
		};

		return descriptions[quantization];
	},

	/**
	 * Validate quantization config
	 */
	validateConfig(config: QuantizationConfig): {
		valid: boolean;
		issues: string[];
	} {
		const issues: string[] = [];

		if (!config.modelPath) {
			issues.push('Model path is required');
		}

		if (config.metadata.size <= 0) {
			issues.push('Model size must be positive');
		}

		if (config.metadata.memoryRequirement <= 0) {
			issues.push('Memory requirement must be positive');
		}

		if (config.metadata.qualityScore < 0 || config.metadata.qualityScore > 100) {
			issues.push('Quality score must be between 0 and 100');
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	},
};

/**
 * Default quantization configurations for Gemma3
 */
export const DefaultQuantizationConfigs: QuantizationConfig[] = [
	{
		type: 'int4',
		modelPath: '/Documents/AIModels/gemma-3-2b-int4/model.onnx',
		configPath: '/Documents/AIModels/gemma-3-2b-int4/config.json',
		tokenizerPath: '/Documents/AIModels/gemma-3-2b-int4/tokenizer.json',
		metadata: {
			size: 1200,
			memoryRequirement: 1500,
			expectedSpeed: 'fast',
			qualityScore: 85,
		},
	},
	{
		type: 'int8',
		modelPath: '/Documents/AIModels/gemma-3-2b-int8/model.onnx',
		configPath: '/Documents/AIModels/gemma-3-2b-int8/config.json',
		tokenizerPath: '/Documents/AIModels/gemma-3-2b-int8/tokenizer.json',
		metadata: {
			size: 2100,
			memoryRequirement: 2500,
			expectedSpeed: 'medium',
			qualityScore: 90,
		},
	},
	{
		type: 'fp16',
		modelPath: '/Documents/AIModels/gemma-3-2b-fp16/model.onnx',
		configPath: '/Documents/AIModels/gemma-3-2b-fp16/config.json',
		tokenizerPath: '/Documents/AIModels/gemma-3-2b-fp16/tokenizer.json',
		metadata: {
			size: 4200,
			memoryRequirement: 5000,
			expectedSpeed: 'medium',
			qualityScore: 95,
		},
	},
];
