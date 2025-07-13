/**
 * Inventory Management Hook
 * Handles item storage, equipment, and currency for characters
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { 
	Inventory, 
	InventorySlot, 
	AnyItem, 
	EquipmentLoadout,
	EquipmentSlot,
} from '@/types/inventory';

const INVENTORY_STORAGE_KEY = 'ai-dnd-inventory';
const EQUIPMENT_STORAGE_KEY = 'ai-dnd-equipment';

export interface InventoryManagerState {
	inventories: Map<string, Inventory>; // characterId -> inventory
	equipment: Map<string, EquipmentLoadout>; // characterId -> equipment
	isLoading: boolean;
	error: string | null;
}

export interface InventoryManager extends InventoryManagerState {
	// Inventory management
	getInventory: (characterId: string) => Inventory | undefined;
	createInventory: (characterId: string, capacity?: { weight: number; slots: number }) => Promise<Inventory>;
	
	// Item operations
	addItem: (characterId: string, item: AnyItem, quantity?: number) => Promise<boolean>;
	removeItem: (characterId: string, itemId: string, quantity?: number) => Promise<boolean>;
	moveItem: (characterId: string, fromSlot: number, toSlot: number) => Promise<boolean>;
	
	// Equipment operations
	equipItem: (characterId: string, item: AnyItem, slot: EquipmentSlot) => Promise<boolean>;
	unequipItem: (characterId: string, slot: EquipmentSlot) => Promise<AnyItem | null>;
	getEquipment: (characterId: string) => EquipmentLoadout | undefined;
	
	// Currency operations
	addCurrency: (characterId: string, type: keyof Inventory['currency'], amount: number) => Promise<void>;
	removeCurrency: (characterId: string, type: keyof Inventory['currency'], amount: number) => Promise<boolean>;
	getCurrency: (characterId: string) => Inventory['currency'];
	
	// Utility
	getInventoryWeight: (characterId: string) => number;
	getAvailableSlots: (characterId: string) => number;
	saveAll: () => Promise<void>;
	loadAll: () => Promise<void>;
}

/**
 * Custom hook for managing inventories and equipment
 */
