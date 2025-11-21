import { z } from 'zod';

import { CharacterSchema } from '@/types/character';
import { GameSessionStatusSchema, MultiplayerGameStateSchema } from '@/types/multiplayer-game';
import { MapStateSchema, MapTokenSchema, NpcDefinitionSchema } from '@/types/multiplayer-map';
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

export const MapTokenUpsertRequestSchema = z.object({
	id: z.string().optional(),
	mapId: z.string().optional(),
	gameId: z.string().optional(),
	characterId: z.string().optional(),
	npcId: z.string().optional(),
	tokenType: MapTokenSchema.shape.type,
	label: MapTokenSchema.shape.label.optional(),
	x: z.number().int(),
	y: z.number().int(),
	color: MapTokenSchema.shape.color.optional(),
	metadata: MapTokenSchema.shape.metadata.optional(),
});

export const MapTokenDeleteRequestSchema = z.object({
	tokenId: z.string(),
});

export const MapStateUpdateRequestSchema = z.object({
	id: z.string(),
	terrain: MapStateSchema.shape.terrain.optional(),
	fog: MapStateSchema.shape.fog.optional(),
	tokens: MapStateSchema.shape.tokens.optional(),
	name: z.string().optional(),
	defaultTerrain: z.string().optional(),
});

export const NpcPlacementRequestSchema = z.object({
	npcId: z.string(),
	mapId: z.string().optional(),
	x: z.number().int(),
	y: z.number().int(),
	label: z.string().optional(),
	customNpc: z
		.object({
			name: z.string(),
			role: z.string(),
			alignment: z.string(),
			disposition: z.string(),
			description: z.string().optional(),
			maxHealth: z.number().optional(),
			armorClass: z.number().optional(),
			color: z.string().optional(),
		})
		.optional(),
});

export const MapTerrainMutationSchema = z.object({
	tiles: z.array(
		z.object({
			x: z.number().int(),
			y: z.number().int(),
			terrainType: z.string(),
			elevation: z.number().int().optional(),
			isBlocked: z.boolean().optional(),
			hasFog: z.boolean().optional(),
			featureType: z.string().optional().nullable(),
			metadata: z.record(z.unknown()).optional(),
		}),
	),
});

export const MapGenerationRequestSchema = z.object({
        preset: z.enum(['forest', 'road', 'dungeon', 'town']).optional(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        seed: z.string().optional(),
	name: z.string().optional(),
	slug: z.string().optional(),
});

export const PlacedNpcSchema = z.object({
	id: z.string(),
	npcId: z.string(),
	tokenId: z.string(),
	name: z.string(),
	disposition: z.string(),
	currentHealth: z.number(),
	maxHealth: z.number(),
	statusEffects: z.array(z.string()),
	isFriendly: z.boolean(),
	metadata: z.record(z.unknown()).optional(),
	updatedAt: z.number(),
});

export const NpcInstanceListResponseSchema = z.object({
	instances: z.array(PlacedNpcSchema),
});

export const NpcInstanceUpdateRequestSchema = z.object({
        name: z.string().optional(),
        currentHealth: z.number().optional(),
        statusEffects: z.array(z.string()).optional(),
        isFriendly: z.boolean().optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const MovementValidationResponseSchema = z.object({
        valid: z.boolean(),
        cost: z.number(),
        path: z.array(
                z.object({
                        x: z.number().int(),
                        y: z.number().int(),
                }),
        ),
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
			race: z.string().optional(),
			class: z.string().optional(),
			level: z.number().optional(),
			avatarColor: z.string().optional(),
		}),
	),
	characters: z.array(CharacterSchema).optional().default([]),
	createdAt: z.number(),
	gameState: MultiplayerGameStateSchema.optional(),
});

export const GameStateResponseSchema = MultiplayerGameStateSchema;

export type MovementValidationResponse = z.infer<typeof MovementValidationResponseSchema>;

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

export const MapStateResponseSchema = MapStateSchema;

export const NpcDefinitionListResponseSchema = z.object({
	npcs: z.array(NpcDefinitionSchema),
});

export const MapTokenMutationResponseSchema = z.object({
	tokens: z.array(MapTokenSchema),
});

export const MapTokenListResponseSchema = z.object({
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
export type MapStateUpdateRequest = z.infer<typeof MapStateUpdateRequestSchema>;
export type NpcPlacementRequest = z.infer<typeof NpcPlacementRequestSchema>;
export type MapTerrainMutationRequest = z.infer<typeof MapTerrainMutationSchema>;
export type MapGenerationRequest = z.infer<typeof MapGenerationRequestSchema>;
export type PlacedNpc = z.infer<typeof PlacedNpcSchema>;
export type NpcInstanceListResponse = z.infer<typeof NpcInstanceListResponseSchema>;
export type NpcInstanceUpdateRequest = z.infer<typeof NpcInstanceUpdateRequestSchema>;
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
export type MapTokenListResponse = z.infer<typeof MapTokenListResponseSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type MapTile = z.infer<typeof MapTileSchema>;
export type MapToken = z.infer<typeof MapTokenSchema>;
export type NpcDefinition = z.infer<typeof NpcDefinitionSchema>;
