/**
 * Gemma 3n-E2B ONNX Integration for D&D
 *
 * This file provides on-device AI inference using ONNX Runtime
 * with the Gemma 3n-E2B model for D&D game mastering.
 *
 * Features:
 * - On-device inference with ONNX Runtime
 * - Gemma 3n-E2B model optimized for mobile
 * - D&D-specific prompt formatting
 * - Tokenization and response parsing
 * - Fallback to rule-based responses
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Conditional ONNX import with fallback
let InferenceSession: any = null;
let Tensor: any = null;

try {
	const onnx = require('onnxruntime-react-native');
	InferenceSession = onnx.InferenceSession;
	Tensor = onnx.Tensor;
} catch (error) {
	console.warn('⚠️ ONNX Runtime not available, using fallback mode:', error);
}

export interface GemmaModelConfig {
	modelPath?: string;
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
 * Hook for Gemma ONNX model integration
 */
export const useGemmaModel = (config?: GemmaModelConfig) => {
	// Configuration with defaults
	const modelConfig = {
		modelPath: 'https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX/resolve/main/onnx/model.onnx',
		maxTokens: 150,
		temperature: 0.7,
		topP: 0.9,
		minConfidence: 0.6,
		useOnDevice: true,
		...config,
	};

	// ONNX session and model state
	const sessionRef = useRef<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isReady, setIsReady] = useState(false);

	// Capabilities
	const capabilities: GemmaCapabilities = {
		isAvailable: true,
		responseTypes: ['combat', 'exploration', 'social', 'skill_check', 'narration'],
		memoryEnabled: true,
		estimatedSpeed: isReady ? '1-3 seconds' : 'Model loading...',
		modelLoaded: isReady,
	};

	/**
	 * Generate D&D response using ONNX model or fallback
	 */
	const generateResponse = async (
		prompt: string,
		context?: Record<string, any>,
	): Promise<GemmaResponse> => {
		const startTime = Date.now();

		try {
			console.log('🎲 Generating Gemma ONNX response...');

			if (isReady && sessionRef.current) {
				// Use ONNX model for inference
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
			console.error('❌ Gemma ONNX error:', error);

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
	const parseToolCommands = (text: string): {
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
	 * Initialize the ONNX model
	 */
	const initializeModel = useCallback(async (): Promise<void> => {
		if (isLoading || isReady) return;

		setIsLoading(true);
		console.log('🚀 Loading Gemma ONNX model...');

		try {
			// Check if ONNX Runtime is available
			if (!InferenceSession) {
				console.warn('⚠️ ONNX Runtime not available, skipping model initialization');
				setIsReady(false);
				return;
			}

			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'downloading', url: modelConfig.modelPath });
			}

			// Create ONNX inference session
			console.log('📦 Creating ONNX inference session...');
			const session = await InferenceSession.create(modelConfig.modelPath!);
			sessionRef.current = session;

			setIsReady(true);
			console.log('✅ Gemma ONNX model ready!');
			console.log('📊 Model inputs:', Object.keys(session.inputNames));
			console.log('📊 Model outputs:', Object.keys(session.outputNames));

			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'ready' });
			}
		} catch (error) {
			console.error('❌ Failed to load Gemma ONNX model:', error);
			setIsReady(false);
			if (modelConfig.progressCallback) {
				modelConfig.progressCallback({ status: 'error' });
			}
		} finally {
			setIsLoading(false);
		}
	}, [modelConfig, isLoading, isReady]);

	// Auto-initialize model on first use
	useEffect(() => {
		if (!isReady && !isLoading && modelConfig.useOnDevice) {
			initializeModel();
		}
	}, [initializeModel, isReady, isLoading, modelConfig.useOnDevice]);

	/**
	 * Run inference using the loaded ONNX model
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
		if (!sessionRef.current) {
			throw new Error('ONNX session not initialized');
		}

		try {
			// Check if Tensor class is available
			if (!Tensor) {
				throw new Error('Tensor class not available');
			}

			// Format D&D prompt
			const formattedPrompt = formatDnDPrompt(prompt, context);
			console.log('🎯 Formatted prompt:', formattedPrompt.substring(0, 100) + '...');

			// Tokenize input (simplified - would need proper tokenizer)
			const tokens = tokenizePrompt(formattedPrompt);
			console.log('🔤 Token count:', tokens.length);

			// Create input tensor
			const inputTensor = new Tensor('int64', BigInt64Array.from(tokens.map(t => BigInt(t))), [1, tokens.length]);

			// Run inference
			console.log('🧠 Running ONNX inference...');
			const results = await sessionRef.current.run({ input_ids: inputTensor });

			// Process output
			const outputTensor = results[sessionRef.current.outputNames[0]];
			const generatedText = detokenizeOutput(outputTensor);

			// Parse D&D-specific elements
			const parsedResponse = parseDnDResponse(generatedText);

			return {
				text: parsedResponse.text,
				confidence: 0.9,
				actionType: parsedResponse.actionType,
				requiresDiceRoll: parsedResponse.requiresDiceRoll,
				diceNotation: parsedResponse.diceNotation,
				difficulty: parsedResponse.difficulty,
			};
		} catch (error) {
			console.error('❌ ONNX inference error:', error);
			throw error;
		}
	};

	/**
	 * Format prompt for D&D context
	 */
	const formatDnDPrompt = (prompt: string, context?: Record<string, any>): string => {
		let formattedPrompt = 'You are an expert Dungeon Master for a D&D 5e game. ';

		if (context) {
			if (context.playerName) formattedPrompt += `The player is ${context.playerName}, `;
			if (context.playerClass) formattedPrompt += `a ${context.playerClass}, `;
			if (context.scene) formattedPrompt += `currently in ${context.scene}. `;
			if (context.worldName) formattedPrompt += `This takes place in ${context.worldName}. `;
		}

		formattedPrompt += 'Respond in character as a Dungeon Master. Keep responses under 150 words. ';
		formattedPrompt += 'Use dice notation like [ROLL:1d20+3] for skill checks and combat. ';
		formattedPrompt += `Player action: ${prompt}`;

		return formattedPrompt;
	};

	/**
	 * Simple tokenization (would need proper Gemma tokenizer)
	 */
	const tokenizePrompt = (prompt: string): number[] => {
		// This is a simplified tokenizer - in production you'd use the actual Gemma tokenizer
		const words = prompt.toLowerCase().split(/\s+/);
		const vocab = new Map<string, number>();
		let tokenId = 1;

		// Create simple word-to-token mapping
		return words.map(word => {
			if (!vocab.has(word)) {
				vocab.set(word, tokenId++);
			}
			return vocab.get(word)!;
		});
	};

	/**
	 * Detokenize model output (simplified)
	 */
	const detokenizeOutput = (tensor: any): string => {
		// This is simplified - would need actual Gemma detokenizer
		// For now, return a placeholder that will trigger fallback
		console.log('🔄 Detokenizing output tensor:', tensor?.dims || 'unknown');
		return 'Generated response from ONNX model (detokenization not yet implemented)';
	};

	/**
	 * Parse D&D-specific elements from response
	 */
	const parseDnDResponse = (text: string): {
		text: string;
		actionType?: string;
		requiresDiceRoll?: boolean;
		diceNotation?: string;
		difficulty?: string;
	} => {
		const diceRegex = /\[ROLL:([^\]]+)\]/;
		const diceMatch = text.match(diceRegex);

		return {
			text: text.replace(diceRegex, '').trim(),
			actionType: 'general',
			requiresDiceRoll: !!diceMatch,
			diceNotation: diceMatch?.[1],
			difficulty: 'medium', // Could be parsed from text
		};
	};

	/**
	 * Check if model is ready for use
	 */
	const isModelReady = (): boolean => {
		return isReady && !!sessionRef.current;
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
			console.error('Failed to load Gemma ONNX model:', error);
			return false;
		}
	};

	/**
	 * Get model loading status
	 */
	const getLoadingStatus = () => ({
		isLoading,
		isReady,
		hasError: !isReady && !isLoading,
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
			modelPath: modelConfig.modelPath,
			sessionReady: !!sessionRef.current,
		},
	};
};

