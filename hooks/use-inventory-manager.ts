import { useCallback } from 'react';

import { useGameState } from './use-game-state';

import { ITEM_LIST } from '@/constants/items';
import { Item, InventoryEntry } from '@/types/items';
import { GearSlot } from '@/types/stats';

export const useInventoryManager = () => {
	const { 
		loading, 
		error, 
		gameState, 
		playerCharacter: character, 
		updatePlayerCharacter: saveCharacter,
		load: refresh,
	} = useGameState();

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

	// Add item to inventory
	const addItem = useCallback(async (itemId: string, quantity = 1) => {
		if (!character) return;
		const existingIdx = character.inventory.findIndex(e => e.itemId === itemId);
		let newInventory: InventoryEntry[];
		
		if (existingIdx >= 0) {
			newInventory = [...character.inventory];
			newInventory[existingIdx] = { 
				...newInventory[existingIdx], 
				quantity: newInventory[existingIdx].quantity + quantity, 
			};
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
			newInventory[idx] = { 
				...newInventory[idx], 
				quantity: newInventory[idx].quantity - quantity, 
			};
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
		await removeItem(itemId, 1);
		// TODO: trigger item effect
	}, [removeItem]);

	return {
		loading,
		error,
		character,
		gameState,
		inventory,
		equipped,
		addItem,
		removeItem,
		equipItem,
		unequipItem,
		useItem,
		refresh,
	};
};