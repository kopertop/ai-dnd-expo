import { LanguageModelV1 } from '@ai-sdk/provider';
import { getModel, downloadModel, prepareModel, getModels } from '@react-native-ai/mlc';
import { streamText } from 'ai';

// Local AI model provider based on Callstack Incubator AI architecture
export class LocalAIProvider {
	private models: Map<string, LanguageModelV1> = new Map();
	private isInitialized = false;

	/**
	 * Initialize the local AI provider with Gemma3 model
	 */
	async initialize() {
		if (this.isInitialized) return;
		
		console.log('🤖 LocalAIProvider initializing...');
		
		try {
			// Check available models
			const availableModels = await getModels();
			console.log('📋 Available models:', availableModels);
			
			this.isInitialized = true;
			console.log('✅ LocalAIProvider initialized successfully');
		} catch (error) {
			console.error('❌ Failed to initialize LocalAIProvider:', error);
			throw error;
		}
	}

	/**
	 * Get a model instance for AI generation
	 * @param modelId - The model ID (e.g., 'gemma-3-2b-instruct')
	 */
	getModel(modelId: string): LanguageModelV1 {
		if (!this.models.has(modelId)) {
			// Get the actual MLC model instance
			const mlcModel = getModel(modelId);
			this.models.set(modelId, mlcModel);
		}

		return this.models.get(modelId)!;
	}

	/**
	 * Generate text using the local AI model
	 * @param modelId - The model ID
	 * @param messages - The conversation messages
	 * @param options - Generation options
	 */
	async generateText(
		modelId: string,
		messages: Array<{
			role: 'user' | 'assistant' | 'system';
			content: string;
		}>,
		options: {
			temperature?: number;
			maxTokens?: number;
		} = {},
	): Promise<string> {
		const model = this.getModel(modelId);
		
		const result = await streamText({
			model,
			messages,
			temperature: options.temperature ?? 0.7,
			maxTokens: options.maxTokens ?? 1000,
		});

		let fullText = '';
		for await (const chunk of result.textStream) {
			fullText += chunk;
		}

		return fullText;
	}

	/**
	 * Generate streaming text using the local AI model
	 * @param modelId - The model ID
	 * @param messages - The conversation messages
	 * @param options - Generation options
	 */
	async generateStream(
		modelId: string,
		messages: Array<{
			role: 'user' | 'assistant' | 'system';
			content: string;
		}>,
		options: {
			temperature?: number;
			maxTokens?: number;
		} = {},
	) {
		const model = this.getModel(modelId);
		
		return streamText({
			model,
			messages,
			temperature: options.temperature ?? 0.7,
			maxTokens: options.maxTokens ?? 1000,
		});
	}

	/**
	 * Check if a model is available locally
	 * @param modelId - The model ID to check
	 */
	async isModelAvailable(modelId: string): Promise<boolean> {
		// Mock implementation - will check actual model availability
		return true;
	}

	/**
	 * Download a model for local use
	 * @param modelId - The model ID to download
	 * @param onProgress - Progress callback
	 */
	async downloadModel(
		modelId: string,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		console.log(`📥 Starting download of model: ${modelId}`);
		
		return downloadModel(modelId, {
			onStart: () => {
				console.log(`🔄 Download started for ${modelId}`);
			},
			onProgress: (progress) => {
				console.log(`📊 Download progress: ${progress.percentage}%`);
				onProgress?.(progress.percentage);
			},
			onComplete: () => {
				console.log(`✅ Download completed for ${modelId}`);
			},
			onError: (error) => {
				console.error(`❌ Download failed for ${modelId}:`, error);
				throw error;
			},
		});
	}

	/**
	 * Prepare a model for inference
	 * @param modelId - The model ID to prepare
	 */
	async prepareModel(modelId: string): Promise<void> {
		console.log(`🔧 Preparing model: ${modelId}`);
		await prepareModel(modelId);
		console.log(`✅ Model prepared: ${modelId}`);
	}

	/**
	 * Get list of available models
	 */
	async getAvailableModels(): Promise<string[]> {
		try {
			const models = await getModels();
			return models.map(model => model.model_id).filter(Boolean) as string[];
		} catch (error) {
			console.error('Failed to get available models:', error);
			// Return Gemma3 models as fallback
			return [
				'gemma-3-2b-instruct',
				'gemma-3-8b-instruct',
			];
		}
	}
}

// Global instance
export const localAIProvider = new LocalAIProvider();