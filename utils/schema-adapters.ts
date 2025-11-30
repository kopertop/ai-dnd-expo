import type { MapRow, MapTileRow, MapTokenRow, NpcRow } from '@/shared/workers/db';
import type { MapState, MapToken, NpcDefinition } from '@/types/multiplayer-map';

type TerrainCell = {
	terrain: string;
	elevation: number;
	fogged: boolean;
	difficult?: boolean;
	featureType?: string | null;
	metadata?: Record<string, unknown>;
};

const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
	if (!raw) {
		return fallback;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
};

const toTokenType = (value: string): MapToken['type'] => {
	switch (value) {
		case 'npc':
			return 'npc';
		case 'object':
			return 'object';
		default:
			return 'player';
	}
};

const buildBaseTerrain = (map: MapRow): TerrainCell[][] => {
	const fallback = parseJson<{ type?: string; elevation?: number }>(map.default_terrain, {
		type: 'stone',
		elevation: 0,
	});

	return Array.from({ length: map.height }, () =>
		Array.from({ length: map.width }, () => ({
			terrain: fallback.type ?? 'stone',
			elevation: fallback.elevation ?? 0,
			fogged: false,
		})),
	);
};

const applyTileOverrides = (grid: TerrainCell[][], tiles?: MapTileRow[]) => {
	if (!tiles?.length) {
		return grid;
	}

	tiles.forEach(tile => {
		const row = grid[tile.y];
		if (!row) {
			return;
		}

		const cell = row[tile.x];
		if (!cell) {
			return;
		}

		row[tile.x] = {
			terrain: tile.terrain_type,
			elevation: tile.elevation ?? cell.elevation ?? 0,
			fogged: Boolean(tile.has_fog),
			difficult: Boolean(tile.is_blocked),
			featureType: tile.feature_type,
			metadata: parseJson<Record<string, unknown>>(tile.metadata, {}),
		};
	});

	return grid;
};

const buildFogMatrix = (map: MapRow) => {
	const fogConfig = parseJson<{ enabled?: boolean; revealed?: Array<[number, number]> }>(
		map.fog_of_war,
		{ enabled: false },
	);

	const matrix = Array.from({ length: map.height }, () =>
		Array.from({ length: map.width }, () => Boolean(fogConfig.enabled)),
	);

	if (Array.isArray(fogConfig.revealed)) {
		fogConfig.revealed.forEach(([x, y]) => {
			if (matrix[y] && typeof matrix[y][x] !== 'undefined') {
				matrix[y][x] = false;
			}
		});
	}

	return matrix;
};

const convertTokens = (tokens?: MapTokenRow[]): MapToken[] => {
	if (!tokens?.length) {
		return [];
	}

	return tokens.map(token => {
		const metadata = parseJson<Record<string, unknown>>(token.metadata, {});
		const icon =
			typeof metadata.icon === 'string'
				? metadata.icon
				: typeof metadata.image === 'string'
					? metadata.image
					: undefined;

		// For NPCs, entityId should be the token.id (unique per instance)
		// For players, entityId should be the character_id
		// This ensures each NPC instance has a unique entityId for initiative tracking
		const entityId = token.token_type === 'npc'
			? token.id  // NPC: use token ID as entityId (unique per instance)
			: token.character_id ?? undefined;  // Player: use character_id

		return {
			id: token.id,
			type: toTokenType(token.token_type),
			entityId,
			label: token.label ?? 'Token',
			x: token.x,
			y: token.y,
			zIndex: token.facing ?? 0,
			color: token.color ?? undefined,
			hitPoints: token.hit_points ?? undefined,
			maxHitPoints: token.max_hit_points ?? undefined,
			statusEffects: parseJson<string[]>(token.status_effects, []),
			metadata,
			icon,
		};
	});
};

export interface MapStateAdapterOptions {
	tiles?: MapTileRow[];
	tokens?: MapTokenRow[];
}

export const mapStateFromDb = (
	map: MapRow,
	options: MapStateAdapterOptions = {},
): MapState => {
	const grid = applyTileOverrides(buildBaseTerrain(map), options.tiles);

	return {
		id: map.id,
		name: map.name,
		width: map.width,
		height: map.height,
		terrain: grid,
		fog: buildFogMatrix(map),
		defaultTerrain: parseJson<{ type?: string }>(map.default_terrain, { type: 'stone' }).type,
		background: parseJson<{ image?: string }>(map.metadata, {}).image,
		metadata: parseJson<Record<string, unknown>>(map.metadata, {}),
		preset: map.generator_preset,
		seed: map.seed,
		theme: map.theme,
		biome: map.biome,
		isGenerated: Boolean(map.is_generated),
		tokens: convertTokens(options.tokens),
		updatedAt: map.updated_at,
	};
};

export const mapStateToDb = (map: MapState) => ({
	defaultTerrain: JSON.stringify({ type: map.defaultTerrain ?? 'stone' }),
	fogOfWar: JSON.stringify({
		enabled: map.fog ? map.fog.some(row => row.some(Boolean)) : false,
		grid: map.fog ?? [],
	}),
	terrainLayers: JSON.stringify(map.metadata?.terrainLayers ?? []),
	metadata: JSON.stringify(map.metadata ?? {}),
});

export const npcFromDb = (npc: NpcRow): NpcDefinition => ({
	id: npc.id,
	slug: npc.slug,
	name: npc.name,
	role: npc.role,
	alignment: npc.alignment,
	disposition: npc.disposition as NpcDefinition['disposition'],
	description: npc.description ?? undefined,
	maxHealth: npc.base_health,
	armorClass: npc.base_armor_class,
	stats: parseJson<Record<string, unknown>>(npc.stats, {}),
	icon: parseJson<{ icon?: string }>(npc.metadata, {}).icon,
	color: parseJson<{ color?: string }>(npc.metadata, {}).color,
	metadata: parseJson<Record<string, unknown>>(npc.metadata, {}),
});

