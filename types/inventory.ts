/**
 * Inventory System Types - Equipment, Items, and Stat Management
 * Comprehensive item system for D&D gameplay mechanics
 */

import type { AbilityScores, DiceRoll } from './characters';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact';

export type ItemType = 
	| 'weapon'
	| 'armor'
	| 'shield'
	| 'consumable'
	| 'tool'
	| 'adventuring-gear'
	| 'treasure'
	| 'magic-item'
	| 'quest-item';

export type DamageType = 
	| 'bludgeoning'
	| 'piercing'
	| 'slashing'
	| 'acid'
	| 'cold'
	| 'fire'
	| 'force'
	| 'lightning'
	| 'necrotic'
	| 'poison'
	| 'psychic'
	| 'radiant'
	| 'thunder';

export type WeaponProperty = 
	| 'ammunition'
	| 'finesse'
	| 'heavy'
	| 'light'
	| 'loading'
	| 'range'
	| 'reach'
	| 'special'
	| 'thrown'
	| 'two-handed'
	| 'versatile';

export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield';

export type EquipmentSlot = 
	| 'main-hand'
	| 'off-hand'
	| 'armor'
	| 'helmet'
	| 'boots'
	| 'gloves'
	| 'belt'
	| 'cloak'
	| 'amulet'
	| 'ring-1'
	| 'ring-2';

/**
 * Stat modifications that items can provide
 */
export interface StatModification {
	type: 'bonus' | 'advantage' | 'disadvantage' | 'resistance' | 'immunity';
	target: keyof AbilityScores | 'armor-class' | 'hit-points' | 'speed' | 'initiative';
	value?: number;
	condition?: string; // e.g., "while wearing light armor"
}

/**
 * Base item interface - foundation for all items
 */
export interface BaseItem {
	id: string;
	name: string;
	description: string;
	type: ItemType;
	rarity: ItemRarity;
	
	// Physical properties
	weight: number; // in pounds
	value: number; // in gold pieces
	stackable: boolean;
	maxStack?: number;
	
	// Game mechanics
	requiresAttunement?: boolean;
	isAttuned?: boolean;
	statModifications: StatModification[];
	
	// Metadata
	source?: string; // "PHB", "DMG", etc.
	createdAt: number;
	updatedAt: number;
}

/**
 * Weapon-specific properties
 */
export interface WeaponItem extends BaseItem {
	type: 'weapon';
	weaponData: {
		damage: DiceRoll;
		damageType: DamageType;
		properties: WeaponProperty[];
		range?: {
			normal: number;
			long?: number;
		};
		versatileDamage?: DiceRoll;
		isSimple: boolean;
		isMartial: boolean;
		isRanged: boolean;
	};
}

/**
 * Armor-specific properties
 */
export interface ArmorItem extends BaseItem {
	type: 'armor';
	armorData: {
		armorType: ArmorType;
		baseAC: number;
		maxDexBonus?: number;
		minStrength?: number;
		stealthDisadvantage: boolean;
		donTime: string; // "1 action", "1 minute", etc.
		doffTime: string;
	};
}

/**
 * Shield-specific properties
 */
export interface ShieldItem extends BaseItem {
	type: 'shield';
	shieldData: {
		acBonus: number;
		minStrength?: number;
		stealthDisadvantage: boolean;
		donTime: string;
		doffTime: string;
	};
}

/**
 * Consumable items (potions, scrolls, etc.)
 */
export interface ConsumableItem extends BaseItem {
	type: 'consumable';
	consumableData: {
		uses: {
			total: number;
			remaining: number;
		};
		effect: {
			description: string;
			duration?: string;
			savingThrow?: {
				ability: keyof AbilityScores;
				dc: number;
			};
		};
		consumeAction: 'action' | 'bonus-action' | 'reaction' | 'free';
	};
}

/**
 * Tools and adventuring gear
 */
export interface ToolItem extends BaseItem {
	type: 'tool';
	toolData: {
		toolType: 'artisan' | 'gaming' | 'musical' | 'other';
		proficiencyGranted?: string;
		uses?: {
			total: number;
			remaining: number;
		};
	};
}

/**
 * Generic adventuring gear
 */
export interface AdventuringGearItem extends BaseItem {
	type: 'adventuring-gear';
	gearData: {
		category: 'container' | 'light' | 'utility' | 'survival' | 'other';
		capacity?: number; // for containers
		lightRadius?: number; // for light sources
		duration?: string; // for temporary items
	};
}

