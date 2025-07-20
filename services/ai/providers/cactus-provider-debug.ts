/**
 * Debug Cactus Provider for AI D&D Platform
 *
 * This version includes comprehensive debugging and error handling
 * to identify the core issues with Cactus LM initialization
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CactusLM } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Types
export interface CactusProviderDebugConfig {
	modelPath?: string;
	modelUrl?: string;
	contextSize?: number;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
	debugMode?: boolean;
}

export interface CactusMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface CactusCompletionParams {
	temperature?: number;
	top_p?: number;
	n_predict?: number;
	stop?: string[];
}

export interface CactusProviderDebugInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (messages: CactusMessage[], params?: CactusCompletionParams) => Promise<string>;
	streamingCompletion: (
		messages: CactusMessage[],
		params?: CactusCompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	rewind: () => void;
	getDebugInfo: () => any;
}

// Constants
const MODELS_DIRECTORY = 'cactus-models';
const MODEL_CACHE_KEY = 'cactus-model-cache-debug';
const STOP_WORDS = ['<|end_of_text|>', '<|endoftext|>', '', ''];

// Smaller, more compatible model for testing
const DEFAULT_MODEL_URL =
	'https://huggingface.co/TheBloke/Gemma-2-9B-Instruct-GGUF/resolve/main/gemma-2-9b-instruct-q4_0.gguf';

export class CactusProviderDebug implements CactusProviderDebugInterface {
	private lm: any = null;
	private config: CactusProviderDebugConfig;
	private modelName: string = 'gemma-2-9b-instruct-q4_0.gguf';
	private modelUrl: string;
	private apiKey?: string;
	private debugInfo: any = {};

	isInitialized: boolean = false;

	constructor(config: CactusProviderDebugConfig = {}) {
		this.config = {
			contextSize: 1024, // Reduced context size for better compatibility
			fallbackMode: 'localfirst',
			debugMode: true,
			...config,
		};

		this.modelUrl = config.modelUrl || DEFAULT_MODEL_URL;
		this.apiKey = config.apiKey;

		// Extract model name from URL
		const urlParts = this.modelUrl.split('/');
		this.modelName = urlParts[urlParts.length - 1];

		this.debugInfo = {
			platform: Platform.OS,
			version: Platform.Version,
			modelUrl: this.modelUrl,
			modelName: this.modelName,
			config: this.config,
		};
	}

	/**
	 * Initialize the Cactus LLM with comprehensive debugging
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			console.log('🔄 CactusProviderDebug: Already initialized');
			return true;
		}

		try {
			console.log('🚀 CactusProviderDebug: Starting initialization...');
			console.log('📊 Debug info:', this.debugInfo);

			// Step 1: Check platform compatibility
			await this.checkPlatformCompatibility();

			// Step 2: Get or download the model
			const modelPath = await this.getModelPath(onProgress);
			console.log('📁 Model path:', modelPath);

			// Step 3: Validate model file
			await this.validateModelFile(modelPath);

			// Step 4: Initialize with conservative settings
			const initResult = await this.initializeWithFallback(modelPath, onProgress);

			if (initResult.success) {
				this.lm = initResult.lm;
				this.isInitialized = true;
				console.log('✅ CactusProviderDebug: Initialized successfully');
				return true;
			} else {
				throw new Error(`Initialization failed: ${initResult.error}`);
			}
		} catch (error) {
			console.error('❌ CactusProviderDebug: Initialization failed:', error);
			this.debugInfo.lastError = error instanceof Error ? error.message : String(error);
			this.debugInfo.lastErrorStack = error instanceof Error ? error.stack : undefined;
			throw error;
		}
	}

	/**
	 * Check platform compatibility
	 */
	private async checkPlatformCompatibility(): Promise<void> {
		console.log('🔍 Checking platform compatibility...');

		// Check if we're on iOS simulator
		if (Platform.OS === 'ios') {
			console.log('📱 iOS detected');

			// Check available memory
			try {
				const memoryInfo = await this.getMemoryInfo();
				console.log('💾 Memory info:', memoryInfo);

				if (memoryInfo.availableMemory < 500 * 1024 * 1024) {
					// 500MB
					console.warn('⚠️ Low memory available, using conservative settings');
					this.config.contextSize = Math.min(this.config.contextSize || 1024, 512);
				}
			} catch (error) {
				console.warn('⚠️ Could not get memory info:', error);
			}
		}

		// Check if CactusLM is available
		if (!CactusLM) {
			throw new Error('CactusLM is not available');
		}

		console.log('✅ Platform compatibility check passed');
	}

	/**
	 * Get memory information (iOS only)
	 */
	private async getMemoryInfo(): Promise<any> {
		if (Platform.OS !== 'ios') {
			return { availableMemory: 1024 * 1024 * 1024 }; // Assume 1GB for non-iOS
		}

		try {
			// This is a simplified memory check - in a real app you'd use a native module
			return {
				availableMemory: 512 * 1024 * 1024, // Assume 512MB for iOS simulator
				totalMemory: 1024 * 1024 * 1024, // Assume 1GB
			};
		} catch (error) {
			console.warn('Could not get memory info:', error);
			return { availableMemory: 512 * 1024 * 1024 };
		}
	}

	/**
	 * Get model path with caching
	 */
	private async getModelPath(onProgress?: (progress: number) => void): Promise<string> {
		// If model path is directly provided, use it
		if (this.config.modelPath) {
			return this.config.modelPath;
		}

		// Check if we have a cached model path
		const cachedPath = await this.getCachedModelPath();
		if (cachedPath) {
			console.log('📦 Using cached model:', cachedPath);
			return cachedPath;
		}

		// Download the model
		return this.downloadModel(onProgress);
	}

	/**
	 * Get cached model path if available
	 */
	private async getCachedModelPath(): Promise<string | null> {
		try {
			const cachedInfo = await AsyncStorage.getItem(MODEL_CACHE_KEY);
			if (cachedInfo) {
				const { path, name } = JSON.parse(cachedInfo);

				// Verify the model name matches and file exists
				if (name === this.modelName && (await this.fileExists(path))) {
					return path;
				}
			}
			return null;
		} catch (error) {
			console.warn('Error checking cached model:', error);
			return null;
		}
	}

	/**
	 * Check if a file exists
	 */
	private async fileExists(path: string): Promise<boolean> {
		try {
			const info = await FileSystem.getInfoAsync(path);
			return info.exists;
		} catch {
			return false;
		}
	}

	/**
	 * Download the model with error handling
	 */
	private async downloadModel(onProgress?: (progress: number) => void): Promise<string> {
		console.log('📥 Starting model download...');

		// Ensure models directory exists
		const modelsDir = `${FileSystem.documentDirectory}${MODELS_DIRECTORY}`;
		const dirInfo = await FileSystem.getInfoAsync(modelsDir);

		if (!dirInfo.exists) {
			console.log('📁 Creating models directory:', modelsDir);
			await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
		}

		// Set up the download path
		const downloadPath = `${modelsDir}/${this.modelName}`;
		const fileInfo = await FileSystem.getInfoAsync(downloadPath);

		// If file already exists, return its path
		if (fileInfo.exists) {
			console.log('📦 Model already exists at:', downloadPath);
			return downloadPath;
		}

		// Start download with progress tracking
		if (onProgress) onProgress(0);
		console.log('📥 Downloading model from:', this.modelUrl);
		console.log('📁 Downloading to:', downloadPath);

		try {
			const downloadResumable = FileSystem.createDownloadResumable(
				this.modelUrl,
				downloadPath,
				{},
				downloadProgress => {
					const progress =
						downloadProgress.totalBytesWritten /
						downloadProgress.totalBytesExpectedToWrite;
					console.log(`📊 Download progress: ${Math.round(progress * 100)}%`);
					if (onProgress) onProgress(progress);
				},
			);

			const result = await downloadResumable.downloadAsync();

			if (!result || result.status !== 200) {
				throw new Error(`Download failed with status ${result?.status || 'unknown'}`);
			}

			// Verify file was downloaded
			const finalFileInfo = await FileSystem.getInfoAsync(downloadPath);
			if (!finalFileInfo.exists) {
				throw new Error('Download completed but file not found');
			}

			console.log('✅ Model downloaded successfully');
			console.log('📊 File size:', finalFileInfo.size, 'bytes');

			// Cache the model path
			await AsyncStorage.setItem(
				MODEL_CACHE_KEY,
				JSON.stringify({ path: downloadPath, name: this.modelName }),
			);

			return downloadPath;
		} catch (error) {
			console.error('❌ Error downloading model:', error);
			throw error;
		}
	}

	/**
	 * Validate model file
	 */
	private async validateModelFile(modelPath: string): Promise<void> {
		console.log('🔍 Validating model file...');

		const fileInfo = await FileSystem.getInfoAsync(modelPath);
		if (!fileInfo.exists) {
			throw new Error(`Model file does not exist: ${modelPath}`);
		}

		if (fileInfo.size === 0) {
			throw new Error(`Model file is empty: ${modelPath}`);
		}

		console.log('✅ Model file validation passed');
		console.log('📊 File size:', fileInfo.size, 'bytes');
	}

	/**
	 * Initialize with fallback strategies
	 */
	private async initializeWithFallback(
		modelPath: string,
		onProgress?: (progress: number) => void,
	): Promise<{ success: boolean; lm?: any; error?: string }> {
		const strategies = [
			{
				name: 'Conservative Settings',
				config: {
					model: modelPath,
					n_ctx: 512, // Very small context
					n_batch: 8, // Small batch size
					n_gpu_layers: 0, // CPU only
					n_threads: 2, // Few threads
				},
			},
			{
				name: 'Balanced Settings',
				config: {
					model: modelPath,
					n_ctx: 1024,
					n_batch: 16,
					n_gpu_layers: 0,
					n_threads: 4,
				},
			},
			{
				name: 'Performance Settings',
				config: {
					model: modelPath,
					n_ctx: 2048,
					n_batch: 32,
					n_gpu_layers: 99,
					n_threads: 4,
				},
			},
		];

		for (const strategy of strategies) {
			try {
				console.log(`🔄 Trying ${strategy.name}...`);
				console.log('⚙️ Config:', strategy.config);

				const { lm, error } = await CactusLM.init(strategy.config, onProgress, this.apiKey);

				if (error) {
					console.warn(`❌ ${strategy.name} failed:`, error);
					continue;
				}

				console.log(`✅ ${strategy.name} succeeded!`);
				this.debugInfo.successfulStrategy = strategy.name;
				this.debugInfo.finalConfig = strategy.config;

				return { success: true, lm };
			} catch (error) {
				console.warn(`❌ ${strategy.name} failed:`, error);
				continue;
			}
		}

		return {
			success: false,
			error: 'All initialization strategies failed',
		};
	}

	/**
	 * Generate a completion
	 */
	async completion(
		messages: CactusMessage[],
		params: CactusCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('Cactus LLM not initialized');
		}

		const completionParams = {
			n_predict: params.n_predict || 128, // Reduced for debugging
			temperature: params.temperature || 0.7,
			top_p: params.top_p || 0.9,
			stop: params.stop || STOP_WORDS,
		};

		try {
			console.log('🤖 Generating completion...');
			const result = await this.lm.completion(messages, completionParams);
			console.log('✅ Completion generated successfully');
			return result.text || '';
		} catch (error) {
			console.error('❌ Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: CactusMessage[],
		params: CactusCompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('Cactus LLM not initialized');
		}

		const completionParams = {
			n_predict: params.n_predict || 128,
			temperature: params.temperature || 0.7,
			top_p: params.top_p || 0.9,
			stop: params.stop || STOP_WORDS,
		};

		let responseText = '';

		try {
			console.log('🤖 Generating streaming completion...');
			const result = await this.lm.completion(messages, completionParams, (data: any) => {
				if (data.token) {
					responseText += data.token;
					if (onToken) onToken(data.token);
				}
			});

			console.log('✅ Streaming completion generated successfully');
			return responseText || result.text || '';
		} catch (error) {
			console.error('❌ Error generating streaming completion:', error);
			throw error;
		}
	}

	/**
	 * Reset the conversation context
	 */
	rewind(): void {
		if (this.lm) {
			this.lm.rewind();
			console.log('🔄 Conversation context reset');
		}
	}

	/**
	 * Get debug information
	 */
	getDebugInfo(): any {
		return {
			...this.debugInfo,
			isInitialized: this.isInitialized,
			modelPath: this.config.modelPath,
			modelUrl: this.modelUrl,
			modelName: this.modelName,
		};
	}
}

// Helper function to create a debug provider instance
export const createCactusProviderDebug = (
	config?: CactusProviderDebugConfig,
): CactusProviderDebugInterface => {
	return new CactusProviderDebug(config);
};
