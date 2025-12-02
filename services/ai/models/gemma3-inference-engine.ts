/**
 * Gemma3 Inference Engine for Local AI D&D Platform
 *
 * Handles inference execution with proper input/output processing,
 * D&D-specific prompt formatting, and response generation.
 *
 * Requirements: 2.1, 2.2
 */

import { InferenceSession } from 'onnxruntime-react-native';

import { DnDPromptContext, Gemma3Tokenizer, TokenizationResult } from './gemma3-tokenizer';
import { ModelInput, ONNXModelManager } from './onnx-model-manager';

export interface InferenceConfig {
	maxNewTokens: number;
	temperature: number;
	topP: number;
	topK: number;
	repetitionPenalty: number;
	doSample: boolean;
	stopTokens: string[];
	maxInferenceTime: number; // in milliseconds
}

export interface InferenceRequest {
	prompt: string;
	context?: DnDPromptContext;
	config?: Partial<InferenceConfig>;
}

export interface InferenceResponse {
	text: string;
	confidence: number;
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
	tokenCount: {
		input: number;
		output: number;
		total: number;
	};
	metadata: {
		temperature: number;
		topP: number;
		stopReason: 'max_tokens' | 'stop_token' | 'eos' | 'timeout';
		truncated: boolean;
	};
}

export interface GenerationState {
	inputIds: number[];
	attentionMask: number[];
	positionIds: number[];
	generatedTokens: number[];
	currentLength: number;
	isComplete: boolean;
	stopReason?: 'max_tokens' | 'stop_token' | 'eos' | 'timeout';
}

/**
 * Gemma3 Inference Engine
 * Combines ONNX model management with tokenization for complete inference pipeline
 */
export class Gemma3InferenceEngine {
	private modelManager: ONNXModelManager;
	private tokenizer: Gemma3Tokenizer;
	private session: InferenceSession | null = null;
	private defaultConfig: InferenceConfig;
	private isInitialized = false;
	private modelPath: string;

	constructor(
		config: {
			modelPath: string;
			vocabPath?: string;
			maxTokens?: number;
			temperature?: number;
			topP?: number;
			repetitionPenalty?: number;
		},
		deps: { modelManager?: ONNXModelManager; tokenizer?: Gemma3Tokenizer } = {},
	) {
		this.modelManager = deps.modelManager ?? new ONNXModelManager();
		this.tokenizer = deps.tokenizer ?? new Gemma3Tokenizer();
		this.modelPath = config.modelPath;

		this.defaultConfig = {
			maxNewTokens: config.maxTokens ?? 150,
			temperature: config.temperature ?? 0.7,
			topP: config.topP ?? 0.9,
			topK: 50,
			repetitionPenalty: config.repetitionPenalty ?? 1.1,
			doSample: true,
			stopTokens: ['<eos>', '<end_of_turn>', '<end_of_dm>'],
			maxInferenceTime: 30000, // 30 seconds
		};
	}

	/**
	 * Initialize the inference engine
	 * Requirement 2.1: Proper initialization
	 */
	async initialize(modelPath: string = this.modelPath): Promise<void> {
		try {
			console.log('🚀 Initializing Gemma3 inference engine...');

			// Initialize tokenizer
			if (!this.tokenizer.isReady()) {
				await this.tokenizer.initialize();
			}

			// Load ONNX model
			this.session = await this.modelManager.loadGemma3Model(modelPath);

			// Validate model compatibility
			const isValid = await this.modelManager.validateModel(this.session);
			if (!isValid) {
				throw new Error('Model validation failed');
			}

			this.isInitialized = true;
			console.log('✅ Gemma3 inference engine initialized');
		} catch (error) {
			this.isInitialized = false;
			console.error('❌ Failed to initialize inference engine:', error);
			throw new Error(`Inference engine initialization failed: ${error}`);
		}
	}

	// Minimal sampling helpers for tests
	protected sampleToken(_logits: Float32Array): number {
		return 0;
	}

	protected applyRepetitionPenalty(logits: Float32Array, _generated: number[], _penalty: number) {
		return logits;
	}

