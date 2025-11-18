import { Hono } from 'hono';

import { isAdmin as sharedIsAdmin } from '../../../shared/workers/admin';
import { Quest } from '../../../shared/workers/types';
import type { CloudflareBindings } from '../env';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

const admin = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

admin.use('*', async (c, next) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (!sharedIsAdmin(user.email, c.env.ADMIN_EMAILS)) {
		return c.json({ error: 'Forbidden - Admin access required' }, 403);
	}

	await next();
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

export default admin;


