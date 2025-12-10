import {
	getNPCStartingEquipmentConfig,
	getStartingEquipmentConfig,
	type StartingEquipmentConfig,
} from '@/constants/starting-equipment';
import type { Character } from '@/types/character';
import type { GearSlot } from '@/types/stats';

/**
 * Generate a unique item ID
 */
function generateItemId(itemBaseId: string): string {
	return `${itemBaseId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert starting equipment config to actual items with unique IDs
 * Note: Icons are NOT added here to avoid backend import issues.
 * Icons should be added on the frontend using addIconsToInventoryItems()
 */
function configToItems(config: StartingEquipmentConfig): {
	inventory: any[];
	equipped: Record<GearSlot, string | null>;
} {
	const inventory: any[] = [];
	const equipped: Record<GearSlot, string | null> = {
		helmet: null,
		chest: null,
		arms: null,
		legs: null,
		boots: null,
		mainHand: null,
		offHand: null,
		accessory: null,
		none: null,
	};

	// Process equipped items
	const slots: (keyof StartingEquipmentConfig)[] = [
		'helmet',
		'chest',
		'arms',
		'legs',
		'boots',
		'mainHand',
		'offHand',
		'accessory',
	];

	for (const slot of slots) {
		const item = config[slot];
		if (item && !Array.isArray(item)) {
			const itemId = generateItemId(item.id);
			const fullItem: any = {
				id: itemId,
				name: item.name,
				type: item.type,
				slot: item.slot,
				...(item.metadata || {}),
			};
			// Icons are NOT added here - they're added on the frontend
			inventory.push(fullItem);
			equipped[item.slot] = itemId;
		}
	}

	// Process inventory items
	if (config.inventory) {
		for (const item of config.inventory) {
			const itemId = generateItemId(item.id);
			const fullItem: any = {
				id: itemId,
				name: item.name,
				type: item.type,
				slot: item.slot,
				...(item.metadata || {}),
			};
			// Icons are NOT added here - they're added on the frontend
			inventory.push(fullItem);
		}
	}

	return { inventory, equipped };
}

/**
 * Generate starting equipment for a character based on class and race
 */
export function generateStartingEquipment(
	classId: string,
	raceId: string,
): {
	inventory: any[];
	equipped: Record<GearSlot, string | null>;
} {
	const config = getStartingEquipmentConfig(classId, raceId);
	return configToItems(config);
}

/**
 * Generate starting equipment for an NPC
 */
export function generateNPCStartingEquipment(npcSlug: string): {
	inventory: any[];
	equipped: Record<GearSlot, string | null>;
} | null {
	const config = getNPCStartingEquipmentConfig(npcSlug);
	if (!config) {
		return null;
	}
	return configToItems(config);
}

/**
 * Add starting equipment to a character
 * This merges with existing inventory and equipped items
 */
export function addStartingEquipmentToCharacter(
	character: Character,
	classId: string,
	raceId: string,
): Character {
	const { inventory: newInventory, equipped: newEquipped } = generateStartingEquipment(
		classId,
		raceId,
	);

	// Merge inventories (avoid duplicates by ID base)
	const existingInventory = character.inventory || [];
	const existingInventoryIds = new Set(
		existingInventory.map((item: any) => item.id?.split('_')[0] || item.id),
	);

	// Only add items that don't already exist
	const itemsToAdd = newInventory.filter((item: any) => {
		const baseId = item.id?.split('_')[0] || item.id;
		return !existingInventoryIds.has(baseId);
	});

	// Merge equipped items (only set if slot is empty)
	const mergedEquipped = { ...character.equipped };
	for (const [slot, itemId] of Object.entries(newEquipped)) {
		if (itemId && !mergedEquipped[slot as GearSlot]) {
			mergedEquipped[slot as GearSlot] = itemId;
		}
	}

	return {
		...character,
		inventory: [...existingInventory, ...itemsToAdd],
		equipped: mergedEquipped,
	};
}

/**
 * Check if a character needs starting equipment
 * Returns true if character is level 1 and has no equipment
 */
export function needsStartingEquipment(character: Character): boolean {
	if (character.level !== 1) {
		return false;
	}

	const hasEquippedItems = Object.values(character.equipped || {}).some(
		itemId => itemId !== null && itemId !== undefined,
	);
	const hasInventoryItems = (character.inventory || []).length > 0;

	return !hasEquippedItems && !hasInventoryItems;
}

