import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Gemma3InferenceEngine } from '../../../../../services/ai/models/gemma3-inference-engine';

// Mock dependencies
vi.mock('../../../../../services/ai/models/gemma3-tokenizer', () => ({
	Gemma3Tokenizer: vi.fn().mockImplementation(() => ({
		encode: vi.fn().mockReturnValue([1, 2, 3, 4, 5]),
		decode: vi.fn().mockReturnValue('Decoded text'),
		loadVocab: vi.fn().mockResolvedValue(true),
		getVocabSize: vi.fn().mockReturnValue(32000),
	})),
}));

vi.mock('../../../../../services/ai/models/onnx-model-manager', () => ({
	ONNXModelManager: vi.fn().mockImplementation(() => ({
		loadGemma3Model: vi.fn().mockResolvedValue({}),
		validateModel: vi.fn().mockResolvedValue(true),
		runInference: vi.fn().mockResolvedValue({
			logits: new Float32Array([0.1, 0.2, 0.7]),
		}),
		cleanupSession: vi.fn().mockResolvedValue(undefined),
	})),
}));

describe('Gemma3InferenceEngine', () => {
	let inferenceEngine: Gemma3InferenceEngine;

	beforeEach(() => {
		vi.clearAllMocks();
		inferenceEngine = new Gemma3InferenceEngine({
			modelPath: '/test/path/model.onnx',
			vocabPath: '/test/path/vocab.json',
			maxTokens: 100,
			temperature: 0.7,
			topP: 0.9,
			repetitionPenalty: 1.1,
		});
	});

	// Task 2.2: Implement Gemma3-specific tokenization and inference
	describe('Gemma3 Tokenization and Inference', () => {
		it('should initialize successfully', async () => {
			await expect(inferenceEngine.initialize()).resolves.not.toThrow();
		});

		it('should generate text from prompt', async () => {
			await inferenceEngine.initialize();

			const result = await inferenceEngine.generateText('Tell me a story');

			expect(result).toEqual(expect.objectContaining({
				text: expect.any(String),
				tokens: expect.any(Array),
				usage: expect.objectContaining({
					promptTokens: expect.any(Number),
					completionTokens: expect.any(Number),
					totalTokens: expect.any(Number),
				}),
			}));
		});

		it('should format D&D prompts correctly', async () => {
			await inferenceEngine.initialize();

			const formatPromptSpy = vi.spyOn(inferenceEngine as any, 'formatDnDPrompt');

			await inferenceEngine.generateDnDResponse({
				prompt: 'I attack the goblin',
				context: {
					playerName: 'TestPlayer',
					playerClass: 'Fighter',
					playerRace: 'Human',
					currentScene: 'Dungeon',
					gameHistory: ['Entered the dungeon', 'Found a goblin'],
				},
				systemPrompt: 'You are a dungeon master',
			});

			expect(formatPromptSpy).toHaveBeenCalled();
			expect(formatPromptSpy.mock.results[0].value).toContain('You are a dungeon master');
			expect(formatPromptSpy.mock.results[0].value).toContain('TestPlayer');
			expect(formatPromptSpy.mock.results[0].value).toContain('Fighter');
		});

		it('should handle token limits', async () => {
			await inferenceEngine.initialize();

			// Create a very long prompt
			const longPrompt = 'a'.repeat(10000);

			const result = await inferenceEngine.generateText(longPrompt);

			// Should truncate tokens to fit context window
			expect(result.usage.promptTokens).toBeLessThan(10000);
		});

		it('should apply temperature and sampling parameters', async () => {
			// Create engine with different parameters
			const customEngine = new Gemma3InferenceEngine({
				modelPath: '/test/path/model.onnx',
				vocabPath: '/test/path/vocab.json',
				maxTokens: 100,
				temperature: 0.3, // Lower temperature
				topP: 0.5, // Lower top-p
				repetitionPenalty: 1.5, // Higher repetition penalty
			});

			await customEngine.initialize();

			const generateSpy = vi.spyOn(customEngine as any, 'generateTokens');

			await customEngine.generateText('Test prompt');

			expect(generateSpy).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					temperature: 0.3,
					topP: 0.5,
					repetitionPenalty: 1.5,
				}),
			);
		});
	});

	// Test token generation and sampling
	describe('Token Generation and Sampling', () => {
		it('should sample tokens based on logits', async () => {
			const sampleTokenSpy = vi.spyOn(inferenceEngine as any, 'sampleToken');

			await inferenceEngine.initialize();
			await inferenceEngine.generateText('Test prompt');

			expect(sampleTokenSpy).toHaveBeenCalled();
		});

		it('should apply repetition penalty', async () => {
			const applyRepetitionPenaltySpy = vi.spyOn(inferenceEngine as any, 'applyRepetitionPenalty');

			await inferenceEngine.initialize();
			await inferenceEngine.generateText('Test prompt');

			expect(applyRepetitionPenaltySpy).toHaveBeenCalled();
		});

		it('should stop generation on stop tokens', async () => {
			await inferenceEngine.initialize();

			// Mock the tokenizer to return EOS token after a few tokens
			const mockTokenizer = require('../../../../../services/ai/models/gemma3-tokenizer').Gemma3Tokenizer.mock.instances[0];
			let callCount = 0;

			vi.spyOn(mockTokenizer, 'decode').mockImplementation(() => {
				callCount++;
				if (callCount > 3) {
					return '</s>'; // EOS token
				}
				return 'Some text';
			});

			const result = await inferenceEngine.generateText('Test prompt');

			// Should have stopped after encountering EOS
			expect(result.text).toBeDefined();
		});
	});

	// Test error handling
	describe('Error Handling', () => {
		it('should handle initialization errors', async () => {
			// Mock tokenizer to fail
			vi.spyOn(require('../../../../../services/ai/models/gemma3-tokenizer').Gemma3Tokenizer.prototype, 'loadVocab')
				.mockRejectedValueOnce(new Error('Failed to load vocab'));

			const errorEngine = new Gemma3InferenceEngine({
				modelPath: '/test/path/model.onnx',
				vocabPath: '/test/path/vocab.json',
				maxTokens: 100,
				temperature: 0.7,
			});

			await expect(errorEngine.initialize()).rejects.toThrow('Failed to load vocab');
		});

		it('should handle inference errors', async () => {
			await inferenceEngine.initialize();

			// Mock ONNX model manager to fail
			vi.spyOn(require('../../../../../services/ai/models/onnx-model-manager').ONNXModelManager.prototype, 'runInference')
				.mockRejectedValueOnce(new Error('Inference failed'));

			await expect(inferenceEngine.generateText('Test prompt')).rejects.toThrow('Inference failed');
		});

		it('should handle empty prompts', async () => {
			await inferenceEngine.initialize();

			const result = await inferenceEngine.generateText('');

			expect(result.text).toBe('');
			expect(result.usage.promptTokens).toBe(0);
		});
	});

	// Test cleanup
	describe('Cleanup', () => {
		it('should clean up resources', async () => {
			await inferenceEngine.initialize();
			await inferenceEngine.cleanup();

			expect(inferenceEngine['modelManager'].cleanupSession).toHaveBeenCalled();
		});
	});
});
