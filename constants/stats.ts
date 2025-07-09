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
