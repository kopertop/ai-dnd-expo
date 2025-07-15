/**
 * ONNX Model Manager for Local AI D&D Platform
 *
 * Manages ONNX Runtime integration for Gemma3 models with lifecycle management,
 * validation, and proper cleanup for React Native environment.
 *
 * Requirements: 1.1, 1.2
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';

export interface ModelInput {
	input_ids: number[];
	attention_mask: number[];
	position_ids?: number[];
}

export interface ModelOutput {
	logits: Float32Array;
	hidden_states?: Float32Array[];
}

export interface DeviceInfo {
	platform: 'ios' | 'android' | 'web';
	totalMemory: number; // in MB
	availableMemory: number; // in MB
	cpuCores: number;
	hasGPU: boolean;
	thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
}

export interface PerformanceMetrics {
	averageInferenceTime: number;
	tokensPerSecond: number;
	memoryUsage: number;
	cpuUsage: number;
	thermalImpact: 'low' | 'medium' | 'high';
	successRate: number;
	totalInferences: number;
}

export interface MemoryStats {
	modelMemoryUsage: number; // in MB
	sessionMemoryUsage: number; // in MB
	totalMemoryUsage: number; // in MB
	availableMemory: number; // in MB
	memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface ModelMetadata {
	name: string;
	version: string;
	size: number; // in bytes
	quantization: 'int8' | 'int4' | 'fp16' | 'fp32';
	inputShape: number[];
	outputShape: number[];
	vocabSize: number;
	contextLength: number;
	supportedDevices: string[];
	minMemoryRequirement: number; // in MB
	recommendedMemory: number; // in MB
	checksum: string;
}

export interface SessionConfig {
	executionProviders: string[];
	graphOptimizationLevel: 'disabled' | 'basic' | 'extended' | 'all';
	enableCpuMemArena: boolean;
	enableMemPattern: boolean;
	executionMode: 'sequential' | 'parallel';
	interOpNumThreads: number;
	intraOpNumThreads: number;
	logSeverityLevel: 0 | 1 | 2 | 3 | 4;
	logVerbosityLevel: number;
}

/**
 * ONNX Model Manager for Gemma3 models
 * Handles model loading, validation, inference execution, and resource management
 */
export class ONNXModelManager {
	private session: InferenceSession | null = null;
	private modelPath: string = '';
	private metadata: ModelMetadata | null = null;
	private performanceMetrics: PerformanceMetrics;
	private isLoaded = false;
	private isValidated = false;
	private sessionConfig: SessionConfig;

	constructor() {
		this.performanceMetrics = {
			averageInferenceTime: 0,
			tokensPerSecond: 0,
			memoryUsage: 0,
			cpuUsage: 0,
			thermalImpact: 'low',
			successRate: 0,
			totalInferences: 0,
		};

		this.sessionConfig = {
			executionProviders: ['cpu'], // Start with CPU, can add GPU later
			graphOptimizationLevel: 'extended',
			enableCpuMemArena: true,
			enableMemPattern: true,
			executionMode: 'sequential',
			interOpNumThreads: 1,
			intraOpNumThreads: 4,
			logSeverityLevel: 2 as const, // Warning level (0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal)
			logVerbosityLevel: 0,
		};
	}

	/**
	 * Load Gemma3 model from ONNX file
	 * Requirement 1.1: Model loading with validation
	 */
	async loadGemma3Model(modelPath: string): Promise<InferenceSession> {
		try {
			console.log('🤖 Loading ONNX model from:', modelPath);

			this.modelPath = modelPath;

			// Validate model file exists and is accessible
			await this.validateModelFile(modelPath);

			// Create ONNX Runtime session with optimized configuration
			const sessionOptions = {
				executionProviders: this.sessionConfig.executionProviders,
				graphOptimizationLevel: this.sessionConfig.graphOptimizationLevel,
				enableCpuMemArena: this.sessionConfig.enableCpuMemArena,
				enableMemPattern: this.sessionConfig.enableMemPattern,
				executionMode: this.sessionConfig.executionMode,
				interOpNumThreads: this.sessionConfig.interOpNumThreads,
				intraOpNumThreads: this.sessionConfig.intraOpNumThreads,
				logSeverityLevel: this.sessionConfig.logSeverityLevel,
				logVerbosityLevel: this.sessionConfig.logVerbosityLevel,
			};

			console.log('🔧 Creating ONNX session with config:', sessionOptions);

			// Load model file as Uint8Array buffer
			const modelBuffer = await this.loadModelBuffer(modelPath);

			this.session = await InferenceSession.create(modelBuffer, sessionOptions);
			this.isLoaded = true;

			console.log('✅ ONNX model loaded successfully');
			console.log('📊 Model inputs:', this.session.inputNames);
			console.log('📊 Model outputs:', this.session.outputNames);

			// Load and validate model metadata
			await this.loadModelMetadata();

			return this.session;
		} catch (error) {
			this.isLoaded = false;
			this.session = null;

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('❌ Failed to load ONNX model:', errorMessage);

			throw new Error(`Failed to load Gemma3 model: ${errorMessage}`);
		}
	}

