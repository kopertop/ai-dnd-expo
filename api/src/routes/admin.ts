import { Hono } from 'hono';

import type { HonoContext } from '@/api/src/env';
import { deserializeCharacter } from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';
import { Quest } from '@/types/quest';

const admin = new Hono<HonoContext>();

admin.get('/status', async (c) => c.json({ status: 'ok', admin: true, host: c.env.PARTYKIT_HOST || '' }));

admin.use('*', async (c, next) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (!user.is_admin) {
		return c.json({ error: 'Forbidden - Admin access required' }, 403);
	}

	await next();
});

admin.get('/characters', async (c) => {
	const db = createDatabase(c.env);
	const characterRows = await db.getAllCharacters();
	const characters = characterRows.map(deserializeCharacter);
	return c.json({ characters });
});

admin.get('/images', async (c) => {
	const db = createDatabase(c.env);
	const imageType = c.req.query('type') as 'npc' | 'character' | 'both' | undefined;
	const limit = parseInt(c.req.query('limit') || '100', 10);
	const offset = parseInt(c.req.query('offset') || '0', 10);

	try {
		// Get all images (no user filter for admin)
		const result = await db.listUploadedImages(undefined, imageType, limit, offset);
		return c.json({ images: result });
	} catch (error) {
		console.error('Failed to list images:', error);
		return c.json({ error: 'Failed to list images' }, 500);
	}
});

admin.post('/quests', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	const quest: Quest = {
		...body,
		id: body.id || `quest_${Date.now()}`,
		createdAt: Date.now(),
		createdBy: user?.email || 'admin',
		objectives: body.objectives || [],
	};

	await c.env.QUESTS.put(quest.id, JSON.stringify(quest));

	return c.json(quest, 201);
});

admin.delete('/games/:gameId', async (c) => {
	// Placeholder - Durable Objects don't expose deletion API yet
	return c.json({
		success: true,
		message: 'Game deletion not yet implemented',
	});
});

// SQL Debug Routes
admin.get('/sql/tables', async (c) => {
	try {
		const result = await c.env.DATABASE.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
		).all<{ name: string }>();

		const tables = (result.results || []).map((row) => row.name);
		return c.json({ tables });
	} catch (error) {
		console.error('Error fetching tables:', error);
		return c.json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			500,
		);
	}
});

admin.post('/sql/query', async (c) => {
	try {
		const body = await c.req.json();
		const { query } = body;

		if (!query || typeof query !== 'string') {
			return c.json({ error: 'Query is required and must be a string' }, 400);
		}

		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			return c.json({ error: 'Query cannot be empty' }, 400);
		}

		const isSelect = trimmedQuery.toLowerCase().startsWith('select');
		const startTime = Date.now();

		if (isSelect) {
			// For SELECT queries, use .all() to get results
			const result = await c.env.DATABASE.prepare(trimmedQuery).all();
			const executionTime = Date.now() - startTime;

			// Extract column names from first row if available
			const columns =
				result.results && result.results.length > 0
					? Object.keys(result.results[0])
					: [];

			return c.json({
				columns,
				rows: result.results || [],
				rowCount: result.results?.length || 0,
				executionTime,
			});
		} else {
			// For non-SELECT queries (INSERT, UPDATE, DELETE, etc.), use .run()
			const result = await c.env.DATABASE.prepare(trimmedQuery).run();
			const executionTime = Date.now() - startTime;

			return c.json({
				columns: [],
				rows: [],
				rowCount: result.meta.changes || 0,
				executionTime,
				lastInsertRowid: result.meta.last_row_id || null,
			});
		}
	} catch (error) {
		console.error('Error executing SQL query:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Unknown error',
				columns: [],
				rows: [],
				rowCount: 0,
			},
			500,
		);
	}
});

export default admin;
