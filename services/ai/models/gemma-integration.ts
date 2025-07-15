/**
 * AI Text Generation for D&D using Transformers.js
 *
 * This file provides on-device AI text generation using @fugood/transformers
 * which is a React Native compatible fork of @huggingface/transformers.
 *
 * Features:
 * - On-device text generation with transformers.js
 * - D&D-specific prompt formatting
 * - Progress tracking and caching
 * - Fallback to rule-based responses
 */

import { TextGenerationPipeline, env, pipeline } from '@fugood/transformers';
import { useCallback, useEffect, useRef, useState } from 'react';

// Configure environment for React Native - try WebAssembly backend
if (env.backends.onnx.wasm) {
	env.backends.onnx.wasm.numThreads = 1;
}
env.allowLocalModels = true;
env.allowRemoteModels = true;

export interface GemmaModelConfig {
	modelName?: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	minConfidence?: number;
	useOnDevice?: boolean;
	progressCallback?: (progress: { status: string; url?: string }) => void;
}

export interface GemmaResponse {
	text: string;
	confidence: number;
	responseTime: number;
	context: {
		actionType: string;
		requiresDiceRoll: boolean;
		diceNotation?: string;
		difficulty?: string;
	};
}

export interface GemmaCapabilities {
	isAvailable: boolean;
	responseTypes: string[];
	memoryEnabled: boolean;
	estimatedSpeed: string;
	modelLoaded: boolean;
}

/**
 * Hook for AI text generation using transformers.js
 */