	/**
	 * Validate loaded model for Gemma3 compatibility
	 * Requirement 1.2: Model validation
	 */
	async validateModel(session: InferenceSession): Promise<boolean> {
		try {
			if (!session) {
				throw new Error('Session is null or undefined');
			}

			console.log('🔍 Validating ONNX model...');

			// Check required inputs for Gemma3
			const requiredInputs = ['input_ids', 'attention_mask'];
			const sessionInputs = session.inputNames;

			for (const requiredInput of requiredInputs) {
				if (!sessionInputs.includes(requiredInput)) {
					throw new Error(`Missing required input: ${requiredInput}`);
				}
			}

			// Check required outputs
			const requiredOutputs = ['logits'];
			const sessionOutputs = session.outputNames;

			for (const requiredOutput of requiredOutputs) {
				if (!sessionOutputs.includes(requiredOutput)) {
					throw new Error(`Missing required output: ${requiredOutput}`);
				}
			}

			// Validate input shapes
			const inputMetadata = session.inputNames.map(name => ({
				name,
				type: 'tensor', // ONNX Runtime doesn't expose detailed type info in React Native
			}));

			console.log('📐 Input metadata:', inputMetadata);

			// Run a small test inference to validate functionality
			await this.runValidationInference(session);

			this.isValidated = true;
			console.log('✅ Model validation successful');

			return true;
		} catch (error) {
			this.isValidated = false;

			const errorMessage =
				error instanceof Error ? error.message : 'Unknown validation error';
			console.error('❌ Model validation failed:', errorMessage);

			return false;
		}
	}

	/**
	 * Run inference with proper input/output handling
	 * Requirement 1.1: Inference execution
	 */
	async runInference(session: InferenceSession, input: ModelInput): Promise<ModelOutput> {
		if (!session) {
			throw new Error('Session not initialized');
		}

		if (!this.isValidated) {
			throw new Error('Model not validated');
		}

		const startTime = Date.now();

		try {
			console.log('🧠 Running ONNX inference...');

			// Prepare input tensors
			const inputTensors = this.prepareInputTensors(input);

			// Run inference
			const results = await session.run(inputTensors);

			// Process output tensors
			const output = this.processOutputTensors(results);

			const inferenceTime = Date.now() - startTime;

			// Update performance metrics
			this.updatePerformanceMetrics(inferenceTime, true, input.input_ids.length);

			console.log(`✅ Inference completed in ${inferenceTime}ms`);

			return output;
		} catch (error) {
			const inferenceTime = Date.now() - startTime;
			this.updatePerformanceMetrics(inferenceTime, false, input.input_ids.length);

			const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
			console.error('❌ Inference failed:', errorMessage);

			throw new Error(`Inference failed: ${errorMessage}`);
		}
	}

