import { z } from 'zod';

export const LocationOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	image: z.any(),
	isCustom: z.boolean().optional(),
});

export type LocationOption = z.infer<typeof LocationOptionSchema>;
