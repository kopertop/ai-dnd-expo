/**
 * Maps item IDs to their corresponding image paths in the public folder
 * Public folder assets are served at the root, so paths start with /
 */

const ITEM_ICON_MAP: Record<string, string> = {
	// Consumables
	item_rations: '/assets/images/items/rations.png',
	item_healing_potion: '/assets/images/items/health-potion.png',

	// Weapons
	item_dagger: '/assets/images/items/dagger.png',
	item_shortsword: '/assets/images/items/short-sword.png',
	item_longsword: '/assets/images/items/short-sword.png', // Using short-sword as placeholder
	item_mace: '/assets/images/items/mace.png',
	item_morningstar: '/assets/images/items/morningstar.png',
	item_staff: '/assets/images/items/staff.png',
	item_wand: '/assets/images/items/wand.png',
	item_shortbow: '/assets/images/items/bow.png',
	item_light_crossbow: '/assets/images/items/bow.png', // Using bow as placeholder

	// Armor - Helmets
	item_metal_helmet: '/assets/images/items/leather-helmet.png',
	item_leather_cap: '/assets/images/items/leather-hood.png',
	item_cloth_hood: '/assets/images/items/cloth-helmet.png',
	item_chain_coif: '/assets/images/items/leather-helmet.png',
	item_goblin_helmet: '/assets/images/items/leather-helmet.png',

	// Armor - Chest
	item_chainmail: '/assets/images/items/leather-chest.png',
	item_leather_armor: '/assets/images/items/leather-chest.png',
	item_robes: '/assets/images/items/cloth-robe.png',
	item_hide_armor: '/assets/images/items/leather-chest.png',
	item_goblin_armor: '/assets/images/items/leather-chest.png',

	// Armor - Arms
	item_metal_gauntlets: '/assets/images/items/leather-glove.png',
	item_leather_bracers: '/assets/images/items/leather-glove.png',
	item_cloth_sleeves: '/assets/images/items/cloth-glove.png',
	item_chain_sleeves: '/assets/images/items/leather-glove.png',
	item_goblin_bracers: '/assets/images/items/leather-glove.png',

	// Armor - Legs
	item_metal_greaves: '/assets/images/items/leather-legs.png',
	item_leather_leggings: '/assets/images/items/leather-legs.png',
	item_cloth_pants: '/assets/images/items/cloth-legs.png',
	item_chain_leggings: '/assets/images/items/leather-legs.png',
	item_goblin_leggings: '/assets/images/items/leather-legs.png',

	// Armor - Boots
	item_metal_boots: '/assets/images/items/leather-boots.png',
	item_leather_boots: '/assets/images/items/leather-boots.png',
	item_cloth_boots: '/assets/images/items/cloth-boots.png',
	item_chain_boots: '/assets/images/items/leather-boots.png',
	item_goblin_boots: '/assets/images/items/leather-boots.png',

	// Shields & Off-hand
	item_shield: '/assets/images/items/iron-shield.png',
	item_holy_symbol: '/assets/images/items/wizard-tome.png',
	item_goblin_holy_symbol: '/assets/images/items/wizard-tome.png',
	item_spellbook: '/assets/images/items/wizard-tome.png',
	item_arcane_focus: '/assets/images/items/wand.png',
	item_druidic_focus: '/assets/images/items/wand.png',

	// Tools & Misc
	item_backpack: '/assets/images/items/quiver.png',
	item_quiver: '/assets/images/items/quiver.png',
	item_thieves_tools: '/assets/images/items/throwing-knives.png',
	item_component_pouch: '/assets/images/items/quiver.png',
	item_arrows: '/assets/images/items/quiver.png',
	item_bolts: '/assets/images/items/quiver.png',
	item_coin_pouch: '/assets/images/items/quiver.png',
	item_horn: '/assets/images/items/quiver.png',
	item_tent: '/assets/images/items/tent.png',
};

/**
 * Get the public asset path for an item by its ID
 * @param itemId - The item ID (e.g., 'item_rations')
 * @returns The public asset path (e.g., '/assets/images/items/rations.png') or null if not found
 */
export function getItemIconPath(itemId: string): string | null {
	return ITEM_ICON_MAP[itemId] || null;
}

/**
 * Extract the base item ID from a full item ID
 * Item IDs are generated as: baseId_timestamp_random
 * Example: "item_rations_1234567890_abc123" -> "item_rations"
 */
function extractBaseItemId(fullId: string): string {
	// Item IDs are in format: baseId_timestamp_random
	// The base ID itself may contain underscores (e.g., "item_rations")
	// So we need to find where the timestamp starts
	// Timestamps are numeric, so we look for the pattern: baseId_number_...
	const match = fullId.match(/^(.+?)_\d+_/);
	if (match && match[1]) {
		return match[1];
	}
	// Fallback: if no timestamp pattern, return as-is (might already be base ID)
	return fullId;
}

/**
 * Try to match item name to an icon path
 * Converts item names like "Rations (10 days)" to "item_rations"
 */
function getItemIdFromName(name: string): string | null {
	const normalized = name.toLowerCase()
		.replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content like "(10 days)"
		.replace(/\s+/g, '_') // Replace spaces with underscores
		.trim();

	// Try with "item_" prefix
	const withPrefix = `item_${normalized}`;
	if (ITEM_ICON_MAP[withPrefix]) {
		return withPrefix;
	}

	// Try without prefix
	if (ITEM_ICON_MAP[normalized]) {
		return normalized;
	}

	return null;
}

/**
 * Get the public asset path for an item, with fallback options
 * @param item - The item object with id, name, and optional icon property
 * @returns The public asset path or null if not found
 */
export function getItemIcon(item: { id: string; name?: string; icon?: any }): string | null {
	// First try the item's icon property if it's a string (URL)
	if (item.icon && typeof item.icon === 'string') {
		// If it's already a full URL or starts with /, use it
		if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
			return item.icon;
		}
	}

	// Try to get icon from public folder mapping by ID
	// Extract base ID to handle timestamps/suffixes
	if (item.id) {
		const baseId = extractBaseItemId(item.id);
		const publicPath = getItemIconPath(baseId);
		if (publicPath) {
			return publicPath;
		}
	}

	// Fallback: try to match by item name
	if (item.name) {
		const matchedId = getItemIdFromName(item.name);
		if (matchedId) {
			const publicPath = getItemIconPath(matchedId);
			if (publicPath) {
				return publicPath;
			}
		}
	}

	return null;
}
