import { Hono } from 'hono';

import type { HonoContext } from '../env';

import { createDatabase } from '@/api/src/utils/repository';
import type { Database, MapRow } from '@/shared/workers/db';

const maps = new Hono<HonoContext>();

type JsonValue = Record<string, unknown> | unknown[];
type JsonField = string | JsonValue | null;

type MapTileInput = {
	x: number;
	y: number;
	terrain_type?: string;
	terrain?: string;
	elevation?: number;
	movement_cost?: number;
	is_blocked?: boolean;
	is_difficult?: boolean;
	has_fog?: boolean;
	provides_cover?: boolean;
	cover_type?: string | null;
	feature_type?: string | null;
	metadata?: Record<string, unknown> | null;
};

type MapTokenInput = {
	id?: string;
	label?: string | null;
	image_url?: string | null;
	x?: number;
	y?: number;
	metadata?: Record<string, unknown> | null;
};

type MapUpsertPayload = Partial<Omit<MapRow, 'default_terrain' | 'fog_of_war' | 'terrain_layers' | 'metadata' | 'created_at' | 'updated_at'>> & {
	default_terrain?: JsonField;
	fog_of_war?: JsonField;
	terrain_layers?: JsonField;
	metadata?: JsonField;
	created_at?: number;
	updated_at?: number;
	tiles?: MapTileInput[];
	tokens?: MapTokenInput[];
};

type MapTileWrite = Parameters<Database['replaceMapTiles']>[1][number];
type MapTokenWrite = Parameters<Database['saveMapToken']>[0];
type MapUpdateFields = Omit<MapUpsertPayload, 'tiles' | 'tokens'>;

const normalizeJsonField = (value: JsonField | undefined, fallback: JsonValue): string => {
	const resolved = value ?? fallback;
	return typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
};

const normalizeMapUpdate = (update: MapUpdateFields): Partial<MapRow> => {
	const {
		default_terrain,
		fog_of_war,
		terrain_layers,
		metadata,
		...rest
	} = update;

	const normalized: Partial<MapRow> = { ...rest };

	if (default_terrain !== undefined) {
		normalized.default_terrain = normalizeJsonField(default_terrain, {});
	}
	if (fog_of_war !== undefined) {
		normalized.fog_of_war = normalizeJsonField(fog_of_war, []);
	}
	if (terrain_layers !== undefined) {
		normalized.terrain_layers = normalizeJsonField(terrain_layers, []);
	}
	if (metadata !== undefined) {
		normalized.metadata = normalizeJsonField(metadata, {});
	}

	return normalized;
};

const toMapTileWrite = (tile: MapTileInput): MapTileWrite => ({
	x: tile.x,
	y: tile.y,
	terrain_type: tile.terrain_type || tile.terrain || 'none',
	elevation: tile.elevation,
	movement_cost: tile.movement_cost,
	is_blocked: tile.is_blocked ? 1 : 0,
	is_difficult: tile.is_difficult ? 1 : 0,
	has_fog: tile.has_fog ? 1 : 0,
	provides_cover: tile.provides_cover ? 1 : 0,
	cover_type: tile.cover_type,
	feature_type: tile.feature_type,
	metadata: JSON.stringify(tile.metadata ?? {}),
});

const saveMapTiles = async (db: Database, mapId: string, tiles?: MapTileInput[]) => {
	if (!Array.isArray(tiles) || tiles.length === 0) {
		return;
	}

	await db.replaceMapTiles(mapId, tiles.map(toMapTileWrite));
};

