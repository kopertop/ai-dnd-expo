/**
 * Quest Routes
 *
 * Handles quest listing and retrieval
 */

import { Hono } from 'hono';

import type { Env } from '../env';
import { Quest } from '../types';

const quests = new Hono<{ Bindings: Env }>();

// GET /api/quests - List all quests
quests.get('/', async (c) => {
	const keys = await c.env.QUESTS.list();
	const questsList: Quest[] = [];

	for (const key of keys.keys) {
		const questData = await c.env.QUESTS.get(key.name);
		if (questData) {
			questsList.push(JSON.parse(questData));
		}
	}

	return c.json({ quests: questsList });
});

// GET /api/quests/:questId - Get specific quest
quests.get('/:questId', async (c) => {
	const questId = c.req.param('questId');
	const questData = await c.env.QUESTS.get(questId);

	if (questData) {
		return c.json(JSON.parse(questData));
	}

	return c.json({ error: 'Quest not found' }, 404);
});

export default quests;


