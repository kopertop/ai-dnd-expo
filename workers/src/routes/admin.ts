/**
 * Admin Routes
 *
 * Handles admin-only operations
 */

import { Hono } from 'hono';

import type { Env } from '../env';
import { requireAdmin } from '../middleware/admin';
import { Quest } from '../types';

const admin = new Hono<{ Bindings: Env; Variables: { user: { id: string; email: string; name?: string | null } | null } }>();

// Apply admin middleware to all admin routes
admin.use('*', requireAdmin);

// POST /api/admin/quests - Create new quest
admin.post('/quests', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();
	const quest: Quest = {
		...body,
		id: body.id || `quest_${Date.now()}`,
		createdAt: Date.now(),
		createdBy: user?.email || 'admin',
	};

	await c.env.QUESTS.put(quest.id, JSON.stringify(quest));

	return c.json(quest);
});

// DELETE /api/admin/games/:gameId - Delete game
admin.delete('/games/:gameId', async (c) => {
	const gameId = c.req.param('gameId');
	// Note: Durable Objects don't have a direct delete method
	// We'd need to mark it as deleted in the state
	// For now, return success
	return c.json({ success: true, message: 'Game deletion not yet implemented' });
});

export default admin;


