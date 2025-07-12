import { z } from 'zod';

import { GearSlotSchema, StatBlockSchema } from './stats';

export const ItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	icon: z.any(),
	slot: GearSlotSchema,
	usable: z.boolean().optional(),
	stats: StatBlockSchema.partial().optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const InventoryEntrySchema = z.object({
	itemId: z.string(),
	quantity: z.number().int().min(1),
});
export type InventoryEntry = z.infer<typeof InventoryEntrySchema>;

export const InventorySchema = z.array(InventoryEntrySchema);
export type Inventory = z.infer<typeof InventorySchema>;
