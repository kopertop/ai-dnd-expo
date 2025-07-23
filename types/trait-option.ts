import { z } from 'zod';

export const TraitOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	image: z.any(),
	isCustom: z.boolean().optional(),
	action: z.object({
		name: z.string(),
		description: z.string(),
		effect: z.string(),
	}).optional(),
});

export type TraitOption = z.infer<typeof TraitOptionSchema>;