	/**
	 * Optimize session for specific device capabilities
	 * Requirement 1.2: Device optimization
	 */
	optimizeSession(session: InferenceSession, deviceInfo: DeviceInfo): void {
		try {
			console.log('⚡ Optimizing session for device:', deviceInfo);

			// Adjust thread count based on CPU cores
			const optimalThreads = Math.min(deviceInfo.cpuCores, 8);
			this.sessionConfig.intraOpNumThreads = optimalThreads;

			// Adjust memory settings based on available memory
			if (deviceInfo.availableMemory < 1024) {
				// Less than 1GB
				this.sessionConfig.enableCpuMemArena = false;
				this.sessionConfig.enableMemPattern = false;
				this.sessionConfig.graphOptimizationLevel = 'basic';
			} else if (deviceInfo.availableMemory < 2048) {
				// Less than 2GB
				this.sessionConfig.graphOptimizationLevel = 'extended';
			} else {
				this.sessionConfig.graphOptimizationLevel = 'all';
			}

			// Enable GPU if available and memory allows
			if (deviceInfo.hasGPU && deviceInfo.availableMemory > 2048) {
				this.sessionConfig.executionProviders = ['coreml', 'cpu']; // iOS CoreML
			}

			// Adjust for thermal state
			if (deviceInfo.thermalState === 'serious' || deviceInfo.thermalState === 'critical') {
				this.sessionConfig.intraOpNumThreads = Math.max(1, Math.floor(optimalThreads / 2));
				this.sessionConfig.executionMode = 'sequential';
			}

			console.log('🔧 Optimized session config:', this.sessionConfig);
		} catch (error) {
			console.error('❌ Session optimization failed:', error);
			// Continue with default settings
		}
	}

