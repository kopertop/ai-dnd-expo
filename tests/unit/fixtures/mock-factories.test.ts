/**
 * Tests for mock factories to ensure they generate valid test data
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	AIResponseFactory,
	CharacterFactory,
	CompanionFactory,
	EnhancedAIResponseFactory,
	FactoryManager,
	GameStateFactory,
	InventoryFactory,
	StatsFactory,
	WorldMapFactory
} from '../../fixtures/mock-factories';

describe('Mock Factories', () => {
	beforeEach(() => {
		FactoryManager.reset();
	});

	describe('CharacterFactory', () => {
		it('should create a basic character with default values', () => {
			const character = CharacterFactory.createBasic();

			expect(character).toMatchObject({
				name: 'Test Hero',
				race: 'human',
				class: 'fighter',
				level: 1,
				health: 12,
				maxHealth: 12,
				actionPoints: 2,
				maxActionPoints: 2,
			});
			expect(character.id).toMatch(/^test-char-/);
			expect(character.stats).toHaveProperty('STR', 16);
			expect(character.skills).toContain('athletics');
		});

		it('should create character with class-specific stats', () => {
			const wizard = CharacterFactory.createWithClass('wizard');
			const fighter = CharacterFactory.createWithClass('fighter');

			expect(wizard.class).toBe('wizard');
			expect(wizard.stats.INT).toBeGreaterThan(fighter.stats.INT);
			expect(fighter.stats.STR).toBeGreaterThan(wizard.stats.STR);
		});

		it('should create multiple characters', () => {
			const characters = CharacterFactory.createMany(3);

			expect(characters).toHaveLength(3);
			characters.forEach((char, index) => {
				expect(char.name).toBe(`Test Hero ${index + 1}`);
				expect(char.id).toMatch(/^test-char-/);
			});
		});
	});

	describe('GameStateFactory', () => {
		it('should create a new game state', () => {
			const gameState = GameStateFactory.createNew();

			expect(gameState).toMatchObject({
				gameWorld: 'test-world',
				startingArea: 'test-tavern',
			});
			expect(gameState.characters).toHaveLength(1);
			expect(gameState.playerCharacterId).toBe(gameState.characters[0].id);
		});

		it('should create game state with multiple characters', () => {
			const gameState = GameStateFactory.createWithMultipleCharacters(3);

			expect(gameState.characters).toHaveLength(3);
			expect(gameState.playerCharacterId).toBe(gameState.characters[0].id);
		});
	});

	describe('AIResponseFactory', () => {
		it('should create successful AI response', () => {
			const response = AIResponseFactory.createSuccess('Test response');

			expect(response).toMatchObject({
				text: 'Test response',
				usage: { totalTokens: 25 },
			});
		});

		it('should create different DM response types', () => {
			const greeting = AIResponseFactory.createDMResponse('greeting');
			const combat = AIResponseFactory.createDMResponse('combat');

			expect(greeting.text).toContain('tavern');
			expect(combat.text).toContain('initiative');
		});

		it('should create error responses', () => {
			const error = AIResponseFactory.createError('Service down');

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('Service down');
		});
	});

	describe('CompanionFactory', () => {
		it('should create a basic companion', () => {
			const companion = CompanionFactory.createBasic();

			expect(companion).toMatchObject({
				name: 'Test Companion',
				type: 'companion',
				companionType: 'hired',
				isActive: true,
				loyalty: 75,
			});
			expect(companion.id).toMatch(/^test-companion-/);
			expect(companion.behavior).toHaveProperty('combatStyle', 'balanced');
		});

		it('should create multiple companions', () => {
			const companions = CompanionFactory.createMany(2);

			expect(companions).toHaveLength(2);
			companions.forEach((companion, index) => {
				expect(companion.name).toBe(`Test Companion ${index + 1}`);
			});
		});
	});

	describe('EnhancedAIResponseFactory', () => {
		it('should create streaming response', () => {
			const chunks = ['Hello', ' world', '!'];
			const response = EnhancedAIResponseFactory.createStreamingResponse(chunks);

			expect(response.stream).toHaveLength(3);
			expect(response.stream[0]).toMatchObject({ text: 'Hello', done: false });
			expect(response.usage.totalTokens).toBeGreaterThan(0);
		});

		it('should create rate limit error', () => {
			const error = EnhancedAIResponseFactory.createRateLimitError();

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('Rate limit exceeded');
			expect((error as any).status).toBe(429);
		});

		it('should create contextual conversation response', () => {
			const response = EnhancedAIResponseFactory.createConversationResponse(
				['combat'],
				'attack with sword'
			);

			expect(response.text).toContain('attack with sword');
			expect(response.text).toContain('enemy reacts');
		});
	});

	describe('WorldMapFactory', () => {
		it('should create basic position', () => {
			const position = WorldMapFactory.createBasicPosition(5, 10);

			expect(position).toEqual({ x: 5, y: 10 });
		});

		it('should create map tile', () => {
			const tile = WorldMapFactory.createMapTile({ x: 2, y: 3 });

			expect(tile).toMatchObject({
				id: 'tile-2-3',
				position: { x: 2, y: 3 },
				terrain: 'grass',
				walkable: true,
				explored: false,
			});
		});

		it('should create world map with regions', () => {
			const worldMap = WorldMapFactory.createWorldMap();

			expect(worldMap.name).toBe('Test World');
			expect(worldMap.regions).toHaveLength(1);
			expect(worldMap.startingRegionId).toBe(worldMap.regions[0].id);
		});
	});

	describe('StatsFactory', () => {
		it('should create balanced stats', () => {
			const stats = StatsFactory.createBalancedStats();

			Object.values(stats).forEach(stat => {
				expect(stat).toBe(13);
			});
		});

		it('should create min/max stats', () => {
			const stats = StatsFactory.createMinMaxStats();

			expect(stats.STR).toBe(20);
			expect(stats.DEX).toBe(8);
		});

		it('should create random stats within valid range', () => {
			const stats = StatsFactory.createRandomStats();

			Object.values(stats).forEach(stat => {
				expect(stat).toBeGreaterThanOrEqual(8);
				expect(stat).toBeLessThanOrEqual(20);
			});
		});
	});

	describe('InventoryFactory', () => {
		it('should create basic item', () => {
			const item = InventoryFactory.createBasicItem();

			expect(item).toMatchObject({
				name: 'Test Item',
				type: 'misc',
				value: 10,
				weight: 1,
			});
			expect(item.id).toMatch(/^item-/);
		});

		it('should create weapon with damage properties', () => {
			const weapon = InventoryFactory.createWeapon();

			expect(weapon).toMatchObject({
				name: 'Test Sword',
				type: 'weapon',
				damage: '1d8',
				damageType: 'slashing',
			});
		});

		it('should create inventory with multiple items', () => {
			const inventory = InventoryFactory.createInventory(3);

			expect(inventory).toHaveLength(3);
			inventory.forEach((item, index) => {
				expect(item.name).toBe(`Test Item ${index + 1}`);
			});
		});
	});

	describe('FactoryManager', () => {
		it('should generate unique IDs', () => {
			const id1 = FactoryManager.getUniqueId('test');
			const id2 = FactoryManager.getUniqueId('test');

			expect(id1).toBe('test-1');
			expect(id2).toBe('test-2');
		});

		it('should reset counters', () => {
			FactoryManager.getUniqueId('test');
			FactoryManager.getUniqueId('test');
			FactoryManager.resetCounters();

			const id = FactoryManager.getUniqueId('test');
			expect(id).toBe('test-1');
		});
	});
});