const toMapTokenWrite = (mapId: string, token: MapTokenInput): MapTokenWrite => ({
	id: token.id ?? `token_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
	game_id: null,
	map_id: mapId,
	character_id: null,
	npc_id: null,
	token_type: 'prop',
	label: token.label ?? 'Object',
	image_url: token.image_url ?? null,
	x: token.x ?? 0,
	y: token.y ?? 0,
	facing: 0,
	color: null,
	status: 'active',
	is_visible: 1,
	hit_points: null,
	max_hit_points: null,
	status_effects: null,
	metadata: JSON.stringify(token.metadata ?? {}),
});

const savePropTokens = async (db: Database, mapId: string, tokens?: MapTokenInput[]) => {
	if (!Array.isArray(tokens) || tokens.length === 0) {
		return;
	}

	await db.deletePropTokensForMap(mapId);

	for (const token of tokens) {
		await db.saveMapToken(toMapTokenWrite(mapId, token));
	}
};

/**
 * List all available maps in the system
 */
maps.get('/', async (c) => {
	const db = createDatabase(c.env);
	try {
		const mapsList = await db.listMaps();
		// Include metadata in response for filtering and icons
		const mapsWithMetadata = mapsList.map(map => ({
			id: map.id,
			slug: map.slug,
			name: map.name,
			description: map.description,
			width: map.width,
			height: map.height,
			world: map.world, // Deprecated, but keep for compatibility if needed
			world_id: map.world_id,
			background_image_url: map.background_image_url,
			cover_image_url: map.cover_image_url,
			grid_columns: map.grid_columns,
			grid_size: map.grid_size,
			grid_offset_x: map.grid_offset_x,
			grid_offset_y: map.grid_offset_y,
			metadata: map.metadata ? JSON.parse(map.metadata) : {},
		}));
		return c.json(mapsWithMetadata);
	} catch (error) {
		console.error('Failed to list maps:', error);
		return c.json({ error: 'Failed to list maps' }, 500);
	}
});

/**
 * Get a specific map by ID
 */
maps.get('/:id', async (c) => {
	const id = c.req.param('id');
	const db = createDatabase(c.env);
	try {
		const map = await db.getMapById(id);
		if (!map) {
			return c.json({ error: 'Map not found' }, 404);
		}

		// Also fetch map tokens (objects)
		// Use listPropTokensForMap to only get template/prop tokens, NOT player tokens
		const tokens = await db.listPropTokensForMap(id);
		const tiles = await db.getMapTiles(id);

		return c.json({
			...map,
			metadata: map.metadata ? JSON.parse(map.metadata) : {},
			terrain_layers: map.terrain_layers ? JSON.parse(map.terrain_layers) : [],
			fog_of_war: map.fog_of_war ? JSON.parse(map.fog_of_war) : [],
			default_terrain: map.default_terrain ? JSON.parse(map.default_terrain) : {},
			tokens, // Return the tokens as well
			tiles,
		});
	} catch (error) {
		console.error('Failed to get map:', error);
		return c.json({ error: 'Failed to get map' }, 500);
	}
});

// Update a map
maps.patch('/:id', async (c) => {
	// Only admins
	const user = c.get('user');
	console.log('** user', user);
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	// Check for isAdmin (camelCase) from expo-auth-template User type
	if (!user.isAdmin) {
		return c.json({ error: 'Forbidden' }, 403);
	}
	const id = c.req.param('id');
	const db = createDatabase(c.env);
	const map = await db.getMapById(id);
	if (!map) {
		return c.json({ error: 'Map not found' }, 404);
	}
	const body = await c.req.json<MapUpsertPayload>();
	const { tiles, tokens, ...mapUpdate } = body;
	const normalizedUpdate = normalizeMapUpdate(mapUpdate);
	const resp = await db.saveMap({
		...map,
		...normalizedUpdate,
		id,
	});

	await saveMapTiles(db, id, tiles);
	await savePropTokens(db, id, tokens);

	return c.json({ success: true, id, map: resp });
});


/**
 * Create or Update a map
 */
maps.post('/', async (c) => {
	const user = c.get('user');
	console.log('** user', user);
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = createDatabase(c.env);
	const body = await c.req.json<MapUpsertPayload>();

	// Basic validation
	if (!body.name || !body.slug) {
		return c.json({ error: 'Name and slug are required' }, 400);
	}

	const id = body.id || `map_${body.slug}_${Date.now()}`;
	const now = Date.now();
	const { tiles, tokens, ...mapUpdate } = body;

	try {
		const normalizedUpdate = normalizeMapUpdate({
			...mapUpdate,
			default_terrain: mapUpdate.default_terrain ?? {},
			fog_of_war: mapUpdate.fog_of_war ?? [],
			terrain_layers: mapUpdate.terrain_layers ?? [],
			metadata: mapUpdate.metadata ?? {},
		});

		await db.saveMap({
			id,
			slug: body.slug,
			name: body.name,
			description: body.description ?? null,
			width: body.width || 0,
			height: body.height || 0,
			default_terrain: normalizedUpdate.default_terrain ?? JSON.stringify({}),
			fog_of_war: normalizedUpdate.fog_of_war ?? JSON.stringify([]),
			terrain_layers: normalizedUpdate.terrain_layers ?? JSON.stringify([]),
			metadata: normalizedUpdate.metadata ?? JSON.stringify({}),
			generator_preset: body.generator_preset || 'static',
			seed: body.seed || 'static',
			theme: body.theme || 'neutral',
			biome: body.biome || 'temperate',
			world_id: body.world_id,
			background_image_url: body.background_image_url,
			cover_image_url: body.cover_image_url,
			grid_columns: body.grid_columns,
			grid_size: body.grid_size,
			grid_offset_x: body.grid_offset_x,
			grid_offset_y: body.grid_offset_y,
			is_generated: body.is_generated ? 1 : 0,
			created_at: body.created_at ?? now,
			updated_at: now,
			world: body.world ?? null,
		});

		await saveMapTiles(db, id, tiles);
		await savePropTokens(db, id, tokens);

		return c.json({ success: true, id });
	} catch (error: any) {
		console.error('Failed to save map:', error);
		return c.json({ error: error.message }, 500);
	}
});

/**
 * Clone a map
 */
maps.post('/clone', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = createDatabase(c.env);
	const payload = (await c.req.json().catch(() => ({}))) as {
		sourceMapId: string;
		newName: string;
	};

	if (!payload.sourceMapId || !payload.newName) {
		return c.json({ error: 'Missing required fields: sourceMapId, newName' }, 400);
	}

	try {
		// Generate a slug from the new name
		const newSlug = payload.newName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');

		const clonedMap = await db.cloneMap(payload.sourceMapId, payload.newName, newSlug);
		return c.json({ map: clonedMap });
	} catch (error) {
		console.error('Failed to clone map:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to clone map';
		return c.json({ error: errorMessage }, 500);
	}
});

export default maps;
