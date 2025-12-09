/**
 * Frontend-only utility to add icons to equipment items
 * This is separated from the backend code to avoid PNG import issues
 */

import type { StartingEquipmentItem } from '@/constants/starting-equipment';

/**
 * Add icon to an equipment item (frontend only)
 */
export function addIconToItem(item: StartingEquipmentItem): StartingEquipmentItem {
	// Lazy import to avoid backend bundling issues
	if (typeof window === 'undefined' && typeof global === 'undefined') {
		return item;
	}

	try {
		// Dynamic import only on frontend - use function import to avoid bundling
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const equipmentSpritesheet = require('@/components/equipment-spritesheet');
		const icon = equipmentSpritesheet.getEquipmentIcon(item.id);
		return icon ? { ...item, icon } : item;
	} catch {
		return item;
	}
}

/**
 * Add icons to all items in a starting equipment config (frontend only)
 */
export function addIconsToEquipmentConfig(config: {
	helmet?: StartingEquipmentItem;
	chest?: StartingEquipmentItem;
	arms?: StartingEquipmentItem;
	legs?: StartingEquipmentItem;
	boots?: StartingEquipmentItem;
	mainHand?: StartingEquipmentItem;
	offHand?: StartingEquipmentItem;
	accessory?: StartingEquipmentItem;
	inventory?: StartingEquipmentItem[];
}): typeof config {
	return {
		...config,
		helmet: config.helmet ? addIconToItem(config.helmet) : undefined,
		chest: config.chest ? addIconToItem(config.chest) : undefined,
		arms: config.arms ? addIconToItem(config.arms) : undefined,
		legs: config.legs ? addIconToItem(config.legs) : undefined,
		boots: config.boots ? addIconToItem(config.boots) : undefined,
		mainHand: config.mainHand ? addIconToItem(config.mainHand) : undefined,
		offHand: config.offHand ? addIconToItem(config.offHand) : undefined,
		accessory: config.accessory ? addIconToItem(config.accessory) : undefined,
		inventory: config.inventory?.map(item => addIconToItem(item)),
	};
}

/**
 * Add icons to equipment items in inventory (frontend only)
 */
export function addIconsToInventoryItems(items: any[]): any[] {
	if (typeof window === 'undefined' && typeof global === 'undefined') {
		// Backend - don't add icons
		return items;
	}

	// Frontend - add icons (lazy import to avoid backend bundling)
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const equipmentSpritesheet = require('@/components/equipment-spritesheet');
		return items.map(item => {
			const icon = equipmentSpritesheet.getEquipmentIcon(item.id);
			return icon ? { ...item, icon } : item;
		});
	} catch {
		// If import fails (backend context), return items as-is
		return items;
	}
}

