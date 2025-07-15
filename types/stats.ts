import { z } from 'zod';

export const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = Record<StatKey, number>;

export const StatKeySchema = z.enum(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
export const StatBlockSchema = z.object({
	STR: z.number(),
	DEX: z.number(),
	CON: z.number(),
	INT: z.number(),
	WIS: z.number(),
	CHA: z.number(),
});
export const PartialStatBlockSchema = StatBlockSchema.partial();
export type PartialStatBlock = Partial<StatBlock>;

export const GEAR_SLOTS = [
	'helmet',
	'chest',
	'arms',
	'legs',
	'boots',
	'mainHand',
	'offHand',
	'accessory',
	'none',
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export const GearSlotSchema = z.enum([
	'helmet',
	'chest',
	'arms',
	'legs',
	'boots',
	'mainHand',
	'offHand',
	'accessory',
	'none',
]);
