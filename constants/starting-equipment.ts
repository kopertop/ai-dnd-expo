import type { ImageSourcePropType } from 'react-native';

import type { GearSlot } from '@/types/stats';

export interface StartingEquipmentItem {
	id: string;
	name: string;
	type: string;
	slot: GearSlot;
	icon?: ImageSourcePropType | string | { spritesheet: string; x: number; y: number };
	metadata?: Record<string, unknown>;
}

export interface StartingEquipmentConfig {
	helmet?: StartingEquipmentItem;
	chest?: StartingEquipmentItem;
	arms?: StartingEquipmentItem;
	legs?: StartingEquipmentItem;
	boots?: StartingEquipmentItem;
	mainHand?: StartingEquipmentItem;
	offHand?: StartingEquipmentItem;
	accessory?: StartingEquipmentItem;
	inventory?: StartingEquipmentItem[]; // Additional items that go to inventory but aren't equipped
}

// Helper to add icon to equipment item (frontend only)
// Icons are added on the frontend to avoid backend import issues with PNG files
const addIconToItem = (item: StartingEquipmentItem): StartingEquipmentItem => {
	// Icons will be added on the frontend when needed
	// This function is kept for future frontend-only icon assignment
	return item;
};

// Race-based weapon preferences
const getWeaponByRace = (raceId: string, defaultWeapon: StartingEquipmentItem): StartingEquipmentItem => {
	const raceWeapons: Record<string, StartingEquipmentItem> = {
		dwarf: {
			id: 'item_mace',
			name: 'Mace',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'bludgeoning' },
		},
		elf: {
			id: 'item_longsword',
			name: 'Longsword',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d8', damageType: 'slashing' },
		},
		halfling: {
			id: 'item_shortsword',
			name: 'Shortsword',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'piercing' },
		},
		gnome: {
			id: 'item_shortsword',
			name: 'Shortsword',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'piercing' },
		},
	};

	return raceWeapons[raceId] || defaultWeapon;
};

