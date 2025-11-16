import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { StatBlockSchema } from '@/types/stats';
import {
        GameSessionStatusSchema,
        MapStateSchema,
        MapTileSchema,
        MapTokenSchema,
        MapTokenTypeSchema,
        MultiplayerGameStateSchema,
        SessionLogEntrySchema,
} from '@/types/multiplayer-game';
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
        characterId: z.string().optional(),
        character: CharacterSchema.optional(),
        playerId: z.string(),
        playerEmail: z.string().email().optional(), // Email for character persistence
}).refine(data => data.characterId || data.character, {
        message: 'Character selection is required',
});

export const PlayerActionRequestSchema = z.object({
	action: z.string(),
	characterId: z.string(),
});

export const DMActionRequestSchema = z.object({
        type: z.enum(['narrate', 'update_character', 'update_npc', 'advance_story', 'roll_dice']),
        data: z.record(z.unknown()),
});

export const CharacterMutationRequestSchema = z.object({
        type: z.enum(['damage', 'heal', 'update']),
        amount: z.number().int().optional(),
        updates: CharacterSchema.partial().optional(),
});

export const MapUpdateRequestSchema = z.object({
        mapId: z.string().optional(),
        fogOfWar: z.string().optional(),
        terrain: z.string().optional(),
        tiles: z.array(MapTileSchema).optional(),
});

export const MapTokenMutationSchema = z.object({
        id: z.string().optional(),
        label: z.string(),
        type: MapTokenTypeSchema,
        referenceId: z.string().optional(),
        characterId: z.string().optional(),
        x: z.number().int(),
        y: z.number().int(),
        elevation: z.number().int().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const NpcDefinitionSchema = z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        role: z.enum(['hostile', 'friendly', 'vendor']),
        alignment: z.string().optional(),
        description: z.string().optional(),
        stats: StatBlockSchema,
        maxHealth: z.number().int(),
        abilities: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const NpcPlacementRequestSchema = z.object({
        npcId: z.string(),
        mapId: z.string(),
        label: z.string().optional(),
        position: z.object({
                x: z.number().int(),
                y: z.number().int(),
        }),
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

export const MapStateResponseSchema = z.object({
        map: MapStateSchema,
        log: z.array(SessionLogEntrySchema).optional(),
});

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

export const MapTokenListResponseSchema = z.object({
        tokens: z.array(MapTokenSchema),
});

export const MapDefinitionResponseSchema = z.object({
        maps: z.array(MapStateSchema.pick({ id: true, name: true, width: true, height: true })),
});

export const NpcListResponseSchema = z.object({
        npcs: z.array(NpcDefinitionSchema),
});

// Type exports
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export type PlayerActionRequest = z.infer<typeof PlayerActionRequestSchema>;
export type DMActionRequest = z.infer<typeof DMActionRequestSchema>;
export type CharacterMutationRequest = z.infer<typeof CharacterMutationRequestSchema>;
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type MapStateResponse = z.infer<typeof MapStateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type GameSummary = z.infer<typeof GameSummarySchema>;
export type HostedGameSummary = z.infer<typeof HostedGameSummarySchema>;
export type JoinedGameSummary = z.infer<typeof JoinedGameSummarySchema>;
export type MyGamesResponse = z.infer<typeof MyGamesResponseSchema>;
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>;
export type MapTokenListResponse = z.infer<typeof MapTokenListResponseSchema>;
export type MapDefinitionResponse = z.infer<typeof MapDefinitionResponseSchema>;
export type NpcListResponse = z.infer<typeof NpcListResponseSchema>;
export type MapTokenMutation = z.infer<typeof MapTokenMutationSchema>;
export type MapUpdateRequest = z.infer<typeof MapUpdateRequestSchema>;
export type NpcPlacementRequest = z.infer<typeof NpcPlacementRequestSchema>;

