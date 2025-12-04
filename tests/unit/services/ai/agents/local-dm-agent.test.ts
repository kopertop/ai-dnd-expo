import { beforeEach, describe, expect, it } from 'vitest';

import { LocalDMAgent } from '@/services/ai/agents/local-dm-agent';

const baseContext = {
	playerName: 'TestPlayer',
	playerClass: 'Fighter',
	playerRace: 'Human',
	currentScene: 'Dungeon',
	gameHistory: [],
};

describe('LocalDMAgent (stub)', () => {
	let agent: LocalDMAgent;

	beforeEach(() => {
		agent = new LocalDMAgent({
			modelPath: '/tmp/model.onnx',
			maxTokens: 128,
			temperature: 0.7,
		});
	});

	it('initializes underlying provider', async () => {
		await agent.initialize();
		expect(agent.isReady()).toBe(true);
	});

	it('processes an action with the stub provider', async () => {
		await agent.initialize();
		const response = await agent.processAction('Attack the goblin', baseContext);

		expect(response.text).toContain('Stub response');
		expect(response.toolCommands).toBeDefined();
	});

	it('generates narration text', async () => {
		await agent.initialize();
		const narration = await agent.generateNarration('A dark cave', baseContext);
		expect(typeof narration).toBe('string');
	});
});
