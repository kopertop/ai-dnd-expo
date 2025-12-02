import { beforeEach, describe, expect, it } from 'vitest';

import { Gemma3InferenceEngine } from '@/services/ai/models/gemma3-inference-engine';

describe('Gemma3InferenceEngine (stub)', () => {
	let engine: Gemma3InferenceEngine;

	beforeEach(() => {
		engine = new Gemma3InferenceEngine({
			modelPath: '/tmp/model.onnx',
			maxTokens: 64,
			temperature: 0.7,
			topP: 0.9,
		});
	});

	it('initializes without throwing', async () => {
		await expect(engine.initialize()).resolves.not.toThrow();
	});

	it('generates text with token usage', async () => {
		await engine.initialize();
		const result = await engine.generateText('Tell me a tale');
		expect(result.text).toContain('Stub response');
		expect(result.tokens.length).toBeGreaterThan(0);
		expect(result.usage.totalTokens).toBeGreaterThan(0);
	});

	it('returns a D&D response wrapper', async () => {
		await engine.initialize();
		const result = await engine.generateDnDResponse({ prompt: 'Describe a dungeon' });
		expect(result.text).toContain('Stub response');
	});

	it('cleans up safely', async () => {
		await engine.initialize();
		await expect(engine.cleanup()).resolves.not.toThrow();
	});
});
