import { z } from 'zod';

import { GameStateSchema } from './game';
import { QuestSchema } from './quest';

export const InviteCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid invite code format');

export const GameSessionStatusSchema = z.enum(['waiting', 'active', 'completed', 'cancelled']);

export const PlayerInfoSchema = z.object({
	characterId: z.string(),
	playerId: z.string(), // Unique player identifier (could be device ID or user ID)
	name: z.string(), // Character name
	joinedAt: z.number(),
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

export const MapTokenTypeSchema = z.enum(['player', 'npc', 'object']);

export const MapTileSchema = z.object({
        x: z.number().int(),
        y: z.number().int(),
        terrain: z.string(),
        elevation: z.number().int().optional(),
        isBlocked: z.boolean().optional(),
        hasFog: z.boolean().optional(),
});

export const MapTokenSchema = z.object({
        id: z.string(),
        label: z.string(),
        type: MapTokenTypeSchema,
        referenceId: z.string().optional(),
        characterId: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        x: z.number().int(),
        y: z.number().int(),
        elevation: z.number().int().optional(),
        hitPoints: z.number().int().optional(),
        maxHitPoints: z.number().int().optional(),
        status: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const MapStateSchema = z.object({
        id: z.string(),
        mapId: z.string().optional(),
        name: z.string(),
        width: z.number().int(),
        height: z.number().int(),
        gridSize: z.number().int().optional(),
        terrain: z.string().optional(),
        fogOfWar: z.string().optional(),
        tiles: z.array(MapTileSchema).optional(),
        tokens: z.array(MapTokenSchema).default([]),
        updatedAt: z.number(),
});

export const SessionLogEntrySchema = z.object({
        id: z.string(),
        type: z.enum(['narration', 'action', 'dice', 'system']),
        content: z.string(),
        timestamp: z.number(),
        actor: z.string().optional(),
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
        mapState: MapStateSchema.optional(),
        log: z.array(SessionLogEntrySchema).optional(),
});

export type MultiplayerGameState = z.infer<typeof MultiplayerGameStateSchema>;
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;
export type GameSessionStatus = z.infer<typeof GameSessionStatusSchema>;
export type GameMessage = z.infer<typeof GameMessageSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type MapToken = z.infer<typeof MapTokenSchema>;
export type MapTile = z.infer<typeof MapTileSchema>;
export type SessionLogEntry = z.infer<typeof SessionLogEntrySchema>;

