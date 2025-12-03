import { Hono } from 'hono';

import type { GamesContext } from './types';

import {
        deserializeCharacter,
        isHostUser,
} from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';
import { Character } from '@/types/character';

const characters = new Hono<GamesContext>();

/**
 * Get all characters in a game
 * GET /api/games/:inviteCode/characters
 *
 * Returns all characters participating in the game.
 * Only the host can access this endpoint.
 *
 * @returns Object with characters array
 */
characters.get('/:inviteCode/characters', async (c) => {
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

	const memberships = await db.getGamePlayers(game.id);
	const characters = await Promise.all(
		memberships.map(async membership => {
			const row = await db.getCharacterById(membership.character_id);
			return row ? deserializeCharacter(row) : null;
		}),
	);

	return c.json({ characters: characters.filter((character): character is Character => Boolean(character)) });
});

export default characters;


