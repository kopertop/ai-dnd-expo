import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { ITEM_LIST } from '../constants/items';
import { Character } from '../types/character';
import { GameState, GameStateSchema } from '../types/game';
import { InventoryEntry, Item } from '../types/items';
import { GearSlot } from '../types/stats';

const GAME_STATE_KEY = 'gameState';

export function useInventoryManager() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [character, setCharacter] = useState<Character | null>(null);

	// Load game state and player character
	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const raw = await AsyncStorage.getItem(GAME_STATE_KEY);
			if (!raw) throw new Error('No game state found');
			const parsed = GameStateSchema.parse(JSON.parse(raw));
			setGameState(parsed);
			const char = parsed.characters.find(c => c.id === parsed.playerCharacterId);
			if (!char) throw new Error('Player character not found');
			setCharacter(char);
		} catch (e: any) {
			setError(e.message || 'Failed to load inventory');
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	// Save character back to game state
	const saveCharacter = useCallback(async (update: Partial<Character>) => {
		if (!gameState || !character) return;
		const updatedChar = { ...character, ...update };
		const updatedChars = gameState.characters.map(c => c.id === character.id ? updatedChar : c);
		const newState = { ...gameState, characters: updatedChars };
		await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));
		setGameState(newState);
		setCharacter(updatedChar);
	}, [gameState, character]);

	// Inventory helpers
	const inventory: (InventoryEntry & { item: Item })[] = (character?.inventory || []).map(entry => ({
		...entry,
		item: ITEM_LIST.find(i => i.id === entry.itemId)!,
	}));

	const equipped: Partial<Record<GearSlot, Item>> = {};
	if (character?.equipped) {
		Object.entries(character.equipped).forEach(([slot, itemId]) => {
			if (itemId) {
				const item = ITEM_LIST.find(i => i.id === itemId);
				if (item) equipped[slot as GearSlot] = item;
			}
		});
	}

	const addItem = useCallback(async (itemId: string, quantity = 1) => {
		if (!character) return;
		const idx = character.inventory.findIndex(e => e.itemId === itemId);
		let newInventory;
		if (idx >= 0) {
			newInventory = [...character.inventory];
			newInventory[idx] = { ...newInventory[idx], quantity: newInventory[idx].quantity + quantity };
		} else {
			newInventory = [...character.inventory, { itemId, quantity }];
		}
		await saveCharacter({ inventory: newInventory });
	}, [character, saveCharacter]);

	const removeItem = useCallback(async (itemId: string, quantity = 1) => {
		if (!character) return;
		const idx = character.inventory.findIndex(e => e.itemId === itemId);
		if (idx < 0) return;
		const newInventory = [...character.inventory];
		if (newInventory[idx].quantity > quantity) {
			newInventory[idx] = { ...newInventory[idx], quantity: newInventory[idx].quantity - quantity };
		} else {
			newInventory.splice(idx, 1);
		}
		await saveCharacter({ inventory: newInventory });
	}, [character, saveCharacter]);

	const equipItem = useCallback(async (itemId: string) => {
		if (!character) return;
		const item = ITEM_LIST.find(i => i.id === itemId);
		if (!item || item.slot === 'none') return;
		const newEquipped = { ...character.equipped, [item.slot]: itemId };
		await saveCharacter({ equipped: newEquipped });
	}, [character, saveCharacter]);

	const unequipItem = useCallback(async (slot: GearSlot) => {
		if (!character) return;
		const newEquipped = { ...character.equipped, [slot]: null };
		await saveCharacter({ equipped: newEquipped });
	}, [character, saveCharacter]);

	const useItem = useCallback(async (itemId: string) => {
		// For now, just remove one from inventory
		await removeItem(itemId, 1);
		// TODO: trigger item effect
	}, [removeItem]);

	return {
		loading,
		error,
		inventory,
		equipped,
		addItem,
		removeItem,
		equipItem,
		unequipItem,
		useItem,
		refresh: load,
	};
}
