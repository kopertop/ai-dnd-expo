import type { Character } from '@/types/character';
import type { Companion } from '@/types/companion';
import type { GameState } from '@/types/game';
import { vi } from 'vitest';

/**
 * Factory for creating test characters with various configurations
 */
export class CharacterFactory {
	static createBasic(overrides?: Partial<Character>): Character {
		return {
			id: `test-char-${Date.now()}`,
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

	static createWithClass(className: string, overrides?: Partial<Character>): Character {
		const baseStats = this.getClassStats(className);
		return this.createBasic({
			class: className,
			stats: baseStats,
			...overrides,
		});
	}

	static createWithRace(raceName: string, overrides?: Partial<Character>): Character {
		const raceModifiers = this.getRaceModifiers(raceName);
		const baseStats = this.createBasic().stats;

		return this.createBasic({
			race: raceName,
			stats: {
				STR: baseStats.STR + (raceModifiers.STR || 0),
				DEX: baseStats.DEX + (raceModifiers.DEX || 0),
				CON: baseStats.CON + (raceModifiers.CON || 0),
				INT: baseStats.INT + (raceModifiers.INT || 0),
				WIS: baseStats.WIS + (raceModifiers.WIS || 0),
				CHA: baseStats.CHA + (raceModifiers.CHA || 0),
			},
			...overrides,
		});
	}

	static createMany(count: number, overrides?: Partial<Character>): Character[] {
		return Array.from({ length: count }, (_, index) =>
			this.createBasic({
				id: `test-char-${Date.now()}-${index}`,
				name: `Test Hero ${index + 1}`,
				...overrides,
			})
		);
	}

	private static getClassStats(className: string) {
		const classStats: Record<string, any> = {
			fighter: { STR: 16, DEX: 14, CON: 15, INT: 10, WIS: 12, CHA: 8 },
			wizard: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 15, CHA: 10 },
			rogue: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 15, CHA: 8 },
			cleric: { STR: 14, DEX: 10, CON: 15, INT: 12, WIS: 16, CHA: 8 },
		};
		return classStats[className] || classStats.fighter;
	}

	private static getRaceModifiers(raceName: string) {
		const raceModifiers: Record<string, any> = {
			human: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
			elf: { DEX: 2, INT: 1 },
			dwarf: { CON: 2, STR: 1 },
			halfling: { DEX: 2, CHA: 1 },
		};
		return raceModifiers[raceName] || {};
	}
}

/**
 * Factory for creating test game states
 */
export class GameStateFactory {
	static createNew(overrides?: Partial<GameState>): GameState {
		const character = CharacterFactory.createBasic();
		return {
			characters: [character],
			playerCharacterId: character.id,
			gameWorld: 'test-world',
			startingArea: 'test-tavern',
			...overrides,
		};
	}

	static createWithMultipleCharacters(count: number, overrides?: Partial<GameState>): GameState {
		const characters = CharacterFactory.createMany(count);
		return {
			characters,
			playerCharacterId: characters[0].id,
			gameWorld: 'test-world',
			startingArea: 'test-tavern',
			...overrides,
		};
	}

	static createInProgress(overrides?: Partial<GameState>): GameState {
		return this.createNew({
			...overrides,
		});
	}
}

/**
 * Factory for creating AI response mocks
 */
export class AIResponseFactory {
	static createSuccess(text?: string) {
		return {
			text: text || 'Mock AI response',
			usage: { totalTokens: 25 },
		};
	}

	static createError(message?: string) {
		return new Error(message || 'AI service unavailable');
	}

	static createDMResponse(type: 'greeting' | 'combat' | 'exploration' | 'fallback' = 'greeting') {
		const responses = {
			greeting: 'Welcome to the tavern, adventurer! What brings you here?',
			combat: 'Roll for initiative! A goblin jumps out from behind the barrel!',
			exploration: 'You see a mysterious door ahead, covered in ancient runes.',
			fallback: 'The DM is thinking... (AI service temporarily unavailable)',
		};

		return this.createSuccess(responses[type]);
	}

	static createNPCResponse(npcType: 'shopkeeper' | 'guard' | 'innkeeper' = 'shopkeeper') {
		const responses = {
			shopkeeper: 'What can I help you find today, traveler?',
			guard: 'Halt! State your business in these parts.',
			innkeeper: 'Welcome to my establishment! Would you like a room for the night?',
		};

		return this.createSuccess(responses[npcType]);
	}
}

/**
 * Factory for creating mock external dependencies
 */
export class MockDependencyFactory {
	static createMockCactusClient() {
		return {
			generateText: vi.fn().mockResolvedValue(AIResponseFactory.createSuccess()),
			isAvailable: vi.fn().mockReturnValue(true),
			configure: vi.fn(),
		};
	}

	static createMockAsyncStorage() {
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
			getAllKeys: vi.fn(() => Promise.resolve(Array.from(storage.keys()))),
			multiGet: vi.fn((keys: string[]) =>
				Promise.resolve(keys.map(key => [key, storage.get(key) || null]))
			),
			multiSet: vi.fn((keyValuePairs: [string, string][]) => {
				keyValuePairs.forEach(([key, value]) => storage.set(key, value));
				return Promise.resolve();
			}),
			multiRemove: vi.fn((keys: string[]) => {
				keys.forEach(key => storage.delete(key));
				return Promise.resolve();
			}),
		};
	}

	static createMockExpoSpeech() {
		return {
			speak: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			pause: vi.fn().mockResolvedValue(undefined),
			resume: vi.fn().mockResolvedValue(undefined),
			isSpeaking: vi.fn().mockResolvedValue(false),
		};
	}

	static createMockExpoAudio() {
		const mockSound = {
			playAsync: vi.fn().mockResolvedValue(undefined),
			pauseAsync: vi.fn().mockResolvedValue(undefined),
			stopAsync: vi.fn().mockResolvedValue(undefined),
			unloadAsync: vi.fn().mockResolvedValue(undefined),
			setIsLoopingAsync: vi.fn().mockResolvedValue(undefined),
			setVolumeAsync: vi.fn().mockResolvedValue(undefined),
		};

		return {
			Audio: {
				Sound: {
					createAsync: vi.fn().mockResolvedValue({ sound: mockSound }),
				},
				setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
			},
		};
	}

	static createMockRouter() {
		return {
			push: vi.fn(),
			replace: vi.fn(),
			back: vi.fn(),
			canGoBack: vi.fn().mockReturnValue(false),
		};
	}
}

/**
 * Factory for creating test companions
 */
export class CompanionFactory {
	static createBasic(overrides?: Partial<Companion>): Companion {
		const baseCharacter = CharacterFactory.createBasic();
		return {
			...baseCharacter,
			id: `test-companion-${Date.now()}`,
			name: 'Test Companion',
			type: 'companion',
			companionType: 'hired',
			isActive: true,
			loyalty: 75,
			behavior: {
				combatStyle: 'balanced',
				followDistance: 'medium',
				independence: 50,
			},
			voice: {
				personality: 'helpful',
				speakingStyle: 'friendly',
				catchphrases: ['Ready to help!', 'Let\'s go!'],
			},
			recruitedAt: Date.now(),
			cost: {
				type: 'gold',
				amount: 100,
				description: 'Hired for 100 gold',
			},
			...overrides,
		};
	}

	static createMany(count: number, overrides?: Partial<Companion>): Companion[] {
		return Array.from({ length: count }, (_, index) =>
			this.createBasic({
				id: `test-companion-${Date.now()}-${index}`,
				name: `Test Companion ${index + 1}`,
				...overrides,
			})
		);
	}
}
