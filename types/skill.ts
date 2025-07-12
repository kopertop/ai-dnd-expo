import { z } from 'zod';

export const SkillSchema = z.object({
	id: z.string(),
	name: z.string(),
	ability: z.string(),
	image: z.any(),
});

export type Skill = z.infer<typeof SkillSchema>;