export const useGemmaModel = (config?: GemmaModelConfig) => {
	// Configuration with defaults - Using a working public model
	const modelConfig = {
		modelName: 'Xenova/gpt2',
		maxTokens: 50,
		temperature: 0.7,
		topP: 0.9,
		minConfidence: 0.6,
		useOnDevice: true,
		...config,
	};

	// Pipeline and model state
	const pipelineRef = useRef<TextGenerationPipeline | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [hasError, setHasError] = useState(false);
	const retryCountRef = useRef(0);
	const maxRetries = 2;

	// Capabilities
	const capabilities: GemmaCapabilities = {
		isAvailable: true,
		responseTypes: ['combat', 'exploration', 'social', 'skill_check', 'narration'],
		memoryEnabled: true,
		estimatedSpeed: isReady ? '2-5 seconds' : 'Model loading...',
		modelLoaded: isReady,
	};

	/**
	 * Generate D&D response using AI model or fallback
	 */
	const generateResponse = async (
		prompt: string,
		context?: Record<string, any>,
	): Promise<GemmaResponse> => {
		const startTime = Date.now();

		try {
			console.log('🎲 Generating AI response...');

			if (isReady && pipelineRef.current) {
				// Use AI model for text generation
				const response = await runInference(prompt, context);
				return {
					text: response.text,
					confidence: response.confidence,
					responseTime: Date.now() - startTime,
					context: {
						actionType: response.actionType || 'general',
						requiresDiceRoll: response.requiresDiceRoll || false,
						diceNotation: response.diceNotation,
						difficulty: response.difficulty,
					},
				};
			} else {
				// Fallback to rule-based system
				console.log('📋 Using fallback response system...');
				const fallbackResponse = await generateFallbackResponse(prompt, context);
				return {
					text: fallbackResponse,
					confidence: 0.8,
					responseTime: Date.now() - startTime,
					context: {
						actionType: 'general',
						requiresDiceRoll: false,
					},
				};
			}
		} catch (error) {
			console.error('❌ AI generation error:', error);

			// Fallback to simple response
			const fallbackResponse = await generateFallbackResponse(prompt, context);
			return {
				text: fallbackResponse,
				confidence: 0.8,
				responseTime: Date.now() - startTime,
				context: {
					actionType: 'general',
					requiresDiceRoll: false,
				},
			};
		}
	};

	/**
	 * Parse and execute tool commands from model output
	 * Handles [ROLL:1d20], [UPDATE:HP-5], etc.
	 */
	const parseToolCommands = (
		text: string,
	): {
		cleanText: string;
		tools: Array<{ type: string; params: string }>;
	} => {
		const tools: Array<{ type: string; params: string }> = [];

		// Extract tool commands
		let cleanText = text;
		const toolRegex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = toolRegex.exec(text)) !== null) {
			tools.push({
				type: match[1].toLowerCase(),
				params: match[2],
			});

			// Remove tool command from text
			cleanText = cleanText.replace(match[0], '');
		}

		return { cleanText: cleanText.trim(), tools };
	};

	/**
	 * Initialize the AI pipeline
	 */
	const initializeModel = useCallback(async (): Promise<void> => {
		if (isLoading || isReady || hasError) return;

		// Check retry limit
		if (retryCountRef.current >= maxRetries) {
			console.warn(
				`⚠️ Max retries (${maxRetries}) reached for AI model. Using fallback mode.`,
			);
			setHasError(true);
			return;
		}

		retryCountRef.current += 1;
		setIsLoading(true);
		console.log(`🚀 Loading AI model... (attempt ${retryCountRef.current}/${maxRetries})`);

		try {
			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'downloading' });
			}

			// Create text generation pipeline using transformers.js
			console.log('📦 Creating text generation pipeline...');
			console.log('🔗 Model:', modelConfig.modelName);

			const textPipeline = await pipeline('text-generation', modelConfig.modelName, {
				progress_callback: (progress: any) => {
					console.log('📊 Loading progress:', progress);
					if (modelConfig.progressCallback) {
						modelConfig.progressCallback({
							status: progress.status || 'progress',
							url: progress.file,
						});
					}
				},
				local_files_only: false, // Allow downloading on first use
			});

			pipelineRef.current = textPipeline;

			setIsReady(true);
			retryCountRef.current = 0; // Reset retry count on success
			console.log('✅ AI model ready!');

			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'ready' });
			}
		} catch (error) {
			console.error(
				`❌ Failed to load AI model (attempt ${retryCountRef.current}/${maxRetries}):`,
				error,
			);
			console.error('Error details:', {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : undefined,
			});
			setIsReady(false);

			if (retryCountRef.current >= maxRetries) {
				console.warn('🔄 Max retries reached. Switching to fallback mode permanently.');
				setHasError(true);
			}

			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'error' });
			}
		} finally {
			setIsLoading(false);
		}
	}, [modelConfig, isLoading, isReady, hasError, maxRetries]);

	// Auto-initialize model on first use
	useEffect(() => {
		if (!isReady && !isLoading && !hasError && modelConfig.useOnDevice) {
			initializeModel();
		}
	}, [initializeModel, isReady, isLoading, hasError, modelConfig.useOnDevice]);

	/**
	 * Run inference using the loaded AI pipeline
	 */
	const runInference = async (
		prompt: string,
		context?: Record<string, any>,
	): Promise<{
		text: string;
		confidence: number;
		actionType?: string;
		requiresDiceRoll?: boolean;
		diceNotation?: string;
		difficulty?: string;
	}> => {
		if (!pipelineRef.current) {
			throw new Error('AI pipeline not initialized');
		}

		try {
			// Format D&D prompt
			const formattedPrompt = formatDnDPrompt(prompt, context);
			console.log('🎯 Formatted prompt:', formattedPrompt.substring(0, 100) + '...');

			// Generate text using the pipeline
			console.log('🧠 Running AI inference...');
			const result = await pipelineRef.current(formattedPrompt, {
				max_new_tokens: modelConfig.maxTokens,
				temperature: modelConfig.temperature,
				top_p: modelConfig.topP,
				do_sample: true,
				return_full_text: false,
			});

			// Extract generated text - handle different response formats
			let generatedText = '';
			if (Array.isArray(result)) {
				generatedText = (result[0] as any)?.generated_text || '';
			} else {
				generatedText = (result as any)?.generated_text || '';
			}
			console.log('📝 Generated text:', generatedText);

			// Parse D&D-specific elements
			const parsedResponse = parseDnDResponse(generatedText || 'The adventure continues...');

			return {
				text: parsedResponse.text,
				confidence: 0.9,
				actionType: parsedResponse.actionType,
				requiresDiceRoll: parsedResponse.requiresDiceRoll,
				diceNotation: parsedResponse.diceNotation,
				difficulty: parsedResponse.difficulty,
			};
		} catch (error) {
			console.error('❌ AI inference error:', error);
			throw error;
		}
	};

	/**
	 * Format prompt for D&D context
	 */
	const formatDnDPrompt = (prompt: string, context?: Record<string, any>): string => {
		let formattedPrompt = 'You are a Dungeon Master in a D&D game. ';

		if (context) {
			if (context.playerName) formattedPrompt += `Player: ${context.playerName}. `;
			if (context.playerClass) formattedPrompt += `Class: ${context.playerClass}. `;
			if (context.scene) formattedPrompt += `Location: ${context.scene}. `;
		}

		formattedPrompt += 'Respond as DM in 1-2 sentences. ';
		formattedPrompt += `Action: ${prompt}\nDM: `;

		return formattedPrompt;
	};

	/**
	 * Parse D&D-specific elements from response
	 */
	const parseDnDResponse = (
		text: string,
	): {
		text: string;
		actionType?: string;
		requiresDiceRoll?: boolean;
		diceNotation?: string;
		difficulty?: string;
	} => {
		const diceRegex = /\[ROLL:([^\]]+)\]/;
		const diceMatch = text.match(diceRegex);

		// Clean up the text
		let cleanText = text.replace(diceRegex, '').trim();

		// Remove any prompt artifacts
		cleanText = cleanText.replace(/^DM:\s*/i, '');
		cleanText = cleanText.replace(/^You:\s*/i, '');

		// Limit length for mobile display
		if (cleanText.length > 200) {
			cleanText = cleanText.substring(0, 197) + '...';
		}

		return {
			text: cleanText,
			actionType: 'general',
			requiresDiceRoll: !!diceMatch,
			diceNotation: diceMatch?.[1],
			difficulty: 'medium',
		};
	};

	/**
	 * Check if model is ready for use
	 */
	const isModelReady = (): boolean => {
		return isReady && !!pipelineRef.current;
	};

	/**
	 * Load or reload the model
	 */
	const loadModel = async (): Promise<boolean> => {
		try {
			if (!isReady) {
				await initializeModel();
			}
			return isReady;
		} catch (error) {
			console.error('Failed to load AI model:', error);
			return false;
		}
	};

	/**
	 * Get model loading status
	 */
	const getLoadingStatus = () => ({
		isLoading,
		isReady,
		hasError,
		retryCount: retryCountRef.current,
		maxRetries,
	});

	return {
		generateResponse,
		parseToolCommands,
		isModelReady,
		loadModel,
		getLoadingStatus,
		capabilities,
		// Expose model state for debugging
		modelState: {
			isLoading,
			isReady,
			hasError,
			modelName: modelConfig.modelName,
			pipelineReady: !!pipelineRef.current,
			retryCount: retryCountRef.current,
			maxRetries,
		},
	};
};

