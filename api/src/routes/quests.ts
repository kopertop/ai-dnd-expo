import { Hono } from 'hono';

import { Quest } from '../../../shared/workers/types';

import type { CloudflareBindings } from '../env';

const quests = new Hono<{ Bindings: CloudflareBindings }>();

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

quests.get('/:questId', async (c) => {
	const questId = c.req.param('questId');
	const questData = await c.env.QUESTS.get(questId);

	if (!questData) {
		return c.json({ error: 'Quest not found' }, 404);
	}

	return c.json(JSON.parse(questData));
});

export default quests;


