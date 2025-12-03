import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import { createId, jsonWithStatus } from '@/api/src/utils/games-utils';
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

export default dice;


