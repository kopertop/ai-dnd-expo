import { z } from 'zod';

export const WorldOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	image: z.any(),
	isCustom: z.boolean().optional(),
});

export type WorldOption = z.infer<typeof WorldOptionSchema>;
