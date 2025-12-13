import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

import { createDatabase } from '@/api/src/utils/repository';
import type { User } from 'expo-auth-template/backend';

type Variables = {
	user: (User & { is_admin?: boolean | number; role?: string }) | null;
};

const maps = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

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
		return c.json({ maps: mapsWithMetadata });
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
	if (!user.is_admin) {
		return c.json({ error: 'Forbidden' }, 403);
	}
	const id = c.req.param('id');
	const db = createDatabase(c.env);
	const map = await db.getMapById(id);
	if (!map) {
		return c.json({ error: 'Map not found' }, 404);
	}
	const body = await c.req.json();
	const resp = await db.saveMap({
		...map,
		...body,
		id,
	});
	return c.json({ success: true, id, map: resp });
});


/**
 * Create or Update a map
 */
maps.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = createDatabase(c.env);
	const body = await c.req.json();

	// Basic validation
	if (!body.name || !body.slug) {
		return c.json({ error: 'Name and slug are required' }, 400);
	}

	const id = body.id || `map_${body.slug}_${Date.now()}`;
	const now = Date.now();

	try {
		await db.saveMap({
			id,
			slug: body.slug,
			name: body.name,
			description: body.description,
			width: body.width || 0,
			height: body.height || 0,
			default_terrain: JSON.stringify(body.default_terrain || {}),
			fog_of_war: JSON.stringify(body.fog_of_war || []),
			terrain_layers: JSON.stringify(body.terrain_layers || []),
			metadata: JSON.stringify(body.metadata || {}),
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
		});

		// Process tiles if provided
		if (body.tiles && Array.isArray(body.tiles)) {
			await db.replaceMapTiles(
				id,
				body.tiles.map((t: any) => ({
					x: t.x,
					y: t.y,
					terrain_type: t.terrain_type || t.terrain,
					elevation: t.elevation,
					movement_cost: t.movement_cost,
					is_blocked: t.is_blocked ? 1 : 0,
					is_difficult: t.is_difficult ? 1 : 0,
					has_fog: t.has_fog ? 1 : 0,
					provides_cover: t.provides_cover ? 1 : 0,
					cover_type: t.cover_type,
					feature_type: t.feature_type,
					metadata: JSON.stringify(t.metadata || {}),
				}))
			);
		}

		// Process tokens if provided in the body
		if (body.tokens && Array.isArray(body.tokens)) {
			// First, remove existing "prop" tokens for this map.
			// This ensures that if the user deleted a prop in the editor, it's gone from DB.
			// We only target tokens with game_id IS NULL (template tokens) and token_type = 'prop'.
			// This avoids accidentally deleting player tokens if they were somehow associated with this map id directly (though usually they have game_id).
			await db.deletePropTokensForMap(id);

			for (const token of body.tokens) {
				await db.saveMapToken({
					id: token.id || `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					game_id: null, // Map Editor tokens don't belong to a specific game yet
					map_id: id,
					character_id: null,
					npc_id: null,
					token_type: 'prop', // Default to prop for editor placed items
					label: token.label || 'Object',
					image_url: token.image_url,
					x: token.x || 0,
					y: token.y || 0,
					facing: 0,
					color: null,
					status: 'active',
					is_visible: 1,
					hit_points: null,
					max_hit_points: null,
					status_effects: null,
					metadata: JSON.stringify(token.metadata || {}),
				});
			}
		}

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
