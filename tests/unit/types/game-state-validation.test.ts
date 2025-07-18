import { describe, it, expect } from 'vitest';
import { GameStateSchema } from '@/types/game';
import { CharacterSchema } from '@/types/character';

describe('Game State Validation', () => {
	describe('CharacterSchema', () => {
		it('should validate a basic character without equipped gear', () => {
			const character = {
				id: 'test-character-1',
				name: 'Test Hero',
				class: 'Fighter',
				race: 'Human',
				level: 1,
				stats: {
					STR: 15,
					DEX: 14,
					CON: 13,
					INT: 12,
					WIS: 10,
					CHA: 8,
				},
				skills: ['Athletics', 'Intimidation'],
				inventory: [],
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};

			const result = CharacterSchema.safeParse(character);
			if (!result.success) {
				console.log('Character validation errors:', JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.success).toBe(true);
		});

		it('should validate a character with equipped gear', () => {
			const character = {
				id: 'test-character-2',
				name: 'Test Hero',
				class: 'Fighter',
				race: 'Human',
				level: 1,
				stats: {
					STR: 15,
					DEX: 14,
					CON: 13,
					INT: 12,
					WIS: 10,
					CHA: 8,
				},
				skills: ['Athletics', 'Intimidation'],
				inventory: [],
				equipped: {
					mainHand: 'short-sword',
					chest: 'leather-armor',
					helmet: null,
				},
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};

			const result = CharacterSchema.safeParse(character);
			if (!result.success) {
				console.log('Character validation errors:', JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.success).toBe(true);
		});

		it('should handle undefined equipped field as optional', () => {
			const character = {
				id: 'test-character-3',
				name: 'Test Hero',
				class: 'Fighter',
				race: 'Human',
				level: 1,
				stats: {
					STR: 15,
					DEX: 14,
					CON: 13,
					INT: 12,
					WIS: 10,
					CHA: 8,
				},
				skills: ['Athletics', 'Intimidation'],
				inventory: [],
				equipped: undefined, // This should be handled as optional
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};

			const result = CharacterSchema.safeParse(character);
			if (!result.success) {
				console.log('Character validation errors:', JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.equipped).toBeUndefined();
			}
		});
	});

	describe('GameStateSchema', () => {
		it('should validate a new game state', () => {
			const gameState = {
				characters: [
					{
						id: 'player-1',
						name: 'Test Hero',
						class: 'Fighter',
						race: 'Human',
						level: 1,
						stats: {
							STR: 15,
							DEX: 14,
							CON: 13,
							INT: 12,
							WIS: 10,
							CHA: 8,
						},
						skills: ['Athletics', 'Intimidation'],
						inventory: [],
						equipped: {},
						health: 10,
						maxHealth: 10,
						actionPoints: 3,
						maxActionPoints: 3,
					},
				],
				playerCharacterId: 'player-1',
				gameWorld: 'faerun',
				startingArea: 'tavern',
			};

			const result = GameStateSchema.safeParse(gameState);
			if (!result.success) {
				console.log('Game state validation errors:', JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.success).toBe(true);
		});

		it('should validate a game state with missing equipped field', () => {
			const gameState = {
				characters: [
					{
						id: 'player-1',
						name: 'Test Hero',
						class: 'Fighter',
						race: 'Human',
						level: 1,
						stats: {
							STR: 15,
							DEX: 14,
							CON: 13,
							INT: 12,
							WIS: 10,
							CHA: 8,
						},
						skills: ['Athletics', 'Intimidation'],
						inventory: [],
						// equipped field is missing entirely
						health: 10,
						maxHealth: 10,
						actionPoints: 3,
						maxActionPoints: 3,
					},
				],
				playerCharacterId: 'player-1',
				gameWorld: 'faerun',
				startingArea: 'tavern',
			};

			const result = GameStateSchema.safeParse(gameState);
			if (!result.success) {
				console.log('Game state validation errors:', JSON.stringify(result.error.issues, null, 2));
			}
			expect(result.success).toBe(true);
		});

		it('should fail validation with invalid equipped field type', () => {
			const gameState = {
				characters: [
					{
						id: 'player-1',
						name: 'Test Hero',
						class: 'Fighter',
						race: 'Human',
						level: 1,
						stats: {
							STR: 15,
							DEX: 14,
							CON: 13,
							INT: 12,
							WIS: 10,
							CHA: 8,
						},
						skills: ['Athletics', 'Intimidation'],
						inventory: [],
						equipped: 'invalid-type', // Should be object, not string
						health: 10,
						maxHealth: 10,
						actionPoints: 3,
						maxActionPoints: 3,
					},
				],
				playerCharacterId: 'player-1',
				gameWorld: 'faerun',
				startingArea: 'tavern',
			};

			const result = GameStateSchema.safeParse(gameState);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some(issue => 
					issue.path.includes('equipped')
				)).toBe(true);
			}
		});
	});

	describe('Character Creation Factory', () => {
		it('should create a valid character from minimal data', () => {
			const createCharacter = (data: {
				id: string;
				name: string;
				class: string;
				race: string;
			}) => {
				return {
					id: data.id,
					name: data.name,
					class: data.class,
					race: data.race,
					level: 1,
					stats: {
						STR: 15,
						DEX: 14,
						CON: 13,
						INT: 12,
						WIS: 10,
						CHA: 8,
					},
					skills: [],
					inventory: [],
					equipped: {},
					health: 10,
					maxHealth: 10,
					actionPoints: 3,
					maxActionPoints: 3,
				};
			};

			const character = createCharacter({
				id: 'test-1',
				name: 'Test Character',
				class: 'Fighter',
				race: 'Human',
			});

			const result = CharacterSchema.safeParse(character);
			expect(result.success).toBe(true);
		});
	});
});