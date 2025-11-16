import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { GameSessionStatusSchema, MultiplayerGameStateSchema } from '@/types/multiplayer-game';
import { QuestSchema } from '@/types/quest';

export const MapTileSchema = z.object({
        id: z.string(),
        mapId: z.string(),
        x: z.number().int(),
        y: z.number().int(),
        terrainType: z.string(),
        elevation: z.number().int().default(0),
        isBlocked: z.boolean().default(false),
        hasFog: z.boolean().default(false),
        metadata: z.record(z.any()).default({}),
});

export const MapStateSchema = z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        width: z.number().int(),
        height: z.number().int(),
        defaultTerrain: z.record(z.any()),
        fogOfWar: z.record(z.any()),
        terrainLayers: z.array(z.record(z.any())),
        metadata: z.record(z.any()).default({}),
        tiles: z.array(MapTileSchema).optional(),
});

export const MapTokenSchema = z.object({
        id: z.string(),
        gameId: z.string().nullable().optional(),
        mapId: z.string(),
        characterId: z.string().nullable().optional(),
        npcId: z.string().nullable().optional(),
        tokenType: z.enum(['player', 'npc', 'object']),
        label: z.string().nullable().optional(),
        x: z.number().int(),
        y: z.number().int(),
        facing: z.number().int().default(0),
        color: z.string().nullable().optional(),
        status: z.string().default('idle'),
        isVisible: z.boolean().default(true),
        hitPoints: z.number().int().nullable().optional(),
        maxHitPoints: z.number().int().nullable().optional(),
        metadata: z.record(z.any()).default({}),
});

export const NpcDefinitionSchema = z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        role: z.string(),
        alignment: z.string(),
        disposition: z.enum(['hostile', 'friendly', 'vendor', 'neutral']).default('neutral'),
        description: z.string().nullable().optional(),
        baseHealth: z.number().int(),
        baseArmorClass: z.number().int(),
        challengeRating: z.number(),
        archetype: z.string(),
        defaultActions: z.array(z.string()),
        stats: z.record(z.any()),
        abilities: z.array(z.string()),
        lootTable: z.array(z.string()).default([]),
        metadata: z.record(z.any()).default({}),
});

// Request types
export const CreateGameRequestSchema = z
        .object({
                questId: z.string().optional(), // Optional if quest object is provided
                quest: QuestSchema.optional(), // Quest object can be provided directly
                world: z.string(),
                startingArea: z.string(),
                hostId: z.string(),
                hostEmail: z.string().email().optional(), // Email for character persistence
                currentMapId: z.string().optional(),
        })
        .refine(data => data.questId || data.quest, {
                message: 'Either questId or quest object must be provided',
        });

export const JoinGameRequestSchema = z
        .object({
                inviteCode: z.string().regex(/^[A-Z0-9]{6}$/),
                characterId: z.string().optional(),
                character: CharacterSchema.optional(),
                playerId: z.string(),
                playerEmail: z.string().email().optional(), // Email for character persistence
        })
        .refine(data => data.characterId || data.character, {
                message: 'A stored character ID or payload is required',
        });

export const PlayerActionRequestSchema = z.object({
        action: z.string(),
        characterId: z.string(),
});

export const DMActionRequestSchema = z.object({
        type: z.enum(['narrate', 'update_character', 'update_npc', 'advance_story', 'roll_dice']),
        data: z.record(z.unknown()),
});

export const CharacterCreateRequestSchema = CharacterSchema.omit({ id: true });

export const CharacterUpdateRequestSchema = CharacterSchema.partial();

export const MapTokenUpsertRequestSchema = MapTokenSchema.pick({
        id: true,
        mapId: true,
        gameId: true,
        characterId: true,
        npcId: true,
        tokenType: true,
        label: true,
        x: true,
        y: true,
        facing: true,
        color: true,
        status: true,
        isVisible: true,
        hitPoints: true,
        maxHitPoints: true,
        metadata: true,
}).extend({
        id: z.string().optional(),
});

export const MapTokenDeleteRequestSchema = z.object({
        tokenId: z.string(),
});

export const NpcPlacementRequestSchema = z.object({
        npcId: z.string(),
        mapId: z.string(),
        gameId: z.string().optional(),
        x: z.number().int(),
        y: z.number().int(),
        status: z.string().default('idle'),
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
        currentMapId: z.string().nullable().optional(),
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

export const MapStateResponseSchema = z.object({
        map: MapStateSchema,
        tiles: z.array(MapTileSchema),
        tokens: z.array(MapTokenSchema),
});

export const NpcDefinitionListResponseSchema = z.object({
        npcs: z.array(NpcDefinitionSchema),
});

export const MapTokenMutationResponseSchema = z.object({
        tokens: z.array(MapTokenSchema),
});

// Type exports
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export type PlayerActionRequest = z.infer<typeof PlayerActionRequestSchema>;
export type DMActionRequest = z.infer<typeof DMActionRequestSchema>;
export type CharacterCreateRequest = z.infer<typeof CharacterCreateRequestSchema>;
export type CharacterUpdateRequest = z.infer<typeof CharacterUpdateRequestSchema>;
export type MapTokenUpsertRequest = z.infer<typeof MapTokenUpsertRequestSchema>;
export type MapTokenDeleteRequest = z.infer<typeof MapTokenDeleteRequestSchema>;
export type NpcPlacementRequest = z.infer<typeof NpcPlacementRequestSchema>;
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type GameSummary = z.infer<typeof GameSummarySchema>;
export type HostedGameSummary = z.infer<typeof HostedGameSummarySchema>;
export type JoinedGameSummary = z.infer<typeof JoinedGameSummarySchema>;
export type MyGamesResponse = z.infer<typeof MyGamesResponseSchema>;
export type CharacterListResponse = z.infer<typeof CharacterListResponseSchema>;
export type MapStateResponse = z.infer<typeof MapStateResponseSchema>;
export type NpcDefinitionListResponse = z.infer<typeof NpcDefinitionListResponseSchema>;
export type MapTokenMutationResponse = z.infer<typeof MapTokenMutationResponseSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type MapTile = z.infer<typeof MapTileSchema>;
export type MapToken = z.infer<typeof MapTokenSchema>;
export type NpcDefinition = z.infer<typeof NpcDefinitionSchema>;
