import { z } from 'zod';

import { CharacterSchema } from './character';
import { GameStateSchema, GameWorldStateSchema } from './game';
import { QuestSchema } from './quest';

export const InviteCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid invite code format');

export const GameSessionStatusSchema = z.enum(['waiting', 'active', 'completed', 'cancelled']);

export const PlayerInfoSchema = z.object({
	characterId: z.string(),
	playerId: z.string(), // Unique player identifier (could be device ID or user ID)
	name: z.string(), // Character name
	joinedAt: z.number(),
});

export const MultiplayerGameStateSchema = GameStateSchema.extend({
	hostId: z.string(), // Player ID of the host
	quest: QuestSchema,
	sessionId: z.string(),
	inviteCode: InviteCodeSchema,
	players: z.array(PlayerInfoSchema),
	status: GameSessionStatusSchema,
	createdAt: z.number(),
	lastUpdated: z.number(),
	messages: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			timestamp: z.number(),
			type: z.enum(['narration', 'dialogue', 'action_result', 'system']),
			speaker: z.string(),
			characterId: z.string().optional(),
		}),
	).default([]),
});

export type MultiplayerGameState = z.infer<typeof MultiplayerGameStateSchema>;
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;
export type GameSessionStatus = z.infer<typeof GameSessionStatusSchema>;

