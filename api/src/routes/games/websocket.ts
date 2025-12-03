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
	const host = c.env.PARTYKIT_PUBLIC_URL || c.env.PARTYKIT_HOST || 'localhost:1999';
	const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'ws' : 'wss';
	const room = `games/${inviteCode}`;
	const url = `${protocol}://${host}/${room}`;

	return c.json({
		room,
		url,
		host,
	});
});

export default websocket;

