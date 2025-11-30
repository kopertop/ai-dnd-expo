import { Hono } from 'hono';

import type { GamesContext } from './types';

const websocket = new Hono<GamesContext>();

/**
 * WebSocket endpoint (placeholder)
 * GET /api/games/:inviteCode/ws
 *
 * WebSocket support is not yet implemented.
 * This endpoint returns a 501 Not Implemented response.
 *
 * @returns Error response indicating WebSocket is not implemented
 */
websocket.get('/:inviteCode/ws', async (c) => {
	// WebSocket support not yet implemented
	return c.json({ error: 'WebSocket support is not yet implemented' }, 501);
});

export default websocket;


