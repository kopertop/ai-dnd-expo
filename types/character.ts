import { z } from 'zod';

import { InventoryEntrySchema } from './items';
import { GearSlotSchema, StatBlockSchema } from './stats';

export const CharacterSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	stats: StatBlockSchema,
	skills: z.array(z.string()),
	inventory: z.array(InventoryEntrySchema),
	equipped: z.record(GearSlotSchema, z.string().nullable()),
	health: z.number().int(),
	maxHealth: z.number().int(),
	actionPoints: z.number().int(),
	maxActionPoints: z.number().int(),
});
export type Character = z.infer<typeof CharacterSchema>;
