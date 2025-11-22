import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';
import { Database } from '../../../shared/workers/db';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

const maps = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

/**
 * List all available maps in the system
 */
maps.get('/', async (c) => {
	const db = new Database(c.env.DATABASE);
	try {
		const mapsList = await db.listMaps();
		return c.json({ maps: mapsList });
	} catch (error) {
		console.error('Failed to list maps:', error);
		return c.json({ error: 'Failed to list maps' }, 500);
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

	const db = new Database(c.env.DATABASE);
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


