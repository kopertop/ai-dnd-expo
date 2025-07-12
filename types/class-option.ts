import { z } from 'zod';

import { StatKey } from './stats';

export const ClassOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	image: z.any(),
	isCustom: z.boolean().optional(),
	primaryStats: z.array(z.custom<StatKey>()),
	secondaryStats: z.array(z.custom<StatKey>()).optional(),
});

export type ClassOption = z.infer<typeof ClassOptionSchema>;
