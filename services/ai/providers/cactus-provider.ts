import AsyncStorage from '@react-native-async-storage/async-storage';
import { CactusLM } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system';

// Types
export interface CactusProviderConfig {
	modelPath?: string;
	modelUrl?: string;
	contextSize?: number;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
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

export interface CactusProviderInterface {
	isInitialized: boolean;
	initialize: (onProgress?: (progress: number) => void) => Promise<void>;
	completion: (messages: CactusMessage[], params?: CactusCompletionParams) => Promise<string>;
	streamingCompletion: (
		messages: CactusMessage[],
		params?: CactusCompletionParams,
		onToken?: (token: string) => void,
	) => Promise<string>;
	rewind: () => void;
}

// Constants
const DEFAULT_MODEL_URL =
	'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf';
const DEFAULT_CONTEXT_SIZE = 2048;
const MODELS_DIRECTORY = 'cactus-models';
const MODEL_CACHE_KEY = 'cactus-model-cache';

export class CactusProvider implements CactusProviderInterface {
	private lm: any = null;
	private config: CactusProviderConfig;
	private modelName: string = 'Gemma3-1B-Instruct-Q4_0.gguf';

	isInitialized: boolean = false;

	constructor(config: CactusProviderConfig = {}) {
		this.config = {
			contextSize: DEFAULT_CONTEXT_SIZE,
			fallbackMode: 'localfirst',
			...config,
		};

		// Extract model name from URL if provided
		if (this.config.modelUrl) {
			const urlParts = this.config.modelUrl.split('/');
			this.modelName = urlParts[urlParts.length - 1];
		}
	}

	/**
	 * Initialize the Cactus LLM
	 */
	async initialize(onProgress?: (progress: number) => void): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Get or download the model
			const modelPath = await this.getModelPath(onProgress);

			// Initialize the LLM
			const { lm, error } = await CactusLM.init(
				{
					model: modelPath,
					n_ctx: this.config.contextSize,
					n_batch: 32,
					n_gpu_layers: 99, // Use all available GPU layers
					n_threads: 4,
				},
				onProgress,
				this.config.apiKey, // Optional enterprise token
			);

			if (error) {
				throw new Error(`Failed to initialize Cactus LLM: ${error}`);
			}

			this.lm = lm;
			this.isInitialized = true;
			console.log('Cactus LLM initialized successfully');
		} catch (error) {
			console.error('Error initializing Cactus LLM:', error);
			throw error;
		}
	}

	/**
	 * Get the model path, downloading if necessary
	 */
	private async getModelPath(onProgress?: (progress: number) => void): Promise<string> {
		// If model path is directly provided, use it
		if (this.config.modelPath) {
			return this.config.modelPath;
		}

		// Check if we have a cached model path
		const cachedPath = await this.getCachedModelPath();
		if (cachedPath) {
			return cachedPath;
		}

		// Download the model
		const modelUrl = this.config.modelUrl || DEFAULT_MODEL_URL;
		return this.downloadModel(modelUrl, onProgress);
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
	 * Download the model from the provided URL
	 */
	private async downloadModel(
		url: string,
		onProgress?: (progress: number) => void,
	): Promise<string> {
		// Ensure models directory exists
		const modelsDir = `${FileSystem.documentDirectory}${MODELS_DIRECTORY}`;
		const dirInfo = await FileSystem.getInfoAsync(modelsDir);

		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
		}

		// Set up the download path
		const downloadPath = `${modelsDir}/${this.modelName}`;

		// Start download with progress tracking
		if (onProgress) onProgress(0);

		try {
			const downloadResumable = FileSystem.createDownloadResumable(
				url,
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
			stop: params.stop || [],
			mode: this.config.fallbackMode,
		};

		try {
			const result = await this.lm.completion(messages, completionParams);
			return result.text || '';
		} catch (error) {
			console.error('Error generating completion:', error);
			throw error;
		}
	}

	/**
	 * Generate a streaming completion with token callbacks
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
			n_predict: params.n_predict || 256,
			temperature: params.temperature || 0.7,
			top_p: params.top_p || 0.9,
			stop: params.stop || [],
			mode: this.config.fallbackMode,
		};

		let responseText = '';

		try {
			const result = await this.lm.completion(messages, completionParams, (data: any) => {
				if (data.token) {
					responseText += data.token;
					if (onToken) onToken(data.token);
				}
			});

			// In case the streaming didn't capture everything
			return responseText || result.text || '';
		} catch (error) {
			console.error('Error generating streaming completion:', error);
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
export const createCactusProvider = (config?: CactusProviderConfig): CactusProviderInterface => {
	return new CactusProvider(config);
};