/**
 * Fallback response generator for when AI is unavailable
 */
async function generateFallbackResponse(
	prompt: string,
	context?: Record<string, any>,
): Promise<string> {
	// Simulate processing delay
	await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

	const lowercasePrompt = prompt.toLowerCase();

	// Combat responses
	if (lowercasePrompt.includes('attack') || lowercasePrompt.includes('hit')) {
		return "You swing your weapon with determination! [ROLL:1d20+5] Let's see if you hit your target.";
	}

	// Movement responses
	if (lowercasePrompt.includes('move') || lowercasePrompt.includes('go')) {
		const directions = ['north', 'south', 'east', 'west'];
		const dir = directions.find(d => lowercasePrompt.includes(d)) || 'forward';
		return `You move ${dir}. The path ahead seems clear, but you sense something watching from the shadows...`;
	}

	// Skill check responses
	if (lowercasePrompt.includes('check') || lowercasePrompt.includes('look')) {
		return 'Make a Perception check to see what you notice. [ROLL:1d20+3] Your keen eyes scan the area...';
	}

	// Spellcasting responses
	if (lowercasePrompt.includes('cast') || lowercasePrompt.includes('spell')) {
		return "You begin weaving magical energies... [ROLL:1d20+4] The spell's power flows through you!";
	}

	// Generic responses
	const genericResponses = [
		'The DM considers your action carefully... What happens next will shape your story.',
		'*The DM rolls dice behind the screen* Something interesting is about to happen...',
		'Your decision echoes through the dungeon. The very air seems to respond to your presence.',
		'Time slows as you contemplate your next move. What will you choose?',
		'The adventure takes an unexpected turn. Roll initiative! [ROLL:1d20+2]',
	];

	return genericResponses[Math.floor(Math.random() * genericResponses.length)];
}

