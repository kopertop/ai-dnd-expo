import type { Character } from '@/types/character';
import type { GameState } from '@/types/game';
import { expect, vi } from 'vitest';

/**
 * Test data generators for consistent test fixtures
 */
export class TestDataGenerator {
	static generateCharacter(overrides?: Partial<Character>): Character {
		return {
			id: `test-character-${Date.now()}`,
			name: 'Test Hero',
			race: 'human',
			class: 'fighter',
			level: 1,
			stats: {
				STR: 16,
				DEX: 14,
				CON: 15,
				INT: 10,
				WIS: 12,
				CHA: 8,
			},
			skills: ['athletics', 'intimidation'],
			inventory: [],
			equipped: {
				helmet: null,
				chest: null,
				arms: null,
				legs: null,
				boots: null,
				mainHand: null,
				offHand: null,
				accessory: null,
				none: null,
			},
			health: 12,
			maxHealth: 12,
			actionPoints: 2,
			maxActionPoints: 2,
			...overrides,
		};
	}

	static generateGameState(overrides?: Partial<GameState>): GameState {
		const character = this.generateCharacter();
		return {
			characters: [character],
			playerCharacterId: character.id,
			gameWorld: 'test-world',
			startingArea: 'test-tavern',
			...overrides,
		};
	}
}

/**
 * Mock AI service responses for consistent testing
 */
export const mockAIResponses = {
	dungeonMaster: {
		greeting: 'Welcome to the tavern, adventurer! What brings you here?',
		combat: 'Roll for initiative! A goblin jumps out from behind the barrel!',
		exploration: 'You see a mysterious door ahead, covered in ancient runes.',
		fallback: 'The DM is thinking... (AI service temporarily unavailable)',
	},
	npc: {
		shopkeeper: 'What can I help you find today, traveler?',
		guard: 'Halt! State your business in these parts.',
		innkeeper: 'Welcome to my establishment! Would you like a room for the night?',
		fallback: "The character seems distracted and doesn't respond.",
	},
};

/**
 * Mock service utilities
 */
export class MockServiceHelper {
	/**
	 * Setup mock AI service with predefined responses
	 */
	static setupMockAIService() {
		return vi.fn().mockImplementation((message: string) => {
			if (message.toLowerCase().includes('hello')) {
				return Promise.resolve({
					text: mockAIResponses.dungeonMaster.greeting,
					usage: { totalTokens: 25 },
				});
			}
			if (message.toLowerCase().includes('attack')) {
				return Promise.resolve({
					text: mockAIResponses.dungeonMaster.combat,
					usage: { totalTokens: 30 },
				});
			}
			return Promise.resolve({
				text: mockAIResponses.dungeonMaster.exploration,
				usage: { totalTokens: 20 },
			});
		});
	}

	/**
	 * Setup mock AI service that fails
	 */
	static setupFailingAIService() {
		return vi.fn().mockRejectedValue(new Error('AI service unavailable'));
	}

	/**
	 * Setup mock AsyncStorage
	 */
	static setupMockAsyncStorage() {
		const storage = new Map<string, string>();

		return {
			getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) || null)),
			setItem: vi.fn((key: string, value: string) => {
				storage.set(key, value);
				return Promise.resolve();
			}),
			removeItem: vi.fn((key: string) => {
				storage.delete(key);
				return Promise.resolve();
			}),
			clear: vi.fn(() => {
				storage.clear();
				return Promise.resolve();
			}),
		};
	}
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
	/**
	 * Assert that a character has valid stats
	 */
	static assertValidCharacter(character: Character) {
		expect(character.id).toBeDefined();
		expect(character.name).toBeTruthy();
		expect(character.race).toBeTruthy();
		expect(character.class).toBeTruthy();
		expect(character.level).toBeGreaterThan(0);
		expect(character.stats).toBeDefined();
		expect(character.stats.STR).toBeGreaterThanOrEqual(1);
		expect(character.stats.DEX).toBeGreaterThanOrEqual(1);
		expect(character.stats.CON).toBeGreaterThanOrEqual(1);
		expect(character.stats.INT).toBeGreaterThanOrEqual(1);
		expect(character.stats.WIS).toBeGreaterThanOrEqual(1);
		expect(character.stats.CHA).toBeGreaterThanOrEqual(1);
	}

	/**
	 * Assert that a game state is valid
	 */
	static assertValidGameState(gameState: GameState) {
		expect(gameState.characters.length).toBeGreaterThan(0);
		expect(gameState.playerCharacterId).toBeDefined();
		expect(gameState.gameWorld).toBeTruthy();
		expect(gameState.startingArea).toBeTruthy();
	}
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
	/**
	 * Measure execution time of a function
	 */
	static async measureExecutionTime<T>(
		fn: () => Promise<T>
	): Promise<{ result: T; duration: number }> {
		const startTime = performance.now();
		const result = await fn();
		const endTime = performance.now();
		return {
			result,
			duration: endTime - startTime,
		};
	}

	/**
	 * Assert that a function executes within a time limit
	 */
	static async assertExecutionTime<T>(
		fn: () => Promise<T>,
		maxDuration: number,
		description?: string
	): Promise<T> {
		const { result, duration } = await this.measureExecutionTime(fn);
		expect(duration).toBeLessThan(maxDuration);
		if (description) {
			console.log(`${description}: ${duration.toFixed(2)}ms`);
		}
		return result;
	}
}

/**
 * Wait utilities for async testing
 */
export class WaitHelper {
	/**
	 * Wait for a condition to be true
	 */
	static async waitFor(
		condition: () => boolean | Promise<boolean>,
		timeout = 5000,
		interval = 100
	): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			if (await condition()) {
				return;
			}
			await new Promise(resolve => setTimeout(resolve, interval));
		}

		throw new Error(`Condition not met within ${timeout}ms`);
	}

	/**
	 * Wait for a specific amount of time
	 */
	static async wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
