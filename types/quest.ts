import { z } from 'zod';

export const QuestObjectiveSchema = z.object({
	id: z.string(),
	description: z.string(),
	completed: z.boolean().default(false),
	completedAt: z.number().optional(),
});

export const QuestSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	objectives: z.array(QuestObjectiveSchema),
	startingArea: z.string(),
	world: z.string(),
	maxPlayers: z.number().optional(),
	estimatedDuration: z.number().optional(), // in minutes
	createdAt: z.number(),
	createdBy: z.string().optional(), // Admin email or 'system'
});

export type Quest = z.infer<typeof QuestSchema>;
export type QuestObjective = z.infer<typeof QuestObjectiveSchema>;

