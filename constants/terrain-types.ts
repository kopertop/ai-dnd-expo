import type { TerrainType } from '@/types/world-map';

// Terrain types array - must match TerrainTypeSchema in types/world-map.ts
export const TERRAIN_TYPES: readonly TerrainType[] = [
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
] as const;

// Helper function to get display name for terrain type
export const getTerrainDisplayName = (terrain: string): string => {
	return terrain.charAt(0).toUpperCase() + terrain.slice(1);
};

// Type guard to check if a string is a valid terrain type
export const isValidTerrainType = (
	terrain: string,
): terrain is typeof TERRAIN_TYPES[number] => {
	return TERRAIN_TYPES.includes(terrain as typeof TERRAIN_TYPES[number]);
};
