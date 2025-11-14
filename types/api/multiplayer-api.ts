import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { MultiplayerGameStateSchema } from '@/types/multiplayer-game';
import { QuestSchema } from '@/types/quest';

// Request types
export const CreateGameRequestSchema = z.object({
	questId: z.string().optional(), // Optional if quest object is provided
	quest: QuestSchema.optional(), // Quest object can be provided directly
	world: z.string(),
	startingArea: z.string(),
	hostId: z.string(),
	hostEmail: z.string().email().optional(), // Email for character persistence
}).refine(data => data.questId || data.quest, {
	message: 'Either questId or quest object must be provided',
});

export const JoinGameRequestSchema = z.object({
	inviteCode: z.string().regex(/^[A-Z0-9]{6}$/),
	character: CharacterSchema,
	playerId: z.string(),
	playerEmail: z.string().email().optional(), // Email for character persistence
});

export const PlayerActionRequestSchema = z.object({
	action: z.string(),
	characterId: z.string(),
});

export const DMActionRequestSchema = z.object({
	type: z.enum(['narrate', 'update_character', 'update_npc', 'advance_story', 'roll_dice']),
	data: z.record(z.unknown()),
});

// Response types
export const GameSessionResponseSchema = z.object({
	sessionId: z.string(),
	inviteCode: z.string(),
	status: z.enum(['waiting', 'active', 'completed', 'cancelled']),
	hostId: z.string(),
	quest: QuestSchema,
	players: z.array(
		z.object({
			characterId: z.string(),
			playerId: z.string(),
			name: z.string(),
			joinedAt: z.number(),
		}),
	),
	createdAt: z.number(),
});

export const GameStateResponseSchema = MultiplayerGameStateSchema;

export const ErrorResponseSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	details: z.record(z.unknown()).optional(),
});

// Type exports
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export type PlayerActionRequest = z.infer<typeof PlayerActionRequestSchema>;
export type DMActionRequest = z.infer<typeof DMActionRequestSchema>;
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