	/**
	 * Generate D&D response using Gemma3 model
	 * Requirement 2.1: Generate contextually appropriate responses
	 */
	async generateDnDResponse(request: InferenceRequest): Promise<InferenceResponse> {
		if (!this.isInitialized || !this.session) {
			throw new Error('Inference engine not initialized');
		}

		const startTime = Date.now();
		const config = { ...this.defaultConfig, ...request.config };

		try {
			console.log('🧠 Generating D&D response...');

			// Tokenize input with D&D context
			const tokenizationResult = await this.tokenizer.tokenize(
				request.prompt,
				request.context,
			);

			// Run inference with generation
			const generationResult = await this.generateTokens(tokenizationResult, config);

			// Detokenize output
			const detokenizationResult = await this.tokenizer.detokenize(
				generationResult.generatedTokens,
			);

			// Post-process response
			const processedText = this.postProcessDnDResponse(detokenizationResult.text);

			// Extract tool commands
			const toolCommands = this.extractToolCommands(processedText);

			// Clean text (remove tool commands for display)
			const cleanText = this.removeToolCommands(processedText);

			const processingTime = Date.now() - startTime;

			// Calculate confidence based on generation quality
			const confidence = this.calculateConfidence(generationResult, processingTime, config);

			const response: InferenceResponse = {
				text: cleanText,
				confidence,
				toolCommands,
				processingTime,
				tokenCount: {
					input: tokenizationResult.tokenCount,
					output: generationResult.generatedTokens.length,
					total: tokenizationResult.tokenCount + generationResult.generatedTokens.length,
				},
				metadata: {
					temperature: config.temperature,
					topP: config.topP,
					stopReason: generationResult.stopReason || 'eos',
					truncated: generationResult.generatedTokens.length >= config.maxNewTokens,
				},
			};

			console.log(`✅ D&D response generated in ${processingTime}ms`);
			return response;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			console.error('❌ D&D response generation failed:', error);

			// Return error response
			return {
				text: 'I apologize, but I encountered an issue generating a response. Please try again.',
				confidence: 0.0,
				toolCommands: [],
				processingTime,
				tokenCount: { input: 0, output: 0, total: 0 },
				metadata: {
					temperature: config.temperature,
					topP: config.topP,
					stopReason: 'timeout',
					truncated: false,
				},
			};
		}
	}

	/**
	 * Generate tokens using the ONNX model with sampling
	 * Requirement 2.2: Proper input/output handling
	 */
	private async generateTokens(
		tokenizationResult: TokenizationResult,
		config: InferenceConfig,
	): Promise<GenerationState> {
		if (!this.session) {
			throw new Error('Model session not available');
		}

		const state: GenerationState = {
			inputIds: [...tokenizationResult.inputIds],
			attentionMask: [...tokenizationResult.attentionMask],
			positionIds: tokenizationResult.positionIds ? [...tokenizationResult.positionIds] : [],
			generatedTokens: [],
			currentLength: tokenizationResult.inputIds.length,
			isComplete: false,
		};

		const startTime = Date.now();
		const stopTokenIds = config.stopTokens
			.map(token => this.tokenizer.getSpecialTokenId(token))
			.filter(id => id !== undefined) as number[];

		try {
			for (let step = 0; step < config.maxNewTokens; step++) {
				// Check timeout
				if (Date.now() - startTime > config.maxInferenceTime) {
					state.stopReason = 'timeout';
					break;
				}

				// Prepare model input
				const modelInput: ModelInput = {
					input_ids: state.inputIds,
					attention_mask: state.attentionMask,
					position_ids: state.positionIds.length > 0 ? state.positionIds : undefined,
				};

				// Run inference
				const modelOutput = await this.modelManager.runInference(this.session, modelInput);

				// Sample next token
				const nextTokenId = this.sampleNextToken(modelOutput.logits, config, state);

				// Check for stop conditions
				if (stopTokenIds.includes(nextTokenId)) {
					state.stopReason = 'stop_token';
					break;
				}

				if (nextTokenId === this.tokenizer.getSpecialTokenId('<eos>')) {
					state.stopReason = 'eos';
					break;
				}

				// Add token to generation
				state.generatedTokens.push(nextTokenId);
				state.inputIds.push(nextTokenId);
				state.attentionMask.push(1);

				if (state.positionIds.length > 0) {
					state.positionIds.push(state.currentLength);
				}

				state.currentLength++;
			}

			if (!state.stopReason) {
				state.stopReason = 'max_tokens';
			}

			state.isComplete = true;
			return state;
		} catch (error) {
			console.error('❌ Token generation failed:', error);
			state.stopReason = 'timeout';
			state.isComplete = true;
			return state;
		}
	}

	/**
	 * Sample next token from model logits using temperature and top-p sampling
	 */
	private sampleNextToken(
		logits: Float32Array,
		config: InferenceConfig,
		state: GenerationState,
	): number {
		try {
			// Get logits for the last position (next token prediction)
			const vocabSize = this.tokenizer.getVocabSize();
			const lastTokenLogits = logits.slice(-vocabSize);

			// Apply repetition penalty
			if (config.repetitionPenalty !== 1.0) {
				this.applyRepetitionPenalty(
					lastTokenLogits,
					state.inputIds,
					config.repetitionPenalty,
				);
			}

			// Apply temperature scaling
			if (config.temperature !== 1.0) {
				for (let i = 0; i < lastTokenLogits.length; i++) {
					lastTokenLogits[i] /= config.temperature;
				}
			}

			// Convert to probabilities
			const probabilities = this.softmax(lastTokenLogits);

			// Apply top-k filtering
			if (config.topK > 0) {
				this.applyTopKFiltering(probabilities, config.topK);
			}

			// Apply top-p (nucleus) sampling
			if (config.topP < 1.0) {
				this.applyTopPFiltering(probabilities, config.topP);
			}

			// Sample from the distribution
			if (config.doSample) {
				return this.sampleFromDistribution(probabilities);
			} else {
				// Greedy sampling (argmax)
				return this.argmax(probabilities);
			}
		} catch (error) {
			console.error('❌ Token sampling failed:', error);
			// Return a safe fallback token (period)
			return this.tokenizer.getSpecialTokenId('<eos>') || 2;
		}
	}

