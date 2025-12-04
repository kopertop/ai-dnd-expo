import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { MultiplayerGameStateSchema } from '@/types/multiplayer-game';

export const WebSocketMessageTypeSchema = z.enum([
	'game_state_update',
	'player_joined',
	'player_left',
	'player_action',
	'dm_message',
	'error',
	'ping',
	'pong',
]);

export const GameStateUpdateMessageSchema = z.object({
	type: z.literal('game_state_update'),
	timestamp: z.number(),
	data: z.object({
		gameState: MultiplayerGameStateSchema,
	}),
});

export const PlayerJoinedMessageSchema = z.object({
	type: z.literal('player_joined'),
	timestamp: z.number(),
	data: z.object({
		playerId: z.string(),
		characterId: z.string(),
		character: CharacterSchema,
	}),
});

export const PlayerLeftMessageSchema = z.object({
	type: z.literal('player_left'),
	timestamp: z.number(),
	data: z.object({
		playerId: z.string(),
		characterId: z.string(),
	}),
});

export const PlayerActionMessageSchema = z.object({
	type: z.literal('player_action'),
	timestamp: z.number(),
	data: z.object({
		playerId: z.string(),
		characterId: z.string(),
		action: z.string(),
	}),
});

export const DMMessageSchema = z.object({
	type: z.literal('dm_message'),
	timestamp: z.number(),
	data: z.object({
		content: z.string(),
		messageId: z.string(),
	}),
});

export const ErrorMessageSchema = z.object({
	type: z.literal('error'),
	timestamp: z.number(),
	data: z.object({
		error: z.string(),
		code: z.string().optional(),
	}),
});

export const PingMessageSchema = z.object({
	type: z.literal('ping'),
	timestamp: z.number(),
	data: z.record(z.unknown()).optional().default({}),
});

export const PongMessageSchema = z.object({
	type: z.literal('pong'),
	timestamp: z.number(),
	data: z.record(z.unknown()).optional().default({}),
});

export const WebSocketMessageSchema = z.union([
	GameStateUpdateMessageSchema,
	PlayerJoinedMessageSchema,
	PlayerLeftMessageSchema,
	PlayerActionMessageSchema,
	DMMessageSchema,
	ErrorMessageSchema,
	PingMessageSchema,
	PongMessageSchema,
]);

// Type exports
export type WebSocketMessageType = z.infer<typeof WebSocketMessageTypeSchema>;
export type GameStateUpdateMessage = z.infer<typeof GameStateUpdateMessageSchema>;
export type PlayerJoinedMessage = z.infer<typeof PlayerJoinedMessageSchema>;
export type PlayerLeftMessage = z.infer<typeof PlayerLeftMessageSchema>;
export type PlayerActionMessage = z.infer<typeof PlayerActionMessageSchema>;
export type DMMessage = z.infer<typeof DMMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

