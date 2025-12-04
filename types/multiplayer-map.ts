import { z } from 'zod';

/**
 * Map-related schemas shared between the DM/Player frontends and the backend.
 * These types intentionally decouple the UI from the D1 storage model
 * (which stores JSON blobs such as `terrainLayers` and `fogOfWar` strings).
 */
export const MapTokenTypeSchema = z.enum(['player', 'npc', 'object']);

export const MapTokenSchema = z.object({
	id: z.string(),
	type: MapTokenTypeSchema,
	entityId: z.string().optional(),
	label: z.string(),
	x: z.number().nonnegative(),
	y: z.number().nonnegative(),
	zIndex: z.number().optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
	hitPoints: z.number().optional(),
	maxHitPoints: z.number().optional(),
	metadata: z.record(z.unknown()).optional(),
	statusEffects: z.array(z.string()).optional(),
});

export const TerrainCellSchema = z.object({
	terrain: z.string().default('stone'),
	fogged: z.boolean().optional(),
	elevation: z.number().optional(),
	difficult: z.boolean().optional(),
	featureType: z.string().nullable().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const MapGridSchema = z.array(z.array(TerrainCellSchema));

export const MapStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	width: z.number().positive(),
	height: z.number().positive(),
	terrain: MapGridSchema.optional(),
	fog: z.array(z.array(z.boolean())).optional(),
	background: z.string().optional(),
	defaultTerrain: z.string().optional(),
	tokens: z.array(MapTokenSchema).default([]),
	updatedAt: z.number(),
	metadata: z.record(z.unknown()).optional(),
	preset: z.string().optional(),
	seed: z.string().optional(),
	theme: z.string().optional(),
	biome: z.string().optional(),
	isGenerated: z.boolean().optional(),
});

export const NpcDispositionSchema = z.enum(['hostile', 'friendly', 'vendor', 'neutral']);

export const NpcDefinitionSchema = z.object({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	role: z.string(),
	alignment: z.string(),
	disposition: NpcDispositionSchema.optional(),
	description: z.string().optional(),
	maxHealth: z.number().positive(),
	armorClass: z.number().optional(),
	attack: z.string().optional(),
	stats: z.record(z.unknown()).optional(),
	icon: z.string().optional(),
	color: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const NpcStateSchema = NpcDefinitionSchema.extend({
	currentHealth: z.number().nonnegative(),
	statusEffects: z.array(z.string()).default([]),
	tokenId: z.string().optional(),
});

export const ActivityLogEntrySchema = z.object({
	id: z.string(),
	type: z.enum(['log', 'dice', 'system']),
	message: z.string(),
	timestamp: z.number(),
	actor: z.string().optional(),
	details: z.record(z.unknown()).optional(),
});

export type MapToken = z.infer<typeof MapTokenSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type NpcDefinition = z.infer<typeof NpcDefinitionSchema>;
export type NpcState = z.infer<typeof NpcStateSchema>;
export type ActivityLogEntry = z.infer<typeof ActivityLogEntrySchema>;