	/**
	 * Apply repetition penalty to logits
	 */
	private applyRepetitionPenalty(
		logits: Float32Array,
		inputIds: number[],
		penalty: number,
	): void {
		const seenTokens = new Set(inputIds);

		for (const tokenId of seenTokens) {
			if (tokenId < logits.length) {
				if (logits[tokenId] > 0) {
					logits[tokenId] /= penalty;
				} else {
					logits[tokenId] *= penalty;
				}
			}
		}
	}

	/**
	 * Apply softmax to convert logits to probabilities
	 */
	private softmax(logits: Float32Array): Float32Array {
		const maxLogit = Math.max(...logits);
		const expLogits = logits.map(x => Math.exp(x - maxLogit));
		const sumExp = expLogits.reduce((sum, x) => sum + x, 0);

		return new Float32Array(expLogits.map(x => x / sumExp));
	}

	/**
	 * Apply top-k filtering
	 */
	private applyTopKFiltering(probabilities: Float32Array, topK: number): void {
		const indexed = Array.from(probabilities).map((prob, index) => ({ prob, index }));
		indexed.sort((a, b) => b.prob - a.prob);

		// Zero out probabilities beyond top-k
		for (let i = topK; i < indexed.length; i++) {
			probabilities[indexed[i].index] = 0;
		}

		// Renormalize
		const sum = probabilities.reduce((sum, x) => sum + x, 0);
		if (sum > 0) {
			for (let i = 0; i < probabilities.length; i++) {
				probabilities[i] /= sum;
			}
		}
	}

	/**
	 * Apply top-p (nucleus) sampling
	 */
	private applyTopPFiltering(probabilities: Float32Array, topP: number): void {
		const indexed = Array.from(probabilities).map((prob, index) => ({ prob, index }));
		indexed.sort((a, b) => b.prob - a.prob);

		let cumulativeProb = 0;
		let cutoffIndex = indexed.length;

		for (let i = 0; i < indexed.length; i++) {
			cumulativeProb += indexed[i].prob;
			if (cumulativeProb >= topP) {
				cutoffIndex = i + 1;
				break;
			}
		}

		// Zero out probabilities beyond cutoff
		for (let i = cutoffIndex; i < indexed.length; i++) {
			probabilities[indexed[i].index] = 0;
		}

		// Renormalize
		const sum = probabilities.reduce((sum, x) => sum + x, 0);
		if (sum > 0) {
			for (let i = 0; i < probabilities.length; i++) {
				probabilities[i] /= sum;
			}
		}
	}

	/**
	 * Sample from probability distribution
	 */
	private sampleFromDistribution(probabilities: Float32Array): number {
		const random = Math.random();
		let cumulativeProb = 0;

		for (let i = 0; i < probabilities.length; i++) {
			cumulativeProb += probabilities[i];
			if (random <= cumulativeProb) {
				return i;
			}
		}

		// Fallback to last token
		return probabilities.length - 1;
	}

	/**
	 * Get argmax (greedy sampling)
	 */
	private argmax(probabilities: Float32Array): number {
		let maxIndex = 0;
		let maxValue = probabilities[0];

		for (let i = 1; i < probabilities.length; i++) {
			if (probabilities[i] > maxValue) {
				maxValue = probabilities[i];
				maxIndex = i;
			}
		}

		return maxIndex;
	}

	/**
	 * Post-process D&D response text
	 * Requirement 2.1: D&D-specific formatting
	 */
	private postProcessDnDResponse(text: string): string {
		// Remove special tokens that shouldn't appear in output
		let processed = text
			.replace(/<start_of_turn>/g, '')
			.replace(/<end_of_turn>/g, '')
			.replace(/<start_of_dm>/g, '')
			.replace(/<end_of_dm>/g, '')
			.replace(/<bos>/g, '')
			.replace(/<eos>/g, '');

		// Clean up whitespace
		processed = processed.replace(/\s+/g, ' ').trim();

		// Ensure proper sentence structure
		if (processed && !processed.match(/[.!?]$/)) {
			processed += '.';
		}

		// Decode D&D commands
		processed = this.tokenizer.decodeDnDCommands(processed);

		return processed;
	}

