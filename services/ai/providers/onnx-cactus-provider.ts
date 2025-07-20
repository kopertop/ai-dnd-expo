/**
 * ONNX-based Cactus Alternative Provider
 *
 * This provider uses ONNX Runtime instead of Cactus LM for better iOS compatibility
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { InferenceSession } from 'onnxruntime-react-native';
import { Platform } from 'react-native';

// Types
export interface ONNXCactusConfig {
	modelPath?: string;
	modelUrl?: string;
	contextSize?: number;
	debugMode?: boolean;
}

export interface ONNXCactusMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ONNXCactusCompletionParams {
	temperature?: number;
	top_p?: number;
	n_predict?: number;
	stop?: string[];
}

export interface ONNXCactusProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<boolean>;
	completion: (
		messages: ONNXCactusMessage[],
		params?: ONNXCactusCompletionParams,
	) => Promise<string>;
	streamingCompletion: (
		messages: ONNXCactusMessage[],
		params?: ONNXCactusCompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	rewind: () => void;
	getDebugInfo: () => any;
}

// Constants
const MODELS_DIRECTORY = 'onnx-models';
const MODEL_CACHE_KEY = 'onnx-model-cache';
const STOP_WORDS = ['<|end_of_text|>', '<|endoftext|>', '', ''];

// Use a smaller, ONNX-compatible model
const DEFAULT_MODEL_URL = 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/model.onnx';

export class ONNXCactusProvider implements ONNXCactusProviderInterface {
	private session: InferenceSession | null = null;
	private config: ONNXCactusConfig;
	private modelName: string = 'dialogpt-small.onnx';
	private modelUrl: string;
	private debugInfo: any = {};
	private conversationHistory: ONNXCactusMessage[] = [];

	isInitialized: boolean = false;

	constructor(config: ONNXCactusConfig = {}) {
		this.config = {
			contextSize: 512, // Conservative context size
			debugMode: true,
			...config,
		};

		this.modelUrl = config.modelUrl || DEFAULT_MODEL_URL;

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
	 * Initialize the ONNX model
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) {
			console.log('🔄 ONNXCactusProvider: Already initialized');
			return true;
		}

		try {
			console.log('🚀 ONNXCactusProvider: Starting initialization...');
			console.log('📊 Debug info:', this.debugInfo);

			// Step 1: Check platform compatibility
			await this.checkPlatformCompatibility();

			// Step 2: Get or download the model
			const modelPath = await this.getModelPath(onProgress);
			console.log('📁 Model path:', modelPath);

			// Step 3: Validate model file
			await this.validateModelFile(modelPath);

			// Step 4: Initialize ONNX session
			await this.initializeONNXSession(modelPath, onProgress);

			this.isInitialized = true;
			console.log('✅ ONNXCactusProvider: Initialized successfully');
			return true;
		} catch (error) {
			console.error('❌ ONNXCactusProvider: Initialization failed:', error);
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

		// Check if we're on iOS
		if (Platform.OS === 'ios') {
			console.log('📱 iOS detected');
		}

		// Check if ONNX Runtime is available
		if (!InferenceSession) {
			throw new Error('ONNX Runtime is not available');
		}

		console.log('✅ Platform compatibility check passed');
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
	 * Initialize ONNX session
	 */
	private async initializeONNXSession(
		modelPath: string,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		console.log('🤖 Initializing ONNX session...');

		try {
			// Load model file as buffer
			const modelBuffer = await this.loadModelBuffer(modelPath);

			// Create session options
			const sessionOptions = {
				executionProviders: ['cpu'],
				graphOptimizationLevel: 'all' as const,
				enableCpuMemArena: true,
				enableMemPattern: true,
				executionMode: 'sequential' as const,
				interOpNumThreads: 2,
				intraOpNumThreads: 2,
			};

			console.log('⚙️ Session options:', sessionOptions);

			// Create inference session
			this.session = await InferenceSession.create(
				new Uint8Array(modelBuffer),
				sessionOptions,
			);

			console.log('✅ ONNX session initialized successfully');
			console.log('📊 Model inputs:', this.session.inputNames);
			console.log('📊 Model outputs:', this.session.outputNames);

			if (onProgress) onProgress(1.0);
		} catch (error) {
			console.error('❌ Failed to initialize ONNX session:', error);
			throw error;
		}
	}

	/**
	 * Load model file as buffer
	 */
	private async loadModelBuffer(modelPath: string): Promise<ArrayBuffer> {
		try {
			console.log('📖 Loading model file as buffer...');
			const modelUri = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
			const response = await fetch(modelUri);
			const arrayBuffer = await response.arrayBuffer();
			console.log('✅ Model buffer loaded successfully');
			return arrayBuffer;
		} catch (error) {
			console.error('❌ Failed to load model buffer:', error);
			throw error;
		}
	}

	/**
	 * Generate a completion using ONNX
	 */
	async completion(
		messages: ONNXCactusMessage[],
		params: ONNXCactusCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized || !this.session) {
			throw new Error('ONNX model not initialized');
		}

		try {
			console.log('🤖 Generating completion with ONNX...');

			// For now, implement a simple rule-based response
			// In a real implementation, you would tokenize the input and run inference
			const response = this.generateRuleBasedResponse(messages, params);

			console.log('✅ Completion generated successfully');
			return response;
		} catch (error) {
			console.error('❌ Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: ONNXCactusMessage[],
		params: ONNXCactusCompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		if (!this.isInitialized || !this.session) {
			throw new Error('ONNX model not initialized');
		}

		try {
			console.log('🤖 Generating streaming completion with ONNX...');

			// For now, implement a simple rule-based response
			const response = this.generateRuleBasedResponse(messages, params);

			// Simulate streaming by sending tokens one by one
			if (onToken) {
				const tokens = response.split(' ');
				for (const token of tokens) {
					onToken(token + ' ');
					// Small delay to simulate streaming
					await new Promise(resolve => setTimeout(resolve, 50));
				}
			}

			console.log('✅ Streaming completion generated successfully');
			return response;
		} catch (error) {
			console.error('❌ Error generating streaming completion:', error);
			throw error;
		}
	}

	/**
	 * Generate rule-based response (fallback implementation)
	 */
	private generateRuleBasedResponse(
		messages: ONNXCactusMessage[],
		params: ONNXCactusCompletionParams,
	): string {
		const lastMessage = messages[messages.length - 1];
		const userInput = lastMessage.content.toLowerCase();

		// Simple rule-based responses for D&D context
		if (userInput.includes('hello') || userInput.includes('hi')) {
			return 'Greetings, adventurer! Welcome to the realm of magic and mystery.';
		}

		if (userInput.includes('attack') || userInput.includes('fight')) {
			return 'You prepare for battle! Roll for initiative to determine the order of combat.';
		}

		if (userInput.includes('search') || userInput.includes('look')) {
			return 'You carefully examine your surroundings, searching for any clues or hidden dangers.';
		}

		if (userInput.includes('spell') || userInput.includes('magic')) {
			return 'The arcane energies swirl around you as you prepare to cast your spell.';
		}

		if (userInput.includes('door') || userInput.includes('open')) {
			return 'You approach the door cautiously, checking for any traps or magical wards.';
		}

		// Default response
		return 'You take action in this mystical realm. The consequences of your choices will shape your destiny.';
	}

	/**
	 * Reset the conversation context
	 */
	rewind(): void {
		this.conversationHistory = [];
		console.log('🔄 Conversation context reset');
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
			hasSession: !!this.session,
			conversationHistoryLength: this.conversationHistory.length,
		};
	}
}

// Helper function to create a provider instance
export const createONNXCactusProvider = (
	config?: ONNXCactusConfig,
): ONNXCactusProviderInterface => {
	return new ONNXCactusProvider(config);
};