/**
 * Treasure and valuables
 */
export interface TreasureItem extends BaseItem {
	type: 'treasure';
	treasureData: {
		artValue?: number;
		gemType?: string;
		isCoins: boolean;
		denomination?: 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
	};
}

/**
 * Magic items with special properties
 */
export interface MagicItem extends BaseItem {
	type: 'magic-item';
	magicData: {
		schoolOfMagic?: string;
		charges?: {
			total: number;
			current: number;
			rechargeRate: string;
		};
		spells?: string[];
		commandWord?: string;
		curse?: {
			description: string;
			removeCondition: string;
		};
	};
}

/**
 * Quest-related items
 */
export interface QuestItem extends BaseItem {
	type: 'quest-item';
	questData: {
		questId: string;
		isKeyItem: boolean;
		canDrop: boolean;
		specialUse?: string;
	};
}

/**
 * Union type for all item types
 */
export type AnyItem = 
	| WeaponItem
	| ArmorItem
	| ShieldItem
	| ConsumableItem
	| ToolItem
	| AdventuringGearItem
	| TreasureItem
	| MagicItem
	| QuestItem;

/**
 * Inventory structure
 */
export interface InventorySlot {
	item: AnyItem | null;
	quantity: number;
	position: {
		x: number;
		y: number;
	};
}

export interface Inventory {
	id: string;
	ownerId: string; // Character ID
	slots: InventorySlot[];
	capacity: {
		weight: number;
		slots: number;
	};
	currency: {
		copper: number;
		silver: number;
		electrum: number;
		gold: number;
		platinum: number;
	};
}

/**
 * Equipment slots for characters
 */
export interface EquipmentLoadout {
	characterId: string;
	slots: Partial<Record<EquipmentSlot, AnyItem>>;
	alternateSlots?: Partial<Record<EquipmentSlot, AnyItem>>; // For weapon swapping
}

/**
 * Item filter and search
 */
export interface ItemFilter {
	type?: ItemType[];
	rarity?: ItemRarity[];
	equipmentSlot?: EquipmentSlot[];
	minValue?: number;
	maxValue?: number;
	requiresAttunement?: boolean;
	searchText?: string;
	tags?: string[];
}

/**
 * Item operation results
 */
export interface ItemOperationResult {
	success: boolean;
	message: string;
	item?: AnyItem;
	modifiedItems?: AnyItem[];
}

/**
 * Inventory events
 */
export interface InventoryEvents {
	'item:added': { inventory: Inventory; item: AnyItem; quantity: number };
	'item:removed': { inventory: Inventory; item: AnyItem; quantity: number };
	'item:moved': { inventory: Inventory; item: AnyItem; from: number; to: number };
	'item:equipped': { characterId: string; item: AnyItem; slot: EquipmentSlot };
	'item:unequipped': { characterId: string; item: AnyItem; slot: EquipmentSlot };
	'item:consumed': { characterId: string; item: ConsumableItem };
	'item:attuned': { characterId: string; item: AnyItem };
	'item:unattuned': { characterId: string; item: AnyItem };
	'currency:changed': { inventory: Inventory; type: keyof Inventory['currency']; amount: number };
}

/**
 * Item database configuration
 */
export interface ItemDatabase {
	weapons: WeaponItem[];
	armor: ArmorItem[];
	shields: ShieldItem[];
	consumables: ConsumableItem[];
	tools: ToolItem[];
	adventuringGear: AdventuringGearItem[];
	treasure: TreasureItem[];
	magicItems: MagicItem[];
	questItems: QuestItem[];
}

/**
 * Equipment calculation results
 */
export interface EquipmentStats {
	armorClass: {
		base: number;
		bonus: number;
		total: number;
	};
	attackBonuses: Record<string, number>;
	damageBonuses: Record<string, number>;
	abilityModifications: Partial<AbilityScores>;
	otherBonuses: Record<string, number>;
	totalWeight: number;
	attunementSlots: {
		used: number;
		total: number;
	};
}

/**
 * Utility functions type definitions
 */
export type ItemFactory = (template: Partial<AnyItem>) => AnyItem;
export type StatCalculator = (items: AnyItem[]) => EquipmentStats;
export type EquipmentValidator = (character: any, item: AnyItem, slot: EquipmentSlot) => ItemOperationResult;