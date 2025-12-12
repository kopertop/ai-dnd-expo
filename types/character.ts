import { z } from 'zod';

import { GearSlotSchema, StatBlockSchema } from './stats';

// Damage types matching types/spell.ts
export const DamageTypeSchema = z.enum([
	'fire',
	'radiant',
	'force',
	'cold',
	'lightning',
	'acid',
	'necrotic',
	'poison',
	'psychic',
	'thunder',
	'bludgeoning',
	'piercing',
	'slashing',
	'healing',
	'support',
]);

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
	weaknesses: z.array(DamageTypeSchema).optional(),
	resistances: z.array(DamageTypeSchema).optional(),
	immunities: z.array(DamageTypeSchema).optional(),
});
export type Character = z.infer<typeof CharacterSchema>;
