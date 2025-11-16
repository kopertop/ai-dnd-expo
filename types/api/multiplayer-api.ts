import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { GameSessionStatusSchema, MultiplayerGameStateSchema } from '@/types/multiplayer-game';
import {
        MapStateSchema,
        MapTokenSchema,
        NpcDefinitionSchema,
} from '@/types/multiplayer-map';
import { QuestSchema } from '@/types/quest';

// Request types
export const CreateGameRequestSchema = z.object({
        questId: z.string().optional(), // Optional if quest object is provided
        quest: QuestSchema.optional(), // Quest object can be provided directly
        world: z.string(),
        startingArea: z.string(),
        hostId: z.string(),
        hostEmail: z.string().email().optional(), // Email for character persistence
        mapId: z.string().optional(),
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
	status: GameSessionStatusSchema,
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
	gameState: MultiplayerGameStateSchema.optional(),
});

export const GameStateResponseSchema = MultiplayerGameStateSchema;

export const ErrorResponseSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	details: z.record(z.unknown()).optional(),
});

export const GameSummarySchema = z.object({
	id: z.string(),
	inviteCode: z.string(),
	status: GameSessionStatusSchema,
	hostId: z.string(),
	hostEmail: z.string().nullable().optional(),
	world: z.string(),
	startingArea: z.string(),
	quest: QuestSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const HostedGameSummarySchema = GameSummarySchema.extend({});

export const JoinedGameSummarySchema = GameSummarySchema.extend({
	characterId: z.string().optional(),
	characterName: z.string().optional(),
	joinedAt: z.number().optional(),
});

export const MyGamesResponseSchema = z.object({
	hostedGames: z.array(HostedGameSummarySchema),
	joinedGames: z.array(JoinedGameSummarySchema),
});

export const CharacterListResponseSchema = z.object({
        characters: z.array(CharacterSchema),
});

export const CharacterUpsertRequestSchema = CharacterSchema.extend({
        playerId: z.string().optional(),
        playerEmail: z.string().email().optional(),
});

export const MapStateResponseSchema = MapStateSchema;

export const MapStateUpdateRequestSchema = z.object({
        id: z.string(),
        terrain: MapStateSchema.shape.terrain.optional(),
        fog: MapStateSchema.shape.fog.optional(),
        tokens: MapStateSchema.shape.tokens.optional(),
        name: z.string().optional(),
});

export const MapTokenMutationRequestSchema = z.object({
        action: z.enum(['create', 'update', 'delete']),
        token: MapTokenSchema.partial().extend({ id: z.string().optional() }).optional(),
        tokenId: z.string().optional(),
});

export const MapTokenListResponseSchema = z.object({
        tokens: z.array(MapTokenSchema),
});

export const NpcDefinitionListResponseSchema = z.object({
        npcs: z.array(NpcDefinitionSchema),
});

export const NpcPlacementRequestSchema = z.object({
        npcId: z.string(),
        position: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() }),
        label: z.string().optional(),
});

// Type exports
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export type PlayerActionRequest = z.infer<typeof PlayerActionRequestSchema>;
export type DMActionRequest = z.infer<typeof DMActionRequestSchema>;
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type GameSummary = z.infer<typeof GameSummarySchema>;
export type HostedGameSummary = z.infer<typeof HostedGameSummarySchema>;
export type JoinedGameSummary = z.infer<typeof JoinedGameSummarySchema>;
export type MyGamesResponse = z.infer<typeof MyGamesResponseSchema>;
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>;
export type CharacterUpsertRequest = z.infer<typeof CharacterUpsertRequestSchema>;
export type MapStateResponse = z.infer<typeof MapStateResponseSchema>;
export type MapStateUpdateRequest = z.infer<typeof MapStateUpdateRequestSchema>;
export type MapTokenMutationRequest = z.infer<typeof MapTokenMutationRequestSchema>;
export type MapTokenListResponse = z.infer<typeof MapTokenListResponseSchema>;
export type NpcDefinitionListResponse = z.infer<typeof NpcDefinitionListResponseSchema>;
export type NpcPlacementRequest = z.infer<typeof NpcPlacementRequestSchema>;

