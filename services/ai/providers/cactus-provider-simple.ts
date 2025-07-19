/**
 * Simple Cactus Provider for AI D&D Platform
 *
 * Based on the official Cactus example implementation
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CactusLM } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system';

// Types
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

// Constants
const MODELS_DIRECTORY = 'cactus-models';
const MODEL_CACHE_KEY = 'cactus-model-cache';
const STOP_WORDS = ['<|end_of_text|>', '<|endoftext|>', '', ''];

// Gemma 3 1B Instruct model URL from Hugging Face
const DEFAULT_MODEL_URL =
	'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf';

export class CactusProviderSimple {
	private lm: any = null;
	private modelName: string = 'Gemma3-1B-Instruct-Q4_0.gguf';
	private modelUrl: string;
	private apiKey?: string;

	isInitialized: boolean = false;

	constructor(modelUrl?: string, apiKey?: string) {
		this.modelUrl = modelUrl || DEFAULT_MODEL_URL;
		this.apiKey = apiKey;

		// Extract model name from URL
		const urlParts = this.modelUrl.split('/');
		this.modelName = urlParts[urlParts.length - 1];
	}

	/**
	 * Download the model file if needed
	 */
	private async downloadModel(onProgress?: (progress: number) => void): Promise<string> {
		// Ensure models directory exists
		const modelsDir = `${FileSystem.documentDirectory}/${MODELS_DIRECTORY}`;
		const dirInfo = await FileSystem.getInfoAsync(modelsDir);

		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
		}

		// Set up the download path
		const downloadPath = `${modelsDir}/${this.modelName}`;
		const fileInfo = await FileSystem.getInfoAsync(downloadPath);

		// If file already exists, return its path
		if (fileInfo.exists) {
			console.warn(`Model already exists at ${downloadPath}`);
			return downloadPath;
		}

		// Start download with progress tracking
		if (onProgress) onProgress(0);
		console.warn(`Downloading model from ${this.modelUrl} to ${downloadPath}`);

		try {
			const downloadResumable = FileSystem.createDownloadResumable(
				this.modelUrl,
				downloadPath,
				{},
				downloadProgress => {
					const progress =
						downloadProgress.totalBytesWritten /
						downloadProgress.totalBytesExpectedToWrite;
					if (onProgress) onProgress(progress);
				},
			);

			const result = await downloadResumable.downloadAsync();

			if (!result || result.status !== 200) {
				throw new Error(`Download failed with status ${result?.status || 'unknown'}`);
			}

			// Cache the model path
			await AsyncStorage.setItem(
				MODEL_CACHE_KEY,
				JSON.stringify({ path: downloadPath, name: this.modelName }),
			);

			return downloadPath;
		} catch (error) {
			console.error('Error downloading model:', error);
			throw error;
		}
	}

	/**
	 * Initialize the Cactus LLM
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		if (this.isInitialized) return true;

		try {
			// Download the model
			const modelPath = await this.downloadModel(onProgress);
			console.warn(`Model downloaded to ${modelPath}, initializing...`);

			// Initialize the LLM
			const { lm, error } = await CactusLM.init(
				{
					model: modelPath,
					n_ctx: 2048,
					n_batch: 32,
					n_gpu_layers: 99, // Use all available GPU layers
					n_threads: 4,
				},
				onProgress,
				this.apiKey, // Optional enterprise token
			);

			if (error) {
				console.error(`Failed to initialize Cactus LLM: ${error}`);
				throw new Error(`Failed to initialize Cactus LLM: ${error}`);
			}

			this.lm = lm;
			this.isInitialized = true;
			console.warn('Cactus LLM initialized successfully');
			return true;
		} catch (error) {
			console.error('Error initializing Cactus LLM:', error);
			throw error;
		}
	}

	/**
	 * Generate a completion from the provided messages
	 */
	async completion(
		messages: CactusMessage[],
		params: CactusCompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('Cactus LLM not initialized');
		}

		const completionParams = {
			n_predict: params.n_predict || 256,
			temperature: params.temperature || 0.7,
			top_p: params.top_p || 0.9,
			stop: params.stop || STOP_WORDS,
		};

		try {
			const startTime = performance.now();
			let firstTokenTime: number | null = null;
			let responseText = '';

			const result = await this.lm.completion(messages, completionParams, (data: any) => {
				if (firstTokenTime === null && data.token) {
					firstTokenTime = performance.now();
				}
				if (data.token) {
					responseText += data.token;
				}
			});

			responseText = responseText || result.text || '';

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : totalTime;

			console.warn(
				`LLM: TTFT ${timeToFirstToken.toFixed(0)}ms | Total time: ${totalTime.toFixed(0)}ms`,
			);

			return responseText;
		} catch (error) {
			console.error('Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Reset the conversation context
	 */
	rewind(): void {
		if (this.lm) {
			this.lm.rewind();
		}
	}
}

// Helper function to create a provider instance
export const createCactusProviderSimple = (modelUrl?: string, apiKey?: string) => {
	return new CactusProviderSimple(modelUrl, apiKey);
};
