// Note: This test was originally using @testing-library/react which isn't available
// Keeping the file structure but focusing on testing the core logic
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import customImage from '@/assets/images/custom.png';
import { RACES } from '@/constants/races';
import { getCharacterImage, useGameState } from '@/hooks/use-game-state';
import { CharacterFactory, GameStateFactory } from '@/tests/fixtures/mock-factories';
import { mockAsyncStorage } from '@/tests/unit/__mocks__/external-dependencies';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
	default: mockAsyncStorage,
}));

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

describe('useGameState', () => {
	beforeEach(() => {
		mockAsyncStorage.reset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initial state', () => {
		it('should start with loading true and no data', () => {
			const { result } = renderHook(() => useGameState());

			expect(result.current.loading).toBe(true);
			expect(result.current.gameState).toBeNull();
			expect(result.current.playerCharacter).toBeNull();
			expect(result.current.error).toBeNull();
		});

		it('should attempt to load game state on mount', async () => {
			renderHook(() => useGameState());

			await waitFor(() => {
				expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('gameState');
			});
		});
	});

	describe('loading game state', () => {
		it('should load valid game state from storage', async () => {
			const gameState = GameStateFactory.createNew();
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.gameState).toEqual(gameState);
			expect(result.current.playerCharacter).toEqual(gameState.characters[0]);
			expect(result.current.error).toBeNull();
		});

		it('should handle missing game state gracefully', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.gameState).toBeNull();
			expect(result.current.playerCharacter).toBeNull();
			expect(result.current.error).toBe('No game state found');
		});

		it('should handle invalid JSON gracefully', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.gameState).toBeNull();
			expect(result.current.error).toBeTruthy();
		});

		it('should handle schema validation errors', async () => {
			const invalidGameState = { invalid: 'data' };
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(invalidGameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.gameState).toBeNull();
			expect(result.current.error).toContain('Game state format is outdated');
			expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gameState');
		});

		it('should handle missing player character', async () => {
			const gameState = GameStateFactory.createNew();
			gameState.playerCharacterId = 'non-existent-id';
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe('Player character not found');
		});
	});

	describe('saving game state', () => {
		it('should save game state to storage', async () => {
			const { result } = renderHook(() => useGameState());
			const newGameState = GameStateFactory.createNew();

			await act(async () => {
				await result.current.save(newGameState);
			});

			expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
				'gameState',
				JSON.stringify(newGameState)
			);
			expect(result.current.gameState).toEqual(newGameState);
			expect(result.current.playerCharacter).toEqual(newGameState.characters[0]);
		});

		it('should handle save errors', async () => {
			const saveError = new Error('Storage full');
			mockAsyncStorage.setItem.mockRejectedValueOnce(saveError);

			const { result } = renderHook(() => useGameState());
			const newGameState = GameStateFactory.createNew();

			await expect(
				act(async () => {
					await result.current.save(newGameState);
				})
			).rejects.toThrow('Storage full');

			expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to save game state:', saveError);
		});
	});

	describe('updating player character', () => {
		it('should update player character and save to storage', async () => {
			const gameState = GameStateFactory.createNew();
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const updates = { name: 'Updated Hero', level: 2 };

			await act(async () => {
				await result.current.updatePlayerCharacter(updates);
			});

			expect(result.current.playerCharacter?.name).toBe('Updated Hero');
			expect(result.current.playerCharacter?.level).toBe(2);
			expect(mockAsyncStorage.setItem).toHaveBeenCalled();
		});

		it('should throw error when no game state is loaded', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			await expect(
				act(async () => {
					await result.current.updatePlayerCharacter({ name: 'Test' });
				})
			).rejects.toThrow('No game state or player character loaded');
		});

		it('should update correct character in multi-character game state', async () => {
			const gameState = GameStateFactory.createWithMultipleCharacters(3);
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const updates = { level: 5 };

			await act(async () => {
				await result.current.updatePlayerCharacter(updates);
			});

			expect(result.current.playerCharacter?.level).toBe(5);
			// Other characters should remain unchanged
			expect(result.current.gameState?.characters[1].level).toBe(1);
			expect(result.current.gameState?.characters[2].level).toBe(1);
		});
	});

	describe('clearing game data', () => {
		it('should clear all game data', async () => {
			const gameState = GameStateFactory.createNew();
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			await act(async () => {
				await result.current.clear();
			});

			expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('gameState');
			expect(result.current.gameState).toBeNull();
			expect(result.current.playerCharacter).toBeNull();
			expect(result.current.error).toBeNull();
		});
	});

	describe('manual loading', () => {
		it('should allow manual reload of game state', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Now add game state to storage
			const gameState = GameStateFactory.createNew();
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			await act(async () => {
				await result.current.load();
			});

			expect(result.current.gameState).toEqual(gameState);
			expect(result.current.playerCharacter).toEqual(gameState.characters[0]);
		});
	});

	describe('player portrait', () => {
		it('should return custom image when no character', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.playerPortrait).toBe(customImage);
		});

		it('should return race image when character has race', async () => {
			const character = CharacterFactory.createWithRace('elf');
			const gameState = GameStateFactory.createNew({ characters: [character], playerCharacterId: character.id });
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const elfRace = RACES.find(r => r.name === 'elf');
			expect(result.current.playerPortrait).toBe(elfRace?.image || customImage);
		});

		it('should return custom image for unknown race', async () => {
			const character = CharacterFactory.createWithRace('unknown-race');
			const gameState = GameStateFactory.createNew({ characters: [character], playerCharacterId: character.id });
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.playerPortrait).toBe(customImage);
		});
	});

	describe('error handling', () => {
		it('should handle AsyncStorage errors during load', async () => {
			const storageError = new Error('Storage unavailable');
			mockAsyncStorage.getItem.mockRejectedValueOnce(storageError);

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe('Storage unavailable');
			expect(consoleSpy).toHaveBeenCalledWith('❌ GameState load error:', storageError);
		});

		it('should reset loading state after error', async () => {
			mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Test error'));

			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeTruthy();
		});
	});

	describe('performance', () => {
		it('should complete load operation within reasonable time', async () => {
			const gameState = GameStateFactory.createNew();
			mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(gameState));

			const startTime = performance.now();
			const { result } = renderHook(() => useGameState());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within 100ms in test environment
			expect(duration).toBeLessThan(100);
		});

		it('should complete save operation within reasonable time', async () => {
			const { result } = renderHook(() => useGameState());
			const gameState = GameStateFactory.createNew();

			const startTime = performance.now();

			await act(async () => {
				await result.current.save(gameState);
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within 50ms in test environment
			expect(duration).toBeLessThan(50);
		});
	});
});

describe('getCharacterImage utility', () => {
	it('should return custom image for null character', () => {
		expect(getCharacterImage(null)).toBe(customImage);
	});

	it('should return custom image for undefined character', () => {
		expect(getCharacterImage(undefined)).toBe(customImage);
	});

	it('should return race image for character with valid race', () => {
		const character = CharacterFactory.createWithRace('elf');
		const result = getCharacterImage(character);

		const elfRace = RACES.find(r => r.name === 'elf');
		expect(result).toBe(elfRace?.image || customImage);
	});

	it('should return custom image for character with invalid race', () => {
		const character = CharacterFactory.createWithRace('invalid-race');
		const result = getCharacterImage(character);

		expect(result).toBe(customImage);
	});

	it('should return custom image for character without race', () => {
		const character = CharacterFactory.createBasic({ race: '' });
		const result = getCharacterImage(character);

		expect(result).toBe(customImage);
	});
});
