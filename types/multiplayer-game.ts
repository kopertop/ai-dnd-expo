import { z } from 'zod';

import { GameStateSchema } from './game';
import { ActivityLogEntrySchema, MapStateSchema, NpcStateSchema } from './multiplayer-map';
import { QuestSchema } from './quest';

export const InviteCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid invite code format');

export const GameSessionStatusSchema = z.enum(['waiting', 'active', 'completed', 'cancelled']);

export const PlayerInfoSchema = z.object({
	characterId: z.string(),
	playerId: z.string(), // Unique player identifier (could be device ID or user ID)
	name: z.string(), // Character name
	joinedAt: z.number(),
	race: z.string().optional(),
	class: z.string().optional(),
	level: z.number().optional(),
	avatarColor: z.string().optional(),
});

export const GameMessageSchema = z.object({
	id: z.string(),
	content: z.string(),
	timestamp: z.number(),
	type: z.enum(['narration', 'dialogue', 'action_result', 'system']),
	speaker: z.string().optional(),
	role: z.enum(['user', 'assistant', 'system']).optional(),
	characterId: z.string().optional(),
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
	messages: z.array(GameMessageSchema).default([]),
	mapState: MapStateSchema.nullable().optional(),
	npcStates: z.array(NpcStateSchema).optional(),
	activityLog: z.array(ActivityLogEntrySchema).default([]),
	activeTurn: z
		.object({
			type: z.enum(['player', 'npc', 'dm']),
			entityId: z.string(),
			turnNumber: z.number().int(),
			startedAt: z.number(),
			movementUsed: z.number().min(0).default(0),
			majorActionUsed: z.boolean().default(false),
			minorActionUsed: z.boolean().default(false),
			speed: z.number().min(0).optional(),
		})
		.nullable()
		.optional(),
	initiativeOrder: z
		.array(
			z.object({
				entityId: z.string(),
				initiative: z.number(),
				type: z.enum(['player', 'npc']),
				roll: z.number().optional(),
				dexMod: z.number().optional(),
			}),
		)
		.optional(),
	pausedTurn: z
		.object({
			type: z.enum(['player', 'npc', 'dm']),
			entityId: z.string(),
			turnNumber: z.number().int(),
			startedAt: z.number(),
		})
		.optional(),
});

export type MultiplayerGameState = z.infer<typeof MultiplayerGameStateSchema>;
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;
export type GameSessionStatus = z.infer<typeof GameSessionStatusSchema>;
export type GameMessage = z.infer<typeof GameMessageSchema>;

