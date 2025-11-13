import { z } from 'zod';

// Basic coordinate system
export const PositionSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export const DimensionsSchema = z.object({
	width: z.number(),
	height: z.number(),
});

// Terrain and biome types
export const TerrainTypeSchema = z.enum([
	'grass',
	'forest',
	'mountain',
	'desert',
	'water',
	'sand',
	'stone',
	'dirt',
	'snow',
	'swamp',
]);

export const BiomeTypeSchema = z.enum([
	'temperate_forest',
	'tropical_forest',
	'desert',
	'mountain',
	'coastal',
	'plains',
	'swampland',
	'tundra',
	'volcanic',
]);

// Individual map tile
export const MapTileSchema = z.object({
	id: z.string(),
	position: PositionSchema,
	terrain: TerrainTypeSchema,
	elevation: z.number().min(0).max(10), // 0-10 elevation levels
	objects: z.array(z.string()).default([]), // Object IDs placed on this tile
	walkable: z.boolean().default(true),
	explored: z.boolean().default(false), // Fog of war
	metadata: z.record(z.unknown()).optional(), // Extra data for special tiles
});

// Point of Interest (POI) on the map
export const PointOfInterestSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['settlement', 'dungeon', 'landmark', 'resource', 'quest']),
	position: PositionSchema,
	description: z.string().optional(),
	discovered: z.boolean().default(false),
	metadata: z.record(z.unknown()).optional(),
});

// Region represents a section of the world map
export const RegionSchema = z.object({
	id: z.string(),
	name: z.string(),
	biome: BiomeTypeSchema,
	bounds: z.object({
		topLeft: PositionSchema,
		bottomRight: PositionSchema,
	}),
	tiles: z.array(MapTileSchema),
	pointsOfInterest: z.array(PointOfInterestSchema).default([]),
	connections: z.array(z.string()).default([]), // Connected region IDs
	generationSeed: z.number(), // For reproducible generation
});

// Player position and facing
export const PlayerPositionSchema = z.object({
	position: PositionSchema,
	facing: z.enum(['north', 'south', 'east', 'west']).default('north'),
	regionId: z.string(),
	lastUpdated: z.number(), // Timestamp
});

// Complete world map
export const WorldMapSchema = z.object({
	id: z.string(),
	name: z.string(),
	dimensions: DimensionsSchema,
	regions: z.array(RegionSchema),
	startingRegionId: z.string(),
	generationSeed: z.number(),
	version: z.number().default(1), // For future migrations
	createdAt: z.number(),
	lastModified: z.number(),
});

// Game world state that includes map + player state
export const GameWorldStateSchema = z.object({
	worldMap: WorldMapSchema,
	playerPosition: PlayerPositionSchema,
	exploredTiles: z.array(z.string()).default([]), // Tile IDs that have been explored
	discoveredPOIs: z.array(z.string()).default([]), // POI IDs that have been discovered
	gameTime: z.object({
		day: z.number().default(1),
		hour: z.number().min(0).max(23).default(8), // 8 AM start
		timeScale: z.number().default(1), // Real time to game time ratio
	}),
	weather: z
		.object({
			type: z.enum(['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog']).default('clear'),
			intensity: z.number().min(0).max(1).default(0.5),
		})
		.optional(),
});

// Type exports
export type Position = z.infer<typeof PositionSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type TerrainType = z.infer<typeof TerrainTypeSchema>;
export type BiomeType = z.infer<typeof BiomeTypeSchema>;
export type MapTile = z.infer<typeof MapTileSchema>;
export type PointOfInterest = z.infer<typeof PointOfInterestSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type WorldMap = z.infer<typeof WorldMapSchema>;
export type GameWorldState = z.infer<typeof GameWorldStateSchema>;

// Helper functions for working with positions
export const getDistance = (pos1: Position, pos2: Position): number => {
	const dx = pos2.x - pos1.x;
	const dy = pos2.y - pos1.y;
	return Math.sqrt(dx * dx + dy * dy);
};

export const getManhattanDistance = (pos1: Position, pos2: Position): number => {
	return Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y);
};

export const addPositions = (pos1: Position, pos2: Position): Position => ({
	x: pos1.x + pos2.x,
	y: pos1.y + pos2.y,
});

export const isWithinBounds = (
	position: Position,
	bounds: { topLeft: Position; bottomRight: Position },
): boolean => {
	return (
		position.x >= bounds.topLeft.x &&
		position.x <= bounds.bottomRight.x &&
		position.y >= bounds.topLeft.y &&
		position.y <= bounds.bottomRight.y
	);
};
