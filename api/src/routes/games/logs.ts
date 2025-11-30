import { Hono } from 'hono';

import type { GamesContext } from './types';

import { createId, isHostUser } from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';

const logs = new Hono<GamesContext>();

/**
 * Get activity logs
 * GET /api/games/:inviteCode/log
 *
 * Returns activity logs for the game.
 * Players and hosts can view logs.
 *
 * @param limit - Maximum number of logs to return (default: 100)
 * @param offset - Number of logs to skip (default: 0)
 * @returns Object with logs array
 */
logs.get('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const limit = parseInt(c.req.query('limit') || '100', 10);
	const offset = parseInt(c.req.query('offset') || '0', 10);

	const logs = await db.getActivityLogs(inviteCode, limit, offset);
	return c.json({ logs });
});

/**
 * Create an activity log entry
 * POST /api/games/:inviteCode/log
 *
 * Creates a new activity log entry.
 * Players and hosts can create logs.
 *
 * @returns Object with log ID and success status
 */
logs.post('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Check if user is part of the game (host or player)
	const isHost = isHostUser(game, user);
	const isPlayer = await db.getGamePlayers(game.id).then(players =>
		players.some(p => p.player_id === user.id),
	);

	if (!isHost && !isPlayer) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json()) as {
		type: string;
		description: string;
		data?: Record<string, unknown>;
		actorId?: string;
		actorName?: string;
	};

	if (!body.type || !body.description) {
		return c.json({ error: 'type and description are required' }, 400);
	}

	const logId = createId('log');
	await db.saveActivityLog({
		id: logId,
		game_id: game.id,
		invite_code: inviteCode,
		type: body.type,
		timestamp: Date.now(),
		description: body.description,
		actor_id: body.actorId || user.id,
		actor_name: body.actorName || user.name || user.email || null,
		data: body.data ? JSON.stringify(body.data) : null,
	});

	return c.json({ id: logId, success: true });
});

/**
 * Clear all activity logs
 * DELETE /api/games/:inviteCode/log
 *
 * Deletes all activity logs for the game.
 * Only the host can clear logs.
 *
 * @returns Success response
 */
logs.delete('/:inviteCode/log', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = new Database(c.env.DATABASE);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// Only host can clear activity logs
	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	// Delete all activity logs for this game
	await db.deleteActivityLogs(game.id);

	return c.json({ success: true });
});

export default logs;


