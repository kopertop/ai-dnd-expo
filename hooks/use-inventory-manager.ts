import { useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

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

	// Check if an item is equipped
	const isItemEquipped = useCallback((itemId: string): boolean => {
		if (!character?.equipped) return false;
		return Object.values(character.equipped).includes(itemId);
	}, [character]);

	// Get equipped slot for an item
	const getEquippedSlot = useCallback((itemId: string): GearSlot | null => {
		if (!character?.equipped) return null;
		for (const [slot, equippedItemId] of Object.entries(character.equipped)) {
			if (equippedItemId === itemId) return slot as GearSlot;
		}
		return null;
	}, [character]);

	// Memoized inventory with equipped status and sorting for performance
	const inventory = useMemo(() => {
		return (character?.inventory || [])
			.map(entry => {
				const item = ITEM_LIST.find(i => i.id === entry.itemId)!;
				const isEquipped = isItemEquipped(entry.itemId);
				const equippedSlot = getEquippedSlot(entry.itemId);
				return {
					...entry,
					item,
					isEquipped,
					equippedSlot,
				};
			})
			.sort((a, b) => {
				// Sort equipped items first, then by item name
				if (a.isEquipped && !b.isEquipped) return -1;
				if (!a.isEquipped && b.isEquipped) return 1;
				return a.item.name.localeCompare(b.item.name);
			});
	}, [character?.inventory, isItemEquipped, getEquippedSlot]);

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

	// Add global window commands for web development (console commands)
	useEffect(() => {
		if (Platform.OS === 'web' && typeof window !== 'undefined') {
			// Add global command to add inventory items
			(window as any).addInventoryItem = async (itemId: string, quantity = 1) => {
				try {
					const item = ITEM_LIST.find(i => i.id === itemId);
					if (!item) {
						console.error(`❌ Item "${itemId}" not found. Available items:`, ITEM_LIST.map(i => i.id));
						return;
					}
					await addItem(itemId, quantity);
				} catch (error) {
					console.error('❌ Failed to add item:', error);
				}
			};

			// Add global command to equip items
			(window as any).equipInventoryItem = async (itemId: string) => {
				try {
					const item = ITEM_LIST.find(i => i.id === itemId);
					if (!item) {
						console.error(`❌ Item "${itemId}" not found. Available items:`, ITEM_LIST.map(i => i.id));
						return;
					}
					if (item.slot === 'none') {
						console.error(`❌ Item "${item.name}" cannot be equipped (slot: none)`);
						return;
					}
					await equipItem(itemId);
					console.log(`✅ Equipped ${item.name} to ${item.slot}`);
				} catch (error) {
					console.error('❌ Failed to equip item:', error);
				}
			};

			// Add global command to list all available items
			(window as any).listItems = () => {
				console.log('📦 Available items:');
				ITEM_LIST.forEach(item => {
					console.log(`  ${item.id}: ${item.name} (slot: ${item.slot})`);
				});
			};

			// Add global command to show current inventory
			(window as any).showInventory = () => {
				console.log('🎒 Current inventory:');
				if (inventory.length === 0) {
					console.log('  (empty)');
					return;
				}
				inventory.forEach(entry => {
					const equipped = entry.isEquipped ? ' ⚡EQUIPPED' : '';
					console.log(`  ${entry.quantity}x ${entry.item.name}${equipped}`);
				});
			};

			// Add helpful command list
			(window as any).inventoryHelp = () => {
				console.log('🔧 Inventory Console Commands:');
				console.log('  addInventoryItem(itemId, quantity) - Add items to inventory');
				console.log('  equipInventoryItem(itemId) - Equip an item');
				console.log('  listItems() - Show all available items');
				console.log('  showInventory() - Show current inventory');
				console.log('  inventoryHelp() - Show this help');
				console.log('');
				console.log('Example: addInventoryItem("sword", 1)');
			};

			console.log('🔧 Inventory console commands loaded! Type inventoryHelp() for commands.');

			// Cleanup function to remove global commands
			return () => {
				if (typeof window !== 'undefined') {
					delete (window as any).addInventoryItem;
					delete (window as any).equipInventoryItem;
					delete (window as any).listItems;
					delete (window as any).showInventory;
					delete (window as any).inventoryHelp;
				}
			};
		}
	}, [addItem, equipItem, inventory]);

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
		isItemEquipped,
		getEquippedSlot,
	};
};