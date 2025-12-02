import { beforeEach, describe, expect, it } from 'vitest';

import { LocalDMProvider } from '@/services/ai/providers/local-dm-provider';

const baseConfig = {
	modelPath: '/tmp/model.onnx',
	contextSize: 2048,
	maxTokens: 128,
	temperature: 0.7,
	enableResourceMonitoring: false,
	powerSavingMode: false,
};

const baseContext = {
	playerName: 'Test',
	playerClass: 'Fighter',
	playerRace: 'Human',
	currentScene: 'Dungeon',
	gameHistory: [],
};

describe('LocalDMProvider (stub)', () => {
	let provider: LocalDMProvider;

	beforeEach(() => {
		provider = new LocalDMProvider(baseConfig);
	});

	it('initializes and reports readiness', async () => {
		expect(provider.isReady()).toBe(false);
		const initialized = await provider.initialize();
		expect(initialized).toBe(true);
		expect(provider.isReady()).toBe(true);
		expect(provider.getStatus().error).toBeNull();
	});

	it('generates deterministic responses and caches them', async () => {
		await provider.initialize();
		const first = await provider.generateDnDResponse('hello', baseContext);
		const second = await provider.generateDnDResponse('hello', baseContext);

		expect(first.text).toContain('Stub response');
		expect(second).toEqual(first);
		expect(provider.getCacheStats().entries).toBeGreaterThan(0);
	});

	it('exposes model management helpers as no-ops', async () => {
		expect(await provider.getAvailableModels()).toEqual([]);
		expect(await provider.getModelRecommendations()).toEqual([]);
		expect(await provider.searchModels('test')).toEqual([]);
		expect(provider.getCurrentModel()).toBeNull();
		expect(provider.getPrivacySettings()).toBeDefined();
	});
});