// Class-based starting equipment configurations
const CLASS_STARTING_EQUIPMENT: Record<string, (raceId: string) => StartingEquipmentConfig> = {
	fighter: (raceId: string) => {
		const weapon = getWeaponByRace(raceId, {
			id: 'item_longsword',
			name: 'Longsword',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d8', damageType: 'slashing' },
		});

		return {
			helmet: {
				id: 'item_metal_helmet',
				name: 'Metal Helmet',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 1 },
			},
			chest: {
				id: 'item_chainmail',
				name: 'Chainmail',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 3 },
			},
			arms: {
				id: 'item_metal_gauntlets',
				name: 'Metal Gauntlets',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 1 },
			},
			legs: {
				id: 'item_metal_greaves',
				name: 'Metal Greaves',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 1 },
			},
			boots: {
				id: 'item_metal_boots',
				name: 'Metal Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 1 },
			},
			mainHand: weapon,
			offHand: {
				id: 'item_shield',
				name: 'Shield',
				type: 'armor',
				slot: 'offHand',
				metadata: { armorClass: 2 },
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	rogue: (raceId: string) => {
		const weapon = getWeaponByRace(raceId, {
			id: 'item_dagger',
			name: 'Dagger',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d4', damageType: 'piercing' },
		});

		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_leather_armor',
				name: 'Leather Armor',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 1 },
			},
			arms: {
				id: 'item_leather_bracers',
				name: 'Leather Bracers',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_leather_leggings',
				name: 'Leather Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_leather_boots',
				name: 'Leather Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: weapon,
			offHand: {
				id: 'item_dagger_offhand',
				name: 'Dagger',
				type: 'weapon',
				slot: 'offHand',
				metadata: { damage: '1d4', damageType: 'piercing' },
			},
			inventory: [
				{
					id: 'item_thieves_tools',
					name: "Thieves' Tools",
					type: 'tool',
					slot: 'none',
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	wizard: (raceId: string) => {
		return {
			helmet: {
				id: 'item_cloth_hood',
				name: 'Cloth Hood',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_robes',
				name: 'Robes',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 0 },
			},
			arms: {
				id: 'item_cloth_sleeves',
				name: 'Cloth Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_cloth_pants',
				name: 'Cloth Pants',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_cloth_boots',
				name: 'Cloth Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_staff',
				name: 'Staff',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d6', damageType: 'bludgeoning' },
			},
			offHand: {
				id: 'item_spellbook',
				name: 'Spellbook',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_component_pouch',
					name: 'Component Pouch',
					type: 'tool',
					slot: 'none',
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	cleric: (raceId: string) => {
		const weapon = getWeaponByRace(raceId, {
			id: 'item_mace',
			name: 'Mace',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'bludgeoning' },
		});

		return {
			helmet: {
				id: 'item_chain_coif',
				name: 'Chain Coif',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 1 },
			},
			chest: {
				id: 'item_chainmail',
				name: 'Chainmail',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 3 },
			},
			arms: {
				id: 'item_chain_sleeves',
				name: 'Chain Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 1 },
			},
			legs: {
				id: 'item_chain_leggings',
				name: 'Chain Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 1 },
			},
			boots: {
				id: 'item_chain_boots',
				name: 'Chain Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 1 },
			},
			mainHand: weapon,
			offHand: {
				id: 'item_holy_symbol',
				name: 'Holy Symbol',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_shield',
					name: 'Shield',
					type: 'armor',
					slot: 'none',
					metadata: { armorClass: 2 },
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	ranger: (raceId: string) => {
		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_leather_armor',
				name: 'Leather Armor',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 1 },
			},
			arms: {
				id: 'item_leather_bracers',
				name: 'Leather Bracers',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_leather_leggings',
				name: 'Leather Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_leather_boots',
				name: 'Leather Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_shortbow',
				name: 'Shortbow',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d6', damageType: 'piercing', range: '80/320' },
			},
			offHand: {
				id: 'item_quiver',
				name: 'Quiver',
				type: 'container',
				slot: 'offHand',
				metadata: { capacity: 20 },
			},
			inventory: [
				{
					id: 'item_arrows',
					name: 'Arrows (20)',
					type: 'ammunition',
					slot: 'none',
					metadata: { quantity: 20 },
				},
				{
					id: 'item_scimitar',
					name: 'Scimitar',
					type: 'weapon',
					slot: 'none',
					metadata: { damage: '1d6', damageType: 'slashing' },
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	paladin: (raceId: string) => {
		const weapon = getWeaponByRace(raceId, {
			id: 'item_longsword',
			name: 'Longsword',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d8', damageType: 'slashing' },
		});

		return {
			helmet: {
				id: 'item_metal_helmet',
				name: 'Metal Helmet',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 1 },
			},
			chest: {
				id: 'item_chainmail',
				name: 'Chainmail',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 3 },
			},
			arms: {
				id: 'item_metal_gauntlets',
				name: 'Metal Gauntlets',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 1 },
			},
			legs: {
				id: 'item_metal_greaves',
				name: 'Metal Greaves',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 1 },
			},
			boots: {
				id: 'item_metal_boots',
				name: 'Metal Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 1 },
			},
			mainHand: weapon,
			offHand: {
				id: 'item_shield',
				name: 'Shield',
				type: 'armor',
				slot: 'offHand',
				metadata: { armorClass: 2 },
			},
			accessory: {
				id: 'item_holy_symbol',
				name: 'Holy Symbol',
				type: 'tool',
				slot: 'accessory',
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	warlock: (raceId: string) => {
		return {
			helmet: {
				id: 'item_cloth_hood',
				name: 'Cloth Hood',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_robes',
				name: 'Robes',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 0 },
			},
			arms: {
				id: 'item_cloth_sleeves',
				name: 'Cloth Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_cloth_pants',
				name: 'Cloth Pants',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_cloth_boots',
				name: 'Cloth Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_light_crossbow',
				name: 'Light Crossbow',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d8', damageType: 'piercing', range: '80/320' },
			},
			offHand: {
				id: 'item_arcane_focus',
				name: 'Arcane Focus',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_bolts',
					name: 'Bolts (20)',
					type: 'ammunition',
					slot: 'none',
					metadata: { quantity: 20 },
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	barbarian: (raceId: string) => {
		const weapon = getWeaponByRace(raceId, {
			id: 'item_greataxe',
			name: 'Greataxe',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d12', damageType: 'slashing' },
		});

		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_hide_armor',
				name: 'Hide Armor',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 2 },
			},
			arms: {
				id: 'item_leather_bracers',
				name: 'Leather Bracers',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_leather_leggings',
				name: 'Leather Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_leather_boots',
				name: 'Leather Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: weapon,
			offHand: {
				id: 'item_handaxe',
				name: 'Handaxe',
				type: 'weapon',
				slot: 'offHand',
				metadata: { damage: '1d6', damageType: 'slashing' },
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	bard: (raceId: string) => {
		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_leather_armor',
				name: 'Leather Armor',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 1 },
			},
			arms: {
				id: 'item_leather_bracers',
				name: 'Leather Bracers',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_leather_leggings',
				name: 'Leather Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_leather_boots',
				name: 'Leather Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_rapier',
				name: 'Rapier',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d8', damageType: 'piercing' },
			},
			offHand: {
				id: 'item_lute',
				name: 'Lute',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	sorcerer: (raceId: string) => {
		return {
			helmet: {
				id: 'item_cloth_hood',
				name: 'Cloth Hood',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_robes',
				name: 'Robes',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 0 },
			},
			arms: {
				id: 'item_cloth_sleeves',
				name: 'Cloth Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_cloth_pants',
				name: 'Cloth Pants',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_cloth_boots',
				name: 'Cloth Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_dagger',
				name: 'Dagger',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d4', damageType: 'piercing' },
			},
			offHand: {
				id: 'item_arcane_focus',
				name: 'Arcane Focus',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	druid: (raceId: string) => {
		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_hide_armor',
				name: 'Hide Armor',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 2 },
			},
			arms: {
				id: 'item_leather_bracers',
				name: 'Leather Bracers',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_leather_leggings',
				name: 'Leather Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_leather_boots',
				name: 'Leather Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_scimitar',
				name: 'Scimitar',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d6', damageType: 'slashing' },
			},
			offHand: {
				id: 'item_druidic_focus',
				name: 'Druidic Focus',
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_shield',
					name: 'Shield',
					type: 'armor',
					slot: 'none',
					metadata: { armorClass: 2 },
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	monk: (raceId: string) => {
		return {
			helmet: {
				id: 'item_cloth_hood',
				name: 'Cloth Hood',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_robes',
				name: 'Robes',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 0 },
			},
			arms: {
				id: 'item_cloth_sleeves',
				name: 'Cloth Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_cloth_pants',
				name: 'Cloth Pants',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_cloth_boots',
				name: 'Cloth Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_shortsword',
				name: 'Shortsword',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d6', damageType: 'piercing' },
			},
			offHand: {
				id: 'item_unarmed_strike',
				name: 'Unarmed Strike',
				type: 'weapon',
				slot: 'offHand',
				metadata: { damage: '1d4', damageType: 'bludgeoning' },
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	artificer: (raceId: string) => {
		return {
			helmet: {
				id: 'item_leather_cap',
				name: 'Leather Cap',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_chainmail',
				name: 'Chainmail',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 3 },
			},
			arms: {
				id: 'item_chain_sleeves',
				name: 'Chain Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 1 },
			},
			legs: {
				id: 'item_chain_leggings',
				name: 'Chain Leggings',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 1 },
			},
			boots: {
				id: 'item_chain_boots',
				name: 'Chain Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 1 },
			},
			mainHand: {
				id: 'item_light_crossbow',
				name: 'Light Crossbow',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d8', damageType: 'piercing', range: '80/320' },
			},
			offHand: {
				id: 'item_tinkers_tools',
				name: "Tinker's Tools",
				type: 'tool',
				slot: 'offHand',
			},
			inventory: [
				{
					id: 'item_bolts',
					name: 'Bolts (20)',
					type: 'ammunition',
					slot: 'none',
					metadata: { quantity: 20 },
				},
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},

	// Default equipment for custom classes or unknown classes
	custom: () => {
		return {
			helmet: {
				id: 'item_cloth_hood',
				name: 'Cloth Hood',
				type: 'armor',
				slot: 'helmet',
				metadata: { armorClass: 0 },
			},
			chest: {
				id: 'item_robes',
				name: 'Robes',
				type: 'armor',
				slot: 'chest',
				metadata: { armorClass: 0 },
			},
			arms: {
				id: 'item_cloth_sleeves',
				name: 'Cloth Sleeves',
				type: 'armor',
				slot: 'arms',
				metadata: { armorClass: 0 },
			},
			legs: {
				id: 'item_cloth_pants',
				name: 'Cloth Pants',
				type: 'armor',
				slot: 'legs',
				metadata: { armorClass: 0 },
			},
			boots: {
				id: 'item_cloth_boots',
				name: 'Cloth Boots',
				type: 'armor',
				slot: 'boots',
				metadata: { armorClass: 0 },
			},
			mainHand: {
				id: 'item_dagger',
				name: 'Dagger',
				type: 'weapon',
				slot: 'mainHand',
				metadata: { damage: '1d4', damageType: 'piercing' },
			},
			inventory: [
				{
					id: 'item_backpack',
					name: 'Backpack',
					type: 'container',
					slot: 'none',
				},
				{
					id: 'item_rations',
					name: 'Rations (10 days)',
					type: 'consumable',
					slot: 'none',
					metadata: { quantity: 10 },
				},
			],
		};
	},
};

// NPC starting equipment configurations
export const NPC_STARTING_EQUIPMENT: Record<string, StartingEquipmentConfig> = {
	goblin_raider: {
		helmet: {
			id: 'item_goblin_helmet',
			name: 'Crude Helmet',
			type: 'armor',
			slot: 'helmet',
			metadata: { armorClass: 0 },
		},
		chest: {
			id: 'item_goblin_armor',
			name: 'Tattered Leather',
			type: 'armor',
			slot: 'chest',
			metadata: { armorClass: 0 },
		},
		arms: {
			id: 'item_goblin_bracers',
			name: 'Worn Bracers',
			type: 'armor',
			slot: 'arms',
			metadata: { armorClass: 0 },
		},
		legs: {
			id: 'item_goblin_leggings',
			name: 'Tattered Leggings',
			type: 'armor',
			slot: 'legs',
			metadata: { armorClass: 0 },
		},
		boots: {
			id: 'item_goblin_boots',
			name: 'Worn Boots',
			type: 'armor',
			slot: 'boots',
			metadata: { armorClass: 0 },
		},
		mainHand: {
			id: 'item_rusty_dagger',
			name: 'Rusty Dagger',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d4', damageType: 'piercing' },
		},
		inventory: [
			{
				id: 'item_coin_pouch',
				name: 'Coin Pouch',
				type: 'container',
				slot: 'none',
				metadata: { coins: '2d6' },
			},
		],
	},

	goblin_archer: {
		helmet: {
			id: 'item_goblin_helmet',
			name: 'Crude Helmet',
			type: 'armor',
			slot: 'helmet',
			metadata: { armorClass: 0 },
		},
		chest: {
			id: 'item_goblin_armor',
			name: 'Tattered Leather',
			type: 'armor',
			slot: 'chest',
			metadata: { armorClass: 0 },
		},
		arms: {
			id: 'item_goblin_bracers',
			name: 'Worn Bracers',
			type: 'armor',
			slot: 'arms',
			metadata: { armorClass: 0 },
		},
		legs: {
			id: 'item_goblin_leggings',
			name: 'Tattered Leggings',
			type: 'armor',
			slot: 'legs',
			metadata: { armorClass: 0 },
		},
		boots: {
			id: 'item_goblin_boots',
			name: 'Worn Boots',
			type: 'armor',
			slot: 'boots',
			metadata: { armorClass: 0 },
		},
		mainHand: {
			id: 'item_shortbow',
			name: 'Shortbow',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'piercing', range: '80/320' },
		},
		offHand: {
			id: 'item_quiver',
			name: 'Quiver',
			type: 'container',
			slot: 'offHand',
			metadata: { capacity: 20 },
		},
		inventory: [
			{
				id: 'item_arrows',
				name: 'Arrows (20)',
				type: 'ammunition',
				slot: 'none',
				metadata: { quantity: 20 },
			},
			{
				id: 'item_coin_pouch',
				name: 'Coin Pouch',
				type: 'container',
				slot: 'none',
				metadata: { coins: '2d6' },
			},
		],
	},

	goblin_cleric: {
		helmet: {
			id: 'item_goblin_helmet',
			name: 'Crude Helmet',
			type: 'armor',
			slot: 'helmet',
			metadata: { armorClass: 0 },
		},
		chest: {
			id: 'item_goblin_armor',
			name: 'Tattered Leather',
			type: 'armor',
			slot: 'chest',
			metadata: { armorClass: 0 },
		},
		arms: {
			id: 'item_goblin_bracers',
			name: 'Worn Bracers',
			type: 'armor',
			slot: 'arms',
			metadata: { armorClass: 0 },
		},
		legs: {
			id: 'item_goblin_leggings',
			name: 'Tattered Leggings',
			type: 'armor',
			slot: 'legs',
			metadata: { armorClass: 0 },
		},
		boots: {
			id: 'item_goblin_boots',
			name: 'Worn Boots',
			type: 'armor',
			slot: 'boots',
			metadata: { armorClass: 0 },
		},
		mainHand: {
			id: 'item_rusty_mace',
			name: 'Rusty Mace',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d6', damageType: 'bludgeoning' },
		},
		offHand: {
			id: 'item_goblin_holy_symbol',
			name: 'Crude Holy Symbol',
			type: 'tool',
			slot: 'offHand',
		},
		inventory: [
			{
				id: 'item_healing_potion',
				name: 'Healing Potion',
				type: 'consumable',
				slot: 'none',
				metadata: { healing: '2d4+2' },
			},
			{
				id: 'item_coin_pouch',
				name: 'Coin Pouch',
				type: 'container',
				slot: 'none',
				metadata: { coins: '2d6' },
			},
		],
	},

	goblin_scout: {
		helmet: {
			id: 'item_goblin_helmet',
			name: 'Crude Helmet',
			type: 'armor',
			slot: 'helmet',
			metadata: { armorClass: 0 },
		},
		chest: {
			id: 'item_goblin_armor',
			name: 'Tattered Leather',
			type: 'armor',
			slot: 'chest',
			metadata: { armorClass: 0 },
		},
		arms: {
			id: 'item_goblin_bracers',
			name: 'Worn Bracers',
			type: 'armor',
			slot: 'arms',
			metadata: { armorClass: 0 },
		},
		legs: {
			id: 'item_goblin_leggings',
			name: 'Tattered Leggings',
			type: 'armor',
			slot: 'legs',
			metadata: { armorClass: 0 },
		},
		boots: {
			id: 'item_goblin_boots',
			name: 'Worn Boots',
			type: 'armor',
			slot: 'boots',
			metadata: { armorClass: 0 },
		},
		mainHand: {
			id: 'item_rusty_dagger',
			name: 'Rusty Dagger',
			type: 'weapon',
			slot: 'mainHand',
			metadata: { damage: '1d4', damageType: 'piercing' },
		},
		inventory: [
			{
				id: 'item_horn',
				name: 'Horn',
				type: 'tool',
				slot: 'none',
			},
			{
				id: 'item_coin_pouch',
				name: 'Coin Pouch',
				type: 'container',
				slot: 'none',
				metadata: { coins: '2d6' },
			},
		],
	},
};

/**
 * Get starting equipment configuration for a character based on class and race
 * Note: Icons are NOT included here to avoid backend import issues.
 * Icons should be added on the frontend when displaying equipment.
 */
export function getStartingEquipmentConfig(
	classId: string,
	raceId: string,
): StartingEquipmentConfig {
	const classConfig = CLASS_STARTING_EQUIPMENT[classId.toLowerCase()] || CLASS_STARTING_EQUIPMENT.custom;
	return classConfig(raceId.toLowerCase());
}

/**
 * Get starting equipment configuration for an NPC
 */
export function getNPCStartingEquipmentConfig(npcSlug: string): StartingEquipmentConfig | null {
	return NPC_STARTING_EQUIPMENT[npcSlug] || null;
}