export function useInventory(): InventoryManager {
	const [state, setState] = useState<InventoryManagerState>({
		inventories: new Map(),
		equipment: new Map(),
		isLoading: true,
		error: null,
	});

	/**
	 * Save all inventories and equipment to storage
	 */
	const saveAll = useCallback(async () => {
		try {
			const inventoriesData = Array.from(state.inventories.entries());
			const equipmentData = Array.from(state.equipment.entries());
			
			await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventoriesData));
			await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(equipmentData));
		} catch (error) {
			console.error('Failed to save inventory data:', error);
			setState(prev => ({ ...prev, error: 'Failed to save inventory data' }));
		}
	}, [state.inventories, state.equipment]);

	/**
	 * Load all inventories and equipment from storage
	 */
	const loadAll = useCallback(async () => {
		try {
			setState(prev => ({ ...prev, isLoading: true, error: null }));
			
			const inventoriesData = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
			const equipmentData = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
			
			const inventories = new Map();
			const equipment = new Map();
			
			if (inventoriesData) {
				const parsedInventories = JSON.parse(inventoriesData);
				for (const [characterId, inventory] of parsedInventories) {
					inventories.set(characterId, inventory);
				}
			}
			
			if (equipmentData) {
				const parsedEquipment = JSON.parse(equipmentData);
				for (const [characterId, equipmentLoadout] of parsedEquipment) {
					equipment.set(characterId, equipmentLoadout);
				}
			}
			
			setState(prev => ({
				...prev,
				inventories,
				equipment,
				isLoading: false,
			}));
		} catch (error) {
			console.error('Failed to load inventory data:', error);
			setState(prev => ({ 
				...prev, 
				error: 'Failed to load inventory data', 
				isLoading: false 
			}));
		}
	}, []);

	/**
	 * Get inventory for a character
	 */
	const getInventory = useCallback((characterId: string): Inventory | undefined => {
		return state.inventories.get(characterId);
	}, [state.inventories]);

	/**
	 * Create a new inventory for a character
	 */
	const createInventory = useCallback(async (
		characterId: string, 
		capacity = { weight: 150, slots: 30 }
	): Promise<Inventory> => {
		const newInventory: Inventory = {
			id: `inv_${characterId}_${Date.now()}`,
			ownerId: characterId,
			slots: Array.from({ length: capacity.slots }, (_, index) => ({
				item: null,
				quantity: 0,
				position: { x: index % 6, y: Math.floor(index / 6) },
			})),
			capacity,
			currency: {
				copper: 100,
				silver: 50,
				electrum: 0,
				gold: 25,
				platinum: 0,
			},
		};

		setState(prev => ({
			...prev,
			inventories: new Map(prev.inventories).set(characterId, newInventory),
		}));

		await saveAll();
		return newInventory;
	}, [saveAll]);

	/**
	 * Add item to inventory
	 */
	const addItem = useCallback(async (
		characterId: string, 
		item: AnyItem, 
		quantity = 1
	): Promise<boolean> => {
		const inventory = getInventory(characterId);
		if (!inventory) return false;

		// Find empty slot or stackable slot
		const emptySlotIndex = inventory.slots.findIndex(slot => slot.item === null);
		if (emptySlotIndex === -1) {
			setState(prev => ({ ...prev, error: 'Inventory is full' }));
			return false;
		}

		const newSlots = [...inventory.slots];
		newSlots[emptySlotIndex] = {
			...newSlots[emptySlotIndex],
			item,
			quantity,
		};

		const updatedInventory = {
			...inventory,
			slots: newSlots,
		};

		setState(prev => ({
			...prev,
			inventories: new Map(prev.inventories).set(characterId, updatedInventory),
		}));

		await saveAll();
		return true;
	}, [getInventory, saveAll]);

	/**
	 * Remove item from inventory
	 */
	const removeItem = useCallback(async (
		characterId: string, 
		itemId: string, 
		quantity = 1
	): Promise<boolean> => {
		const inventory = getInventory(characterId);
		if (!inventory) return false;

		const slotIndex = inventory.slots.findIndex(slot => slot.item?.id === itemId);
		if (slotIndex === -1) return false;

		const slot = inventory.slots[slotIndex];
		const newSlots = [...inventory.slots];

		if (slot.quantity <= quantity) {
			// Remove entire stack
			newSlots[slotIndex] = {
				...slot,
				item: null,
				quantity: 0,
			};
		} else {
			// Reduce quantity
			newSlots[slotIndex] = {
				...slot,
				quantity: slot.quantity - quantity,
			};
		}

		const updatedInventory = {
			...inventory,
			slots: newSlots,
		};

		setState(prev => ({
			...prev,
			inventories: new Map(prev.inventories).set(characterId, updatedInventory),
		}));

		await saveAll();
		return true;
	}, [getInventory, saveAll]);

	/**
	 * Get equipment loadout for a character
	 */
	const getEquipment = useCallback((characterId: string): EquipmentLoadout | undefined => {
		return state.equipment.get(characterId);
	}, [state.equipment]);

	/**
	 * Equip an item
	 */
	const equipItem = useCallback(async (
		characterId: string, 
		item: AnyItem, 
		slot: EquipmentSlot
	): Promise<boolean> => {
		let equipment = getEquipment(characterId);
		
		if (!equipment) {
			equipment = {
				characterId,
				slots: {},
			};
		}

		const newEquipment = {
			...equipment,
			slots: {
				...equipment.slots,
				[slot]: item,
			},
		};

		setState(prev => ({
			...prev,
			equipment: new Map(prev.equipment).set(characterId, newEquipment),
		}));

		await saveAll();
		return true;
	}, [getEquipment, saveAll]);

	/**
	 * Unequip an item
	 */
	const unequipItem = useCallback(async (
		characterId: string, 
		slot: EquipmentSlot
	): Promise<AnyItem | null> => {
		const equipment = getEquipment(characterId);
		if (!equipment || !equipment.slots[slot]) return null;

		const item = equipment.slots[slot]!;
		const newSlots = { ...equipment.slots };
		delete newSlots[slot];

		const newEquipment = {
			...equipment,
			slots: newSlots,
		};

		setState(prev => ({
			...prev,
			equipment: new Map(prev.equipment).set(characterId, newEquipment),
		}));

		await saveAll();
		return item;
	}, [getEquipment, saveAll]);

	/**
	 * Add currency
	 */
	const addCurrency = useCallback(async (
		characterId: string, 
		type: keyof Inventory['currency'], 
		amount: number
	): Promise<void> => {
		const inventory = getInventory(characterId);
		if (!inventory) return;

		const updatedInventory = {
			...inventory,
			currency: {
				...inventory.currency,
				[type]: inventory.currency[type] + amount,
			},
		};

		setState(prev => ({
			...prev,
			inventories: new Map(prev.inventories).set(characterId, updatedInventory),
		}));

		await saveAll();
	}, [getInventory, saveAll]);

	/**
	 * Remove currency
	 */
	const removeCurrency = useCallback(async (
		characterId: string, 
		type: keyof Inventory['currency'], 
		amount: number
	): Promise<boolean> => {
		const inventory = getInventory(characterId);
		if (!inventory || inventory.currency[type] < amount) return false;

		const updatedInventory = {
			...inventory,
			currency: {
				...inventory.currency,
				[type]: inventory.currency[type] - amount,
			},
		};

		setState(prev => ({
			...prev,
			inventories: new Map(prev.inventories).set(characterId, updatedInventory),
		}));

		await saveAll();
		return true;
	}, [getInventory, saveAll]);

	/**
	 * Get currency for a character
	 */
	const getCurrency = useCallback((characterId: string): Inventory['currency'] => {
		const inventory = getInventory(characterId);
		return inventory?.currency || {
			copper: 0,
			silver: 0,
			electrum: 0,
			gold: 0,
			platinum: 0,
		};
	}, [getInventory]);

	/**
	 * Calculate inventory weight
	 */
	const getInventoryWeight = useCallback((characterId: string): number => {
		const inventory = getInventory(characterId);
		if (!inventory) return 0;

		return inventory.slots.reduce((total, slot) => {
			if (slot.item) {
				return total + (slot.item.weight * slot.quantity);
			}
			return total;
		}, 0);
	}, [getInventory]);

	/**
	 * Get available inventory slots
	 */
	const getAvailableSlots = useCallback((characterId: string): number => {
		const inventory = getInventory(characterId);
		if (!inventory) return 0;

		return inventory.slots.filter(slot => slot.item === null).length;
	}, [getInventory]);

	/**
	 * Move item placeholder (not implemented)
	 */
	const moveItem = useCallback(async (
		characterId: string, 
		fromSlot: number, 
		toSlot: number
	): Promise<boolean> => {
		// TODO: Implement item moving logic
		console.log('Move item not yet implemented');
		return false;
	}, []);

	/**
	 * Load data on mount
	 */
	useEffect(() => {
		loadAll();
	}, [loadAll]);

	/**
	 * Auto-save when data changes
	 */
	useEffect(() => {
		if (!state.isLoading) {
			saveAll();
		}
	}, [state.inventories, state.equipment, state.isLoading, saveAll]);

	return {
		...state,
		getInventory,
		createInventory,
		addItem,
		removeItem,
		moveItem,
		equipItem,
		unequipItem,
		getEquipment,
		addCurrency,
		removeCurrency,
		getCurrency,
		getInventoryWeight,
		getAvailableSlots,
		saveAll,
		loadAll,
	};
}