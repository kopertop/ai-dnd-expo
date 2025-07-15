import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { RACES } from '@/constants/races';
import { Character } from '@/types/character';
import { GameState, GameStateSchema } from '@/types/game';

const GAME_STATE_KEY = 'gameState';

export const getCharacterImage = (character: Character | undefined | null) => {
	if (!character) {
		return require('@/assets/images/custom.png');
	}

	if (character.race) {
		const race = RACES.find(r => r.name === character.race);
		if (race) {
			return race.image;
		}
	}

	return require('@/assets/images/custom.png');
};

export const useGameState = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [playerCharacter, setPlayerCharacter] = useState<Character | null>(null);

	// Load game state from AsyncStorage
	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const raw = await AsyncStorage.getItem(GAME_STATE_KEY);
			if (!raw) throw new Error('No game state found');

			const rawData = JSON.parse(raw);

			// Validate with schema
			const parsed = GameStateSchema.parse(rawData);
			setGameState(parsed);

			// Extract player character
			const char = parsed.characters.find(c => c.id === parsed.playerCharacterId);
			if (!char) throw new Error('Player character not found');
			setPlayerCharacter(char);
		} catch (e: any) {
			console.error('❌ GameState load error:', e);
			if (e.name === 'ZodError') {
				const missingFields = e.issues.map((issue: any) => issue.path.join('.')).join(', ');
				console.log('🗑️ Clearing outdated game state due to schema changes...');
				await AsyncStorage.removeItem(GAME_STATE_KEY);
				setError(
					`Game state format is outdated. Missing: ${missingFields}. Please start a new game.`,
				);
			} else {
				setError(e.message || 'Failed to load game state');
			}
		}
		setLoading(false);
	}, []);

	// Save game state to AsyncStorage
	const save = useCallback(async (newGameState: GameState) => {
		try {
			await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(newGameState));
			setGameState(newGameState);

			// Update player character
			const char = newGameState.characters.find(c => c.id === newGameState.playerCharacterId);
			setPlayerCharacter(char || null);
		} catch (e: any) {
			console.error('❌ Failed to save game state:', e);
			throw e;
		}
	}, []);

	// Update player character and save to game state
	const updatePlayerCharacter = useCallback(
		async (updates: Partial<Character>) => {
			if (!gameState || !playerCharacter) {
				throw new Error('No game state or player character loaded');
			}

			const updatedCharacter = { ...playerCharacter, ...updates };
			const updatedCharacters = gameState.characters.map(c =>
				c.id === playerCharacter.id ? updatedCharacter : c,
			);
			const updatedGameState = { ...gameState, characters: updatedCharacters };

			await save(updatedGameState);
		},
		[gameState, playerCharacter, save],
	);

	// Clear all game data
	const clear = useCallback(async () => {
		await AsyncStorage.removeItem(GAME_STATE_KEY);
		setGameState(null);
		setPlayerCharacter(null);
		setError(null);
	}, []);

	// Auto-load on mount
	useEffect(() => {
		load();
	}, [load]);

	// Memoized character portrait image for performance
	const playerPortrait = useMemo(() => getCharacterImage(playerCharacter), [playerCharacter]);

	return {
		loading,
		error,
		gameState,
		playerCharacter,
		playerPortrait,
		load,
		save,
		updatePlayerCharacter,
		clear,
	};
};