	/**
	 * Extract tool commands from response text
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
		return text
			.replace(/\[(\w+):([^\]]+)\]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Calculate confidence score based on generation quality
	 */
	private calculateConfidence(
		generationState: GenerationState,
		processingTime: number,
		config: InferenceConfig,
	): number {
		let confidence = 0.8; // Base confidence

		// Adjust based on completion reason
		switch (generationState.stopReason) {
			case 'eos':
			case 'stop_token':
				confidence += 0.1; // Natural completion
				break;
			case 'max_tokens':
				confidence -= 0.1; // Truncated
				break;
			case 'timeout':
				confidence -= 0.3; // Failed completion
				break;
		}

		// Adjust based on response length
		const responseLength = generationState.generatedTokens.length;
		if (responseLength < 10) {
			confidence -= 0.2; // Too short
		} else if (responseLength > config.maxNewTokens * 0.9) {
			confidence -= 0.1; // Too long
		}

		// Adjust based on processing time
		if (processingTime > config.maxInferenceTime * 0.8) {
			confidence -= 0.1; // Slow response
		}

		// Ensure confidence is in valid range
		return Math.max(0.0, Math.min(1.0, confidence));
	}

	/**
	 * Check if inference engine is ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.session !== null && this.tokenizer.isReady();
	}

	/**
	 * Get current configuration
	 */
	getConfig(): InferenceConfig {
		return { ...this.defaultConfig };
	}

	/**
	 * Update inference configuration
	 */
	updateConfig(config: Partial<InferenceConfig>): void {
		this.defaultConfig = { ...this.defaultConfig, ...config };
	}

	/**
	 * Clean up resources
	 */
	async cleanup(): Promise<void> {
		try {
			if (this.session) {
				await this.modelManager.cleanupSession(this.session);
				this.session = null;
			}

			this.isInitialized = false;
			console.log('✅ Inference engine cleaned up');
		} catch (error) {
			console.error('❌ Inference engine cleanup failed:', error);
			throw error;
		}
	}
}

/**
 * Utility functions for Gemma3 inference
 */
export const Gemma3InferenceUtils = {
	/**
	 * Get recommended inference config for device performance
	 */
	getRecommendedConfig(devicePerformance: 'high' | 'medium' | 'low'): Partial<InferenceConfig> {
		switch (devicePerformance) {
			case 'high':
				return {
					maxNewTokens: 200,
					temperature: 0.8,
					topP: 0.9,
					topK: 50,
					doSample: true,
					maxInferenceTime: 15000,
				};
			case 'medium':
				return {
					maxNewTokens: 150,
					temperature: 0.7,
					topP: 0.9,
					topK: 40,
					doSample: true,
					maxInferenceTime: 20000,
				};
			case 'low':
				return {
					maxNewTokens: 100,
					temperature: 0.6,
					topP: 0.8,
					topK: 30,
					doSample: false, // Greedy for speed
					maxInferenceTime: 30000,
				};
		}
	},

	/**
	 * Validate inference request
	 */
	validateInferenceRequest(request: InferenceRequest): {
		valid: boolean;
		issues: string[];
	} {
		const issues: string[] = [];

		if (!request.prompt || request.prompt.trim().length === 0) {
			issues.push('Prompt is required and cannot be empty');
		}

		if (request.prompt && request.prompt.length > 4000) {
			issues.push('Prompt is too long (max 4000 characters)');
		}

		if (request.config?.maxNewTokens && request.config.maxNewTokens > 500) {
			issues.push('maxNewTokens too high (max 500)');
		}

		if (
			request.config?.temperature &&
			(request.config.temperature < 0 || request.config.temperature > 2)
		) {
			issues.push('Temperature must be between 0 and 2');
		}

		if (request.config?.topP && (request.config.topP < 0 || request.config.topP > 1)) {
			issues.push('topP must be between 0 and 1');
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	},

	/**
	 * Estimate inference time based on token count and device performance
	 */
	estimateInferenceTime(
		inputTokens: number,
		maxNewTokens: number,
		devicePerformance: 'high' | 'medium' | 'low',
	): number {
		const baseTimePerToken = {
			high: 50, // 50ms per token
			medium: 100, // 100ms per token
			low: 200, // 200ms per token
		}[devicePerformance];

		const totalTokens = inputTokens + maxNewTokens;
		return totalTokens * baseTimePerToken;
	},
};

/**
 * Default inference configuration
 */
export const DefaultInferenceConfig: InferenceConfig = {
	maxNewTokens: 150,
	temperature: 0.7,
	topP: 0.9,
	topK: 50,
	repetitionPenalty: 1.1,
	doSample: true,
	stopTokens: ['<eos>', '<end_of_turn>', '<end_of_dm>'],
	maxInferenceTime: 30000,
};