/**
 * Utility functions for model deployment preparation
 */
export const GemmaModelUtils = {
	/**
	 * Validate model input before processing
	 */
	validateInput: (prompt: string): boolean => {
		return prompt.length > 0 && prompt.length <= 500;
	},

	/**
	 * Format context for model input
	 */
	formatContext: (context: Record<string, any>): string => {
		const formatted = Object.entries(context)
			.map(([key, value]) => `${key}: ${value}`)
			.join(', ');
		return formatted;
	},

	/**
	 * Parse dice notation from model output
	 */
	parseDiceNotation: (text: string): string[] => {
		const diceRegex = /\[ROLL:([^\]]+)\]/g;
		const matches = [];
		let match;

		while ((match = diceRegex.exec(text)) !== null) {
			matches.push(match[1]);
		}

		return matches;
	},

	/**
	 * Extract character updates from model output
	 */
	parseCharacterUpdates: (
		text: string,
	): Array<{ stat: string; operation: string; value: number }> => {
		const updateRegex = /\[UPDATE:(\w+)([+-=])(\d+)\]/g;
		const updates = [];
		let match;

		while ((match = updateRegex.exec(text)) !== null) {
			updates.push({
				stat: match[1].toLowerCase(),
				operation: match[2],
				value: parseInt(match[3], 10),
			});
		}

		return updates;
	},
};

/**
 * Model deployment configuration for on-device AI
 */
export const GEMMA_MODEL_CONFIG = {
	modelName: 'Xenova/gpt2',
	displayName: 'GPT-2 Small',
	// Generation parameters
	maxTokens: 50,
	temperature: 0.7,
	topP: 0.9,
	minConfidence: 0.6,
	// Performance settings
	estimatedMemoryUsage: '~200MB',
	supportedDevices: ['cpu'],
} as const;

/**
 * Recommended configurations for different use cases
 */
export const GemmaPresets = {
	/**
	 * Performance-focused configuration
	 */
	performance: {
		modelName: GEMMA_MODEL_CONFIG.modelName,
		maxTokens: 30,
		temperature: 0.6,
		topP: 0.8,
		useOnDevice: true,
	},

	/**
	 * Quality-focused configuration
	 */
	quality: {
		modelName: GEMMA_MODEL_CONFIG.modelName,
		maxTokens: 80,
		temperature: 0.8,
		topP: 0.9,
		useOnDevice: true,
	},

	/**
	 * Balanced configuration (recommended)
	 */
	balanced: {
		modelName: GEMMA_MODEL_CONFIG.modelName,
		maxTokens: 50,
		temperature: 0.7,
		topP: 0.9,
		useOnDevice: true,
	},

	/**
	 * Get recommended config based on device capabilities
	 */
	getRecommendedConfig: (): GemmaModelConfig => {
		// For now, return balanced config
		// In the future, could detect device performance and adjust
		return GemmaPresets.balanced;
	},
};
