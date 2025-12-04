import { z } from 'zod';

import { GearSlotSchema, StatBlockSchema } from './stats';

export const CharacterSchema = z.object({
	id: z.string(),
	level: z.number().int().default(1),
	race: z.string(),
	name: z.string(),
	class: z.string(),
	trait: z.string().optional(),
	image: z.string().optional(),
	icon: z.string().optional(),
	description: z.string().optional(),
	stats: StatBlockSchema,
	skills: z.array(z.string()),
	inventory: z.array(z.any()), // Array of item objects with id, name, slot, icon, etc.
	equipped: z.record(GearSlotSchema, z.string().nullable()),
	health: z.number().int(),
	maxHealth: z.number().int(),
	actionPoints: z.number().int(),
	maxActionPoints: z.number().int(),
	statusEffects: z.array(z.string()).default([]),
	preparedSpells: z.array(z.string()).default([]), // Array of spell IDs
});
export type Character = z.infer<typeof CharacterSchema>;
