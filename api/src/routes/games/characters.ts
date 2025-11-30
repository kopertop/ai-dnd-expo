import { Hono } from 'hono';

import type { GamesContext } from './types';

import {
	createId,
	deserializeCharacter,
	isHostUser,
	serializeCharacter,
} from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';
import { Character } from '@/types/character';

const characters = new Hono<GamesContext>();

/**
 * List user's characters
 * GET /api/games/me/characters
 *
 * Returns all characters owned by the authenticated user.
 *
 * @returns Object with characters array
 */
characters.get('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = new Database(c.env.DATABASE);
	const characterRows = await db.getCharactersByPlayerIdentity(user.id, user.email);

	// Use map to de-duplicate characters that match both ID and email
	const deduped = new Map<string, Character>();
	for (const row of characterRows) {
		deduped.set(row.id, deserializeCharacter(row));
	}

	return c.json({ characters: Array.from(deduped.values()) });
});

/**
 * Create a new character
 * POST /api/games/me/characters
 *
 * Creates a new character for the authenticated user.
 *
 * @returns Object with created character
 */
characters.post('/me/characters', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const payload = (await c.req.json()) as Character;
	const characterId = payload.id || createId('char');
	const db = new Database(c.env.DATABASE);
	const serialized = serializeCharacter(
		{ ...payload, id: characterId },
		user.id,
		user.email,
	);
	await db.createCharacter(serialized);
	const saved = await db.getCharacterById(characterId);
	return c.json({ character: saved ? deserializeCharacter(saved) : payload });
});

/**
 * Update a character
 * PUT /api/games/me/characters/:id
 *
 * Updates an existing character. User must own the character.
 *
 * @returns Object with updated character
 */
characters.put('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const updates = (await c.req.json()) as Partial<Character>;
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const serializedUpdate = serializeCharacter(
		{ ...deserializeCharacter(existing), ...updates, id: characterId },
		existing.player_id || user.id,
		existing.player_email || user.email,
	);
	await db.updateCharacter(characterId, serializedUpdate);
	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : updates });
});

/**
 * Delete a character
 * DELETE /api/games/me/characters/:id
 *
 * Deletes a character. User must own the character.
 *
 * @returns Success response
 */
characters.delete('/me/characters/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await db.deleteCharacter(characterId);
	return c.json({ ok: true });
});

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
	const db = new Database(c.env.DATABASE);
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


