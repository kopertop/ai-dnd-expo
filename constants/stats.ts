import { z } from 'zod';

// D&D 5e stat keys
export const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type StatKey = typeof STAT_KEYS[number];

// Stat block type (e.g., { STR: 10, DEX: 14, ... })
export type StatBlock = Record<StatKey, number>;

// Zod schema for stat keys and stat blocks
export const StatKeySchema = z.enum(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
export const StatBlockSchema = z.object({
	STR: z.number(),
	DEX: z.number(),
	CON: z.number(),
	INT: z.number(),
	WIS: z.number(),
	CHA: z.number(),
});

// For partial stat bonuses (e.g., races)
export const PartialStatBlockSchema = StatBlockSchema.partial();
export type PartialStatBlock = Partial<StatBlock>;

// Inventory item slot types
export const GEAR_SLOTS = [
	'helmet', 'chest', 'arms', 'legs', 'boots', 'mainHand', 'offHand', 'accessory', 'none',
] as const;
export type GearSlot = typeof GEAR_SLOTS[number];

// Zod schema for gear slot
export const GearSlotSchema = z.enum([
	'helmet', 'chest', 'arms', 'legs', 'boots', 'mainHand', 'offHand', 'accessory', 'none',
]);

// Inventory item type
export const InventoryItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	icon: z.any(), // React Native image require()
	slot: GearSlotSchema, // what slot this item can go in, or 'none' for usable items
	usable: z.boolean().optional(), // if true, can be used from inventory
	stats: StatBlockSchema.partial().optional(), // stat bonuses if equipped
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
