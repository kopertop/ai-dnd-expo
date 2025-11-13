import { describe, expect, it } from 'vitest';

import { TestAssertions, TestDataGenerator } from '@/tests/utils/test-helpers';

describe('TestDataGenerator', () => {
	describe('generateCharacter', () => {
		it('should generate a valid character with default values', () => {
			const character = TestDataGenerator.generateCharacter();

			expect(character.id).toBeDefined();
			expect(character.name).toBe('Test Hero');
			expect(character.race).toBe('human');
			expect(character.class).toBe('fighter');
			expect(character.level).toBe(1);
			expect(character.stats.STR).toBe(16);
			expect(character.stats.DEX).toBe(14);
			expect(character.stats.CON).toBe(15);
			expect(character.stats.INT).toBe(10);
			expect(character.stats.WIS).toBe(12);
			expect(character.stats.CHA).toBe(8);
			expect(character.health).toBe(12);
			expect(character.maxHealth).toBe(12);
			expect(character.actionPoints).toBe(2);
			expect(character.maxActionPoints).toBe(2);
		});

		it('should allow overriding character properties', () => {
			const overrides = {
				name: 'Custom Hero',
				level: 5,
				stats: {
					STR: 18,
					DEX: 16,
					CON: 14,
					INT: 12,
					WIS: 10,
					CHA: 8,
				},
			};

			const character = TestDataGenerator.generateCharacter(overrides);

			expect(character.name).toBe('Custom Hero');
			expect(character.level).toBe(5);
			expect(character.stats.STR).toBe(18);
			expect(character.stats.DEX).toBe(16);
		});
	});

	describe('generateGameState', () => {
		it('should generate a valid game state', () => {
			const gameState = TestDataGenerator.generateGameState();

			expect(gameState.characters).toHaveLength(1);
			expect(gameState.playerCharacterId).toBeDefined();
			expect(gameState.gameWorld).toBe('test-world');
			expect(gameState.startingArea).toBe('test-tavern');
		});

		it('should allow overriding game state properties', () => {
			const overrides = {
				gameWorld: 'custom-world',
				startingArea: 'custom-area',
			};

			const gameState = TestDataGenerator.generateGameState(overrides);

			expect(gameState.gameWorld).toBe('custom-world');
			expect(gameState.startingArea).toBe('custom-area');
		});
	});
});

describe('TestAssertions', () => {
	describe('assertValidCharacter', () => {
		it('should pass for a valid character', () => {
			const character = TestDataGenerator.generateCharacter();

			// Should not throw
			expect(() => {
				TestAssertions.assertValidCharacter(character);
			}).not.toThrow();
		});
	});

	describe('assertValidGameState', () => {
		it('should pass for a valid game state', () => {
			const gameState = TestDataGenerator.generateGameState();

			// Should not throw
			expect(() => {
				TestAssertions.assertValidGameState(gameState);
			}).not.toThrow();
		});
	});
});