	/**
	 * Monitor performance metrics during inference
	 */
	monitorPerformance(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Clean up session and free memory
	 * Requirement 1.2: Proper cleanup
	 */
	async cleanupSession(session: InferenceSession): Promise<void> {
		try {
			if (session) {
				console.log('🧹 Cleaning up ONNX session...');

				// ONNX Runtime React Native doesn't expose explicit cleanup methods
				// The session will be garbage collected when references are removed
				this.session = null;
				this.isLoaded = false;
				this.isValidated = false;

				// Reset performance metrics
				this.performanceMetrics = {
					averageInferenceTime: 0,
					tokensPerSecond: 0,
					memoryUsage: 0,
					cpuUsage: 0,
					thermalImpact: 'low',
					successRate: 0,
					totalInferences: 0,
				};

				console.log('✅ Session cleanup completed');
			}
		} catch (error) {
			console.error('❌ Session cleanup failed:', error);
			throw error;
		}
	}

	/**
	 * Get current memory usage statistics
	 */
	getMemoryUsage(): MemoryStats {
		// Note: ONNX Runtime React Native doesn't provide detailed memory stats
		// These are estimated values based on model size and inference patterns
		const estimatedModelMemory = this.metadata?.size
			? Math.ceil(this.metadata.size / (1024 * 1024))
			: 0;
		const estimatedSessionMemory = estimatedModelMemory * 0.3; // Rough estimate
		const totalUsage = estimatedModelMemory + estimatedSessionMemory;

		return {
			modelMemoryUsage: estimatedModelMemory,
			sessionMemoryUsage: estimatedSessionMemory,
			totalMemoryUsage: totalUsage,
			availableMemory: 0, // Would need native module to get actual values
			memoryPressure: totalUsage > 1024 ? 'high' : totalUsage > 512 ? 'medium' : 'low',
		};
	}

	/**
	 * Check if model is loaded and ready
	 */
	isModelReady(): boolean {
		return this.isLoaded && this.isValidated && this.session !== null;
	}

	/**
	 * Get model metadata
	 */
	getModelMetadata(): ModelMetadata | null {
		return this.metadata;
	}

	// Private helper methods

	/**
	 * Validate model file accessibility
	 */
	private async validateModelFile(modelPath: string): Promise<void> {
		try {
			// In React Native, we can't directly check file existence
			// The ONNX Runtime will throw an error if the file doesn't exist
			console.log('📁 Validating model file path:', modelPath);

			if (!modelPath || modelPath.trim() === '') {
				throw new Error('Model path is empty');
			}

			if (!modelPath.endsWith('.onnx')) {
				throw new Error('Model file must have .onnx extension');
			}
		} catch (error) {
			throw new Error(`Model file validation failed: ${error}`);
		}
	}

	/**
	 * Load model file as Uint8Array buffer for ONNX Runtime
	 */
	private async loadModelBuffer(modelPath: string): Promise<Uint8Array> {
		try {
			console.log('📂 Loading model buffer from:', modelPath);

			// In React Native, we need to use fetch or FileSystem API to load files
			// For now, we'll use fetch which works with local file:// URLs
			const response = await fetch(modelPath);

			if (!response.ok) {
				throw new Error(
					`Failed to fetch model file: ${response.status} ${response.statusText}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const uint8Array = new Uint8Array(arrayBuffer);

			console.log(`✅ Model buffer loaded: ${uint8Array.length} bytes`);

			return uint8Array;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('❌ Failed to load model buffer:', errorMessage);
			throw new Error(`Failed to load model buffer: ${errorMessage}`);
		}
	}

	/**
	 * Load model metadata from companion file or infer from model
	 */
	private async loadModelMetadata(): Promise<void> {
		try {
			// Try to load metadata from companion JSON file
			const metadataPath = this.modelPath.replace('.onnx', '.json');

			// For now, create default metadata based on model path
			const modelName = this.modelPath.split('/').pop()?.replace('.onnx', '') || 'unknown';

			this.metadata = {
				name: modelName,
				version: '1.0.0',
				size: 0, // Would need file system access to get actual size
				quantization: this.inferQuantizationFromPath(this.modelPath),
				inputShape: [1, -1], // Dynamic sequence length
				outputShape: [1, -1, 32000], // Typical vocab size for Gemma
				vocabSize: 32000,
				contextLength: 2048,
				supportedDevices: ['cpu', 'coreml'],
				minMemoryRequirement: 512,
				recommendedMemory: 1024,
				checksum: '', // Would need to compute from file
			};

			console.log('📋 Model metadata loaded:', this.metadata);
		} catch (error) {
			console.warn('⚠️ Could not load model metadata:', error);
			// Continue without metadata
		}
	}

	/**
	 * Infer quantization type from model path
	 */
	private inferQuantizationFromPath(path: string): 'int8' | 'int4' | 'fp16' | 'fp32' {
		const lowerPath = path.toLowerCase();

		if (lowerPath.includes('int8')) return 'int8';
		if (lowerPath.includes('int4')) return 'int4';
		if (lowerPath.includes('fp16')) return 'fp16';
		if (lowerPath.includes('fp32')) return 'fp32';

		return 'fp32'; // Default assumption
	}

	/**
	 * Run a small validation inference to test model functionality
	 */
	private async runValidationInference(session: InferenceSession): Promise<void> {
		try {
			console.log('🧪 Running validation inference...');

			// Create minimal test input
			const testInput: ModelInput = {
				input_ids: [1, 2, 3], // Simple test tokens
				attention_mask: [1, 1, 1],
			};

			const inputTensors = this.prepareInputTensors(testInput);
			const results = await session.run(inputTensors);

			// Check that we got expected outputs
			if (!results.logits) {
				throw new Error('Missing logits output in validation inference');
			}
		} catch (error) {
			throw new Error(`Validation inference failed: ${error}`);
		}
	}

	/**
	 * Prepare input tensors for ONNX Runtime
	 */
	private prepareInputTensors(input: ModelInput): Record<string, Tensor> {
		const tensors: Record<string, Tensor> = {};

		// Convert input_ids to tensor
		tensors.input_ids = new Tensor(
			'int64',
			BigInt64Array.from(input.input_ids.map(x => BigInt(x))),
			[1, input.input_ids.length],
		);

		// Convert attention_mask to tensor
		tensors.attention_mask = new Tensor(
			'int64',
			BigInt64Array.from(input.attention_mask.map(x => BigInt(x))),
			[1, input.attention_mask.length],
		);

		// Add position_ids if provided
		if (input.position_ids) {
			tensors.position_ids = new Tensor(
				'int64',
				BigInt64Array.from(input.position_ids.map(x => BigInt(x))),
				[1, input.position_ids.length],
			);
		}

		return tensors;
	}

	/**
	 * Process output tensors from ONNX Runtime
	 */
	private processOutputTensors(results: Record<string, Tensor>): ModelOutput {
		const output: ModelOutput = {
			logits: new Float32Array(0),
		};

		// Extract logits
		if (results.logits) {
			output.logits = results.logits.data as Float32Array;
		}

		// Extract hidden states if available
		if (results.hidden_states) {
			output.hidden_states = [results.hidden_states.data as Float32Array];
		}

		return output;
	}

	/**
	 * Update performance metrics after inference
	 */
	private updatePerformanceMetrics(
		inferenceTime: number,
		success: boolean,
		tokenCount: number,
	): void {
		this.performanceMetrics.totalInferences++;

		if (success) {
			// Update average inference time
			const totalTime =
				this.performanceMetrics.averageInferenceTime *
					(this.performanceMetrics.totalInferences - 1) +
				inferenceTime;
			this.performanceMetrics.averageInferenceTime =
				totalTime / this.performanceMetrics.totalInferences;

			// Update tokens per second
			this.performanceMetrics.tokensPerSecond = (tokenCount / inferenceTime) * 1000;

			// Estimate thermal impact based on inference time
			if (inferenceTime > 5000) {
				this.performanceMetrics.thermalImpact = 'high';
			} else if (inferenceTime > 2000) {
				this.performanceMetrics.thermalImpact = 'medium';
			} else {
				this.performanceMetrics.thermalImpact = 'low';
			}
		}

		// Update success rate
		const successfulInferences =
			this.performanceMetrics.totalInferences * this.performanceMetrics.successRate +
			(success ? 1 : 0);
		this.performanceMetrics.successRate =
			successfulInferences / this.performanceMetrics.totalInferences;
	}
}

/**
 * Utility functions for ONNX model management
 */
export const ONNXModelUtils = {
	/**
	 * Get recommended session config for device
	 */
	getRecommendedSessionConfig(deviceInfo: DeviceInfo): SessionConfig {
		const baseConfig: SessionConfig = {
			executionProviders: ['cpu'],
			graphOptimizationLevel: 'extended',
			enableCpuMemArena: true,
			enableMemPattern: true,
			executionMode: 'sequential',
			interOpNumThreads: 1,
			intraOpNumThreads: Math.min(deviceInfo.cpuCores, 4),
			logSeverityLevel: 2,
			logVerbosityLevel: 0,
		};

		// Adjust for low memory devices
		if (deviceInfo.availableMemory < 1024) {
			baseConfig.enableCpuMemArena = false;
			baseConfig.enableMemPattern = false;
			baseConfig.graphOptimizationLevel = 'basic';
			baseConfig.intraOpNumThreads = Math.min(deviceInfo.cpuCores, 2);
		}

		// Enable GPU acceleration if available
		if (deviceInfo.hasGPU && deviceInfo.availableMemory > 2048) {
			if (deviceInfo.platform === 'ios') {
				baseConfig.executionProviders = ['coreml', 'cpu'];
			} else {
				baseConfig.executionProviders = ['nnapi', 'cpu'];
			}
		}

		return baseConfig;
	},

	/**
	 * Estimate memory requirements for model
	 */
	estimateMemoryRequirements(modelSize: number, quantization: string): number {
		const baseMemory = Math.ceil(modelSize / (1024 * 1024)); // Convert to MB

		// Add overhead based on quantization
		const overhead =
			{
				int4: 1.2,
				int8: 1.3,
				fp16: 1.5,
				fp32: 2.0,
			}[quantization] || 2.0;

		return Math.ceil(baseMemory * overhead);
	},

	/**
	 * Validate model compatibility with device
	 */
	validateModelCompatibility(
		metadata: ModelMetadata,
		deviceInfo: DeviceInfo,
	): {
		compatible: boolean;
		issues: string[];
		recommendations: string[];
	} {
		const issues: string[] = [];
		const recommendations: string[] = [];

		// Check memory requirements
		if (deviceInfo.availableMemory < metadata.minMemoryRequirement) {
			issues.push(
				`Insufficient memory: ${deviceInfo.availableMemory}MB available, ${metadata.minMemoryRequirement}MB required`,
			);
		}

		if (deviceInfo.availableMemory < metadata.recommendedMemory) {
			recommendations.push('Consider using a smaller model or enabling power saving mode');
		}

		// Check device support
		const deviceSupported = metadata.supportedDevices.some(
			device => deviceInfo.platform.includes(device) || device === 'cpu',
		);

		if (!deviceSupported) {
			issues.push(`Device not supported: ${deviceInfo.platform}`);
		}

		return {
			compatible: issues.length === 0,
			issues,
			recommendations,
		};
	},
};
