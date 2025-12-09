/**
 * Equipment Spritesheet Configuration
 *
 * ⚠️ FRONTEND ONLY - This file should NEVER be imported by backend code.
 * Backend code should use utils/starting-equipment.ts which doesn't include icons.
 *
 * To use a spritesheet for equipment icons:
 * 1. Add your spritesheet image to the assets folder
 * 2. Update the EQUIPMENT_SPRITESHEET config below with your spritesheet details
 * 3. Map equipment items to their coordinates in the spritesheet
 */

import type { ImageSourcePropType } from 'react-native';

import type { SpriteSheetConfig } from '@/utils/spritesheet';

// Weapons spritesheet configuration
// 4x4 grid of weapon icons (16 weapons total)
// Spritesheet is loaded from frontend-only file to avoid backend bundling issues
export function getEquipmentSpritesheet(): SpriteSheetConfig | null {
	// Only load on frontend
	if (typeof window === 'undefined' && typeof global === 'undefined') {
		return null;
	}

	try {
		// Lazy import the frontend-only file that contains the require()
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
		const iconLoader = require('./equipment-icons-frontend');
		const weaponsSprite = iconLoader.getWeaponsSprite();
		if (!weaponsSprite) {
			return null;
		}
		return {
			source: weaponsSprite,
			tileWidth: 128, // Adjust based on your actual sprite size
			tileHeight: 128, // Adjust based on your actual sprite size
			columns: 4,
			rows: 4,
		};
	} catch (e) {
		return null;
	}
}

// Lazy-loaded spritesheet (only initialized on frontend)
let _equipmentSpritesheet: SpriteSheetConfig | null = null;
export const EQUIPMENT_SPRITESHEET = (): SpriteSheetConfig | null => {
	if (!_equipmentSpritesheet) {
		_equipmentSpritesheet = getEquipmentSpritesheet();
	}
	return _equipmentSpritesheet;
};

/**
 * Equipment icon mappings
 * Maps equipment item IDs to spritesheet coordinates (x, y) or direct image sources
 *
 * ⚠️ FRONTEND ONLY - Icons are loaded via a function to avoid backend import issues
 */
let _equipmentIcons: Record<string, ImageSourcePropType | string | { spritesheet: string; x: number; y: number } | undefined> | null = null;

export function getEquipmentIcons(): typeof _equipmentIcons {
	if (_equipmentIcons) {
		return _equipmentIcons;
	}

	// Only load icons on frontend
	if (typeof window === 'undefined' && typeof global === 'undefined') {
		return {};
	}

	// Lazy import the frontend-only icon loader using dynamic import
	// This prevents the bundler from processing the file on backend
	try {
		// Lazy import the frontend-only icon loader (moved to components/ to avoid backend bundling)
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
		const iconLoader = require('./equipment-icons-frontend');
		_equipmentIcons = iconLoader.loadEquipmentIcons();
		return _equipmentIcons;
	} catch (e) {
		// If import fails (backend context), return empty object
		return {};
	}
}

// EQUIPMENT_ICONS is lazy-loaded via getEquipmentIcons() function
// Do NOT initialize at module level to avoid backend bundling issues

/**
 * Get icon for an equipment item (frontend only)
 * Returns undefined if called on backend
 */
export function getEquipmentIcon(
	itemId: string,
): ImageSourcePropType | string | { spritesheet: string; x: number; y: number } | undefined {
	const icons = getEquipmentIcons();
	return icons?.[itemId];
}
