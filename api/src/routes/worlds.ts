import { Hono } from 'hono';
import { Database } from 'shared/workers/db';

import type { CloudflareBindings } from '../env';

import { createDatabase } from '@/api/src/utils/repository';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

const worlds = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// List all worlds
worlds.get('/', async (c) => {
	const db = createDatabase(c.env);
	const results = await db.listWorlds();
	return c.json(results);
});

// Get a world by ID
worlds.get('/:id', async (c) => {
	const id = c.req.param('id');
	const db = createDatabase(c.env);
	const world = await db.getWorldById(id);

	if (!world) {
		return c.json({ error: 'World not found' }, 404);
	}

	return c.json(world);
});

// Create or update a world
worlds.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = await c.req.json();
	const db = createDatabase(c.env);

	// Basic validation
	if (!body.name || !body.slug) {
		return c.json({ error: 'Name and slug are required' }, 400);
	}

	const id = body.id || `world_${body.slug}_${Date.now()}`;

	const world = {
		id,
		name: body.name,
		slug: body.slug,
		description: body.description || null,
		image_url: body.image_url || null,
		is_public: body.is_public ? 1 : 0,
		created_at: body.created_at, // Optional, will default to now in DB helper
		updated_at: body.updated_at, // Optional, will default to now in DB helper
	};

	try {
		await db.saveWorld(world);
		return c.json({ success: true, id });
	} catch (error: any) {
		return c.json({ error: error.message }, 500);
	}
});

// Delete a world
worlds.delete('/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const id = c.req.param('id');
	const db = createDatabase(c.env);

	try {
		await db.deleteWorld(id);
		return c.json({ success: true });
	} catch (error: any) {
		return c.json({ error: error.message }, 500);
	}
});

export default worlds;
