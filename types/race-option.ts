import { z } from 'zod';

import { PartialStatBlock } from './stats';

export const RaceOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	image: z.any(),
	isCustom: z.boolean().optional(),
	statBonuses: z.custom<PartialStatBlock>().optional(),
	speed: z.number().optional(),
});

export type RaceOption = z.infer<typeof RaceOptionSchema>;
