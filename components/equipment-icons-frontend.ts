/**
 * Frontend-only equipment icon mappings
 * This file contains PNG requires and should NEVER be imported by backend code
 * 
 * Icons are loaded via require() statements that will fail on backend.
 * This file should only be imported in frontend components.
 */

import type { ImageSourcePropType } from 'react-native';

/**
 * Load equipment icons (frontend only)
 * This function contains all the require() statements for PNG files
 * 
 * ⚠️ DO NOT IMPORT THIS FILE IN api/ OR ANY BACKEND CODE
 */
/**
 * Get the weapons sprite image (frontend only)
 */
export function getWeaponsSprite(): ImageSourcePropType | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require('@/assets/images/items/weapons-sprite.png');
	} catch {
		return null;
	}
}

export function loadEquipmentIcons(): Record<
	string,
	ImageSourcePropType | string | { spritesheet: string; x: number; y: number } | undefined
> {
	// All require() statements are here - these will fail on backend
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherHelmet = require('@/assets/images/items/leather-helmet.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherHood = require('@/assets/images/items/leather-hood.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const clothHelmet = require('@/assets/images/items/cloth-helmet.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherChest = require('@/assets/images/items/leather-chest.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const clothRobe = require('@/assets/images/items/cloth-robe.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherGlove = require('@/assets/images/items/leather-glove.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const clothGlove = require('@/assets/images/items/cloth-glove.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherLegs = require('@/assets/images/items/leather-legs.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const clothLegs = require('@/assets/images/items/cloth-legs.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const leatherBoots = require('@/assets/images/items/leather-boots.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const clothBoots = require('@/assets/images/items/cloth-boots.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const ironShield = require('@/assets/images/items/iron-shield.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const wizardTome = require('@/assets/images/items/wizard-tome.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const wand = require('@/assets/images/items/wand.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const staff = require('@/assets/images/items/staff.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const quiver = require('@/assets/images/items/quiver.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const rations = require('@/assets/images/items/rations.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const throwingKnives = require('@/assets/images/items/throwing-knives.png');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const healthPotion = require('@/assets/images/items/health-potion.png');

	return {
		// Weapons - Row 1 (y: 0) - from spritesheet
		item_shortsword: { spritesheet: 'equipment', x: 0, y: 0 },
		item_handaxe: { spritesheet: 'equipment', x: 1, y: 0 },
		item_mace: { spritesheet: 'equipment', x: 2, y: 0 },
		item_rusty_mace: { spritesheet: 'equipment', x: 2, y: 0 },
		item_dagger: { spritesheet: 'equipment', x: 3, y: 0 },
		item_dagger_offhand: { spritesheet: 'equipment', x: 3, y: 0 },
		item_rusty_dagger: { spritesheet: 'equipment', x: 3, y: 0 },

		// Weapons - Row 2 (y: 1)
		item_longsword: { spritesheet: 'equipment', x: 0, y: 1 },
		item_greataxe: { spritesheet: 'equipment', x: 1, y: 1 },
		item_scimitar: { spritesheet: 'equipment', x: 2, y: 1 },
		item_rapier: { spritesheet: 'equipment', x: 2, y: 1 },

		// Weapons - Row 3 (y: 2)
		item_unarmed_strike: { spritesheet: 'equipment', x: 0, y: 2 },
		item_staff: { spritesheet: 'equipment', x: 2, y: 2 },

		// Weapons - Row 4 (y: 3)
		item_shortbow: { spritesheet: 'equipment', x: 1, y: 3 },
		item_light_crossbow: { spritesheet: 'equipment', x: 2, y: 3 },

		// Armor - Individual image files
		item_metal_helmet: leatherHelmet,
		item_leather_cap: leatherHood,
		item_cloth_hood: clothHelmet,
		item_chain_coif: leatherHelmet,
		item_goblin_helmet: leatherHelmet,

		item_chainmail: leatherChest,
		item_leather_armor: leatherChest,
		item_robes: clothRobe,
		item_hide_armor: leatherChest,
		item_goblin_armor: leatherChest,

		item_metal_gauntlets: leatherGlove,
		item_leather_bracers: leatherGlove,
		item_cloth_sleeves: clothGlove,
		item_chain_sleeves: leatherGlove,
		item_goblin_bracers: leatherGlove,

		item_metal_greaves: leatherLegs,
		item_leather_leggings: leatherLegs,
		item_cloth_pants: clothLegs,
		item_chain_leggings: leatherLegs,
		item_goblin_leggings: leatherLegs,

		item_metal_boots: leatherBoots,
		item_leather_boots: leatherBoots,
		item_cloth_boots: clothBoots,
		item_chain_boots: leatherBoots,
		item_goblin_boots: leatherBoots,

		// Shields & Off-hand
		item_shield: ironShield,
		item_holy_symbol: wizardTome,
		item_goblin_holy_symbol: wizardTome,
		item_spellbook: wizardTome,
		item_arcane_focus: wand,
		item_druidic_focus: staff,
		item_quiver: quiver,
		item_lute: wizardTome,
		item_tinkers_tools: wizardTome,

		// Accessories
		item_backpack: quiver,
		item_rations: rations,
		item_thieves_tools: throwingKnives,
		item_component_pouch: quiver,
		item_arrows: quiver,
		item_bolts: quiver,
		item_coin_pouch: quiver,
		item_healing_potion: healthPotion,
		item_horn: quiver,
	};
}
