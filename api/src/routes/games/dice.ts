import { getServerByName } from 'partyserver';

import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import { createId, isHostUser, jsonWithStatus } from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';

const dice = new Hono<GamesContext>();

/**
 * Roll dice
 * POST /api/games/:inviteCode/dice/roll
 *
 * Rolls dice using the specified notation (e.g., "1d20+5").
 * Supports advantage and disadvantage modifiers.
 *
 * @returns Dice roll result with breakdown
 */
dice.post('/:inviteCode/dice/roll', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		notation: string;
		advantage?: boolean;
		disadvantage?: boolean;
		purpose?: string;
	};

	const gameStateService = new GameStateService(db);
	const rollResult = gameStateService.rollDice(body.notation, body.advantage, body.disadvantage);

	// Log dice roll to database
	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${user.name || 'Player'} rolled ${body.notation}${body.purpose ? ` for ${body.purpose}` : ''}: ${rollResult.total}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				notation: body.notation,
				purpose: body.purpose,
				total: rollResult.total,
				rolls: rollResult.rolls,
				breakdown: rollResult.breakdown,
				advantage: body.advantage,
				disadvantage: body.disadvantage,
			}),
		});
	} catch (error) {
		console.error('Failed to log dice roll:', error);
		// Continue anyway
	}

	return jsonWithStatus(c, rollResult, 200);
});

/**
 * DM-only dice roll that broadcasts to all clients
 * POST /api/games/:inviteCode/dice/dm-roll
 */
dice.post('/:inviteCode/dice/dm-roll', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		numDice?: number;
		dieSize?: number;
		modifier?: number;
		label?: string;
		advantage?: boolean;
		disadvantage?: boolean;
	};

	const numDice = Math.max(1, Math.min(100, Number(body.numDice) || 1));
	const dieSize = Math.max(2, Math.min(100, Number(body.dieSize) || 20));
	const modifier = Number.isFinite(body.modifier) ? Number(body.modifier) : 0;
	const notation = `${numDice}d${dieSize}${modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`}`;

	const gameStateService = new GameStateService(db);
	const rollResult = gameStateService.rollDice(notation, body.advantage, body.disadvantage);

	// Save to activity log
	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${user.name || 'DM'} rolled ${notation}${body.label ? ` for ${body.label}` : ''}: ${rollResult.total}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				notation,
				advantage: body.advantage,
				disadvantage: body.disadvantage,
				total: rollResult.total,
				rolls: rollResult.rolls,
				breakdown: rollResult.breakdown,
				label: body.label,
			}),
		});
	} catch (error) {
		console.error('Failed to log DM dice roll:', error);
	}

	// Broadcast via game state messages so all clients can show the roll
	try {
		const currentState = await gameStateService.getState(game);
		const message = {
			id: createId('msg'),
			content: `${user.name || 'DM'} rolled ${notation}${body.label ? ` for ${body.label}` : ''}: ${rollResult.total}`,
			timestamp: Date.now(),
			type: 'action_result' as const,
			speaker: user.name || 'DM',
			role: 'system' as const,
			diceRoll: {
				notation,
				rolls: rollResult.rolls,
				total: rollResult.total,
				breakdown: rollResult.breakdown,
				advantage: body.advantage,
				disadvantage: body.disadvantage,
				label: body.label,
			},
		};

		const updatedMessages = [...(currentState.messages || []), message].slice(-50);
		const updatedState = {
			...currentState,
			messages: updatedMessages,
			lastUpdated: Date.now(),
		};
		await gameStateService.saveState(game.id, updatedState);
	} catch (error) {
		console.error('Failed to broadcast DM dice roll to game state:', error);
	}

	// Notify connected clients via PartyServer/Partykit room to pull the latest state immediately
	try {
		// getServerByName expects a PartyServer namespace; use loose casting to satisfy types
		const stub: any = await (getServerByName as any)(c.env.GameRoom, `game-room/${inviteCode}`);
		const headers: Record<string, string> = { 'content-type': 'application/json' };
		if (c.env.PARTYKIT_SECRET) {
			headers['x-party-secret'] = c.env.PARTYKIT_SECRET;
		}
		await stub.fetch('https://party/broadcast-state', {
			method: 'POST',
			headers,
			body: JSON.stringify({ type: 'broadcast-state' }),
		});
	} catch (error) {
		console.error('Failed to notify PartyServer for DM dice roll broadcast:', error);
	}

	return c.json({
		...rollResult,
	});
});

export default dice;
