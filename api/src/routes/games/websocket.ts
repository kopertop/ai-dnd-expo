import { Hono } from 'hono';

import type { GamesContext } from './types';

const websocket = new Hono<GamesContext>();

/**
 * WebSocket/Partykit discovery endpoint
 * GET /api/games/:inviteCode/ws
 *
 * Returns the Partykit URL clients should connect to for realtime updates.
 * This keeps the Worker responsible for auth + URL construction while the
 * Partykit room handles the live gameplay messages.
 *
 * @returns JSON payload with target websocket url and room id
 */
websocket.get('/:inviteCode/ws', async (c) => {
	const inviteCode = c.req.param('inviteCode');
	const url = new URL(c.req.url);
	const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
	const host = url.host;
	const path = `/party/game-room/${inviteCode}`;
	const target = `${protocol}://${host}${path}`;

	return c.json({
		room: inviteCode,
		url: target,
		host,
		path,
	});
});

export default websocket;