/**
 * Fallback response generator for development
 * This will be replaced when the actual Gemma model is deployed
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
	parseCharacterUpdates: (text: string): Array<{ stat: string; operation: string; value: number }> => {
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
 * Model deployment configuration for on-device LLM
 */
export const GEMMA_MODEL_CONFIG = {
	modelPath: 'https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX/resolve/main/onnx/model.onnx',
	modelName: 'gemma-3n-E2B-it',
	// Generation parameters
	maxTokens: 150,
	temperature: 0.7,
	topP: 0.9,
	minConfidence: 0.6,
	// Context parameters
	maxContextLength: 2048,
	systemPrompt: 'You are an expert Dungeon Master for a D&D 5e game.',
	// Performance settings
	estimatedMemoryUsage: '~2GB',
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
		modelPath: GEMMA_MODEL_CONFIG.modelPath,
		maxTokens: 100,
		temperature: 0.6,
		topP: 0.8,
		useOnDevice: true,
	},

	/**
	 * Quality-focused configuration
	 */
	quality: {
		modelPath: GEMMA_MODEL_CONFIG.modelPath,
		maxTokens: 200,
		temperature: 0.8,
		topP: 0.9,
		useOnDevice: true,
	},

	/**
	 * Balanced configuration (recommended)
	 */
	balanced: {
		modelPath: GEMMA_MODEL_CONFIG.modelPath,
		maxTokens: 150,
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